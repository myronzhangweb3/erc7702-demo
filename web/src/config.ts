import { BUILT_IN_CHAINS, getAllChains, getChainById } from './utils/chain'
import { ContractAddresses } from './types'
import { getStoredContractAddresses } from './utils/storage'

export const DEFAULT_CHAIN_ID = 11155111 // Sepolia

// Per-chain default contract addresses (only chains where contracts are deployed)
export const DEFAULT_CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  11155111: { // Sepolia
    batchCallDelegation: '0x2596eE5aA1799a9837937A679Ca80Cf9331bC2bb',
    erc20Token: '0x0D3c26B307115AD096d856dC4C8f95Ca2fFD4F4b',
  },
  11155420: { // OP Sepolia
    batchCallDelegation: '',
    erc20Token: '',
  },
}

export function getContractAddressesForChain(chainId: number): ContractAddresses {
  const stored = getStoredContractAddresses()
  const defaults = DEFAULT_CONTRACT_ADDRESSES[chainId] ?? { batchCallDelegation: '', erc20Token: '' }
  const userOverride = stored[chainId]
  if (!userOverride) return defaults
  return {
    batchCallDelegation: userOverride.batchCallDelegation || defaults.batchCallDelegation,
    erc20Token: userOverride.erc20Token || defaults.erc20Token,
  }
}

// Legacy CONFIG kept for any remaining direct references — prefer getContractAddressesForChain
export const CONFIG = {
  get ERC20_TOKEN_ADDRESS() {
    return getContractAddressesForChain(DEFAULT_CHAIN_ID).erc20Token as `0x${string}`
  },
  get BATCH_CALL_DELEGATION_CONTRACT_ADDRESS() {
    return getContractAddressesForChain(DEFAULT_CHAIN_ID).batchCallDelegation as `0x${string}`
  },
  DEFAULT_RPC_URL: BUILT_IN_CHAINS.sepolia.rpcUrl,
}

export { getChainById, getAllChains, BUILT_IN_CHAINS as CHAINS }
