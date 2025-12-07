import { Address, createWalletClient, Hex, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { createCustomChain } from './chain'
import { BatchCallDelegationAbi } from './abi'

/**
 * 创建基于私钥的钱包客户端
 */
export const createPrivateKeyWalletClient = (
  privateKey: Hex,
  chainId: number,
  rpcUrl: string
) => {
  const account = privateKeyToAccount(privateKey)
  const chain = createCustomChain(chainId, rpcUrl)

  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  })
}

export const executeBatchCalls = async (
  {
    txAccountPrivateKey,
    rpcUrl,
    chainId,
    calls,
    txAccount,
    gasFeePayerPrivateKey,
    totalValue
  }: {
    txAccountPrivateKey: Hex,
    rpcUrl: string,
    chainId: number,
    calls: any[],
    txAccount: Address,
    gasFeePayerPrivateKey?: Hex | null,
    totalValue?: bigint
  }
) => {
  const senderPrivateKey = gasFeePayerPrivateKey || txAccountPrivateKey
  const walletClient = createPrivateKeyWalletClient(senderPrivateKey, chainId, rpcUrl)

  return await walletClient.writeContract({
    address: txAccount,
    abi: BatchCallDelegationAbi,
    functionName: 'execute',
    args: [calls],
    value: totalValue,
  })
}