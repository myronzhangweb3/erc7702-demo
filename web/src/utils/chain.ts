import { defineChain } from 'viem';

export const CHAINS = {
  sepolia: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://api.zan.top/eth-sepolia',
    explorerUrl: 'https://sepolia.etherscan.io',
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
