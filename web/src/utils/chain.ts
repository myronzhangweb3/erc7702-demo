import { defineChain } from 'viem';

export const CHAINS = {
  sepolia: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/demo',
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  op_sepolia: {
    name: 'OP Sepolia',
    chainId: 11155420,
    rpcUrl: 'https://optimism-sepolia-public.nodies.app',
    explorerUrl: 'https://optimistic.etherscan.io',
  },
};

export const getChainById = (chainId: number) => {
  return Object.values(CHAINS).find(chain => chain.chainId === chainId);
};

export const createCustomChain = (chainId: number, rpcUrl: string) => {
  const chainInfo = getChainById(chainId);
  return defineChain({
    id: chainId,
    name: chainInfo?.name || 'Custom Chain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
    blockExplorers: {
      default: { name: 'Explorer', url: chainInfo?.explorerUrl || '' },
    },
    testnet: true,
  });
};
