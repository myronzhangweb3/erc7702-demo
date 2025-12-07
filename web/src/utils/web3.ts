import { Hex, createWalletClient, http } from 'viem'
import { eip7702Actions } from 'viem/experimental'
import { privateKeyToAccount } from 'viem/accounts'
import { createCustomChain } from './chain'

/**
 * 创建基于私钥的钱包客户端（支持EIP7702）
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
  }).extend(eip7702Actions)
}