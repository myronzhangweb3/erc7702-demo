import { defineChain } from 'viem'
import { ChainConfig } from '../types'
import { getCustomChains, getRpcOverrides } from './storage'

export const BUILT_IN_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    key: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://1rpc.io/eth',
    explorerUrl: 'https://etherscan.io',
    isCustom: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  sepolia: {
    key: 'sepolia',
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://1rpc.io/sepolia',
    explorerUrl: 'https://sepolia.etherscan.io',
    isCustom: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  polygon: {
    key: 'polygon',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://1rpc.io/matic',
    explorerUrl: 'https://polygonscan.com',
    isCustom: false,
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  optimism: {
    key: 'optimism',
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://1rpc.io/op',
    explorerUrl: 'https://optimistic.etherscan.io',
    isCustom: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  op_sepolia: {
    key: 'op_sepolia',
    name: 'OP Sepolia',
    chainId: 11155420,
    rpcUrl: 'https://optimism-sepolia-public.nodies.app',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    isCustom: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  arbitrum: {
    key: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://1rpc.io/arb',
    explorerUrl: 'https://arbiscan.io',
    isCustom: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  base: {
    key: 'base',
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://1rpc.io/base',
    explorerUrl: 'https://basescan.org',
    isCustom: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  bsc: {
    key: 'bsc',
    name: 'BNB Chain',
    chainId: 56,
    rpcUrl: 'https://1rpc.io/bnb',
    explorerUrl: 'https://bscscan.com',
    isCustom: false,
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  },
}

// Keep CHAINS as an alias for backward compatibility
export const CHAINS = BUILT_IN_CHAINS

// Returns all chains (built-in + custom) with user RPC overrides applied
export function getAllChains(): ChainConfig[] {
  const overrides = getRpcOverrides()
  const builtIn = Object.values(BUILT_IN_CHAINS).map(chain => ({
    ...chain,
    rpcUrl: overrides[chain.chainId] ?? chain.rpcUrl,
  }))
  const custom = getCustomChains().map(chain => ({
    ...chain,
    rpcUrl: overrides[chain.chainId] ?? chain.rpcUrl,
  }))
  return [...builtIn, ...custom]
}

export function getChainById(chainId: number): ChainConfig | undefined {
  const overrides = getRpcOverrides()
  // Check built-in first
  const builtIn = Object.values(BUILT_IN_CHAINS).find(c => c.chainId === chainId)
  if (builtIn) {
    return { ...builtIn, rpcUrl: overrides[chainId] ?? builtIn.rpcUrl }
  }
  // Check custom chains
  const custom = getCustomChains().find(c => c.chainId === chainId)
  if (custom) {
    return { ...custom, rpcUrl: overrides[chainId] ?? custom.rpcUrl }
  }
  return undefined
}

export function createViemChain(chainConfig: ChainConfig, rpcUrlOverride?: string) {
  const rpcUrl = rpcUrlOverride ?? chainConfig.rpcUrl
  const testnetChainIds = [11155111, 11155420] // sepolia, op_sepolia
  return defineChain({
    id: chainConfig.chainId,
    name: chainConfig.name,
    nativeCurrency: chainConfig.nativeCurrency,
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
    blockExplorers: {
      default: { name: 'Explorer', url: chainConfig.explorerUrl },
    },
    testnet: testnetChainIds.includes(chainConfig.chainId),
  })
}

// Legacy alias — keeps existing callers working
export const createCustomChain = (chainId: number, rpcUrl: string) => {
  const chainConfig = getChainById(chainId)
  return defineChain({
    id: chainId,
    name: chainConfig?.name || 'Custom Chain',
    nativeCurrency: chainConfig?.nativeCurrency ?? { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
    blockExplorers: {
      default: { name: 'Explorer', url: chainConfig?.explorerUrl || '' },
    },
    testnet: [11155111, 11155420].includes(chainId),
  })
}
