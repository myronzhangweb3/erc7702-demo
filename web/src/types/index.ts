export interface WalletState {
  txAccount: `0x${string}` | null
  gasFeePayer: `0x${string}` | null
  isConnected: boolean
  isDelegated: boolean
  rpcUrl: string
  chainId: number
  currentWalletId: string | null
  currentWalletName: string | null
  isUnlocked: boolean
}

export interface TransactionCall {
  data: `0x${string}`
  to: `0x${string}`
  value: bigint
}

export interface DelegationStatus {
  isDelegated: boolean
  delegatedAddress: `0x${string}` | null
}

export interface StoredWallet {
  id: string
  name: string
  address: `0x${string}`
  encryptedKey: string
  iv: string
}

export interface ChainConfig {
  key: string
  name: string
  chainId: number
  rpcUrl: string
  explorerUrl: string
  isCustom: boolean
  nativeCurrency: { name: string; symbol: string; decimals: number }
}

export interface ContractAddresses {
  batchCallDelegation: `0x${string}` | ''
  erc20Token: `0x${string}` | ''
}

export interface StoredGasPayer {
  encryptedKey: string
  iv: string
  address: `0x${string}`
}
