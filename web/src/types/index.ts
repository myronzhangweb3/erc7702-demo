export interface WalletState {
  txAccount: `0x${string}` | null
  sponsor: `0x${string}` | null
  isConnected: boolean
  isDelegated: boolean
  rpcUrl: string
  chainId: number
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
