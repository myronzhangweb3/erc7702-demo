import { CHAINS, getChainById } from './utils/chain';

// 固定的合约地址配置
export const CONFIG = {
  ERC20_TOKEN_ADDRESS: '0x0D3c26B307115AD096d856dC4C8f95Ca2fFD4F4b' as `0x${string}`,
  BATCH_CALL_DELEGATION_CONTRACT_ADDRESS: '0x90489BDa2d09131471c287F3cc67EA60cf48c157' as `0x${string}`,

  // RPC URL - 从用户输入获取或使用默认值
  DEFAULT_RPC_URL: CHAINS.sepolia.rpcUrl,
  CHAIN_ID: -1,
};

export { getChainById, CHAINS };
