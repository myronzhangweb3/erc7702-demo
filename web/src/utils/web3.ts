import {
  Address, createPublicClient, createWalletClient,
  encodeAbiParameters, Hex, http, keccak256, parseAbiParameters,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { createCustomChain } from './chain'
import { BatchCallDelegationAbi } from './abi'

const BATCH_EXECUTION_MODE = '0x0100000000000000000000000000000000000000000000000000000000000000' as `0x${string}`

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
  return createWalletClient({ account, chain, transport: http(rpcUrl) })
}

export const executeBatchCalls = async (
  {
    txAccountPrivateKey,
    rpcUrl,
    chainId,
    calls,
    txAccount,
    gasFeePayerPrivateKey,
    totalValue,
  }: {
    txAccountPrivateKey: Hex
    rpcUrl: string
    chainId: number
    calls: { to: string; value?: bigint; data: Hex }[]
    txAccount: Address
    gasFeePayerPrivateKey?: Hex | null
    totalValue?: bigint
  }
) => {
  // ERC-7821: encode Execution[] = (address target, uint256 value, bytes callData)
  const executionData = encodeAbiParameters(
    parseAbiParameters('(address target, uint256 value, bytes callData)[]'),
    [calls.map(c => ({ target: c.to as Address, value: c.value ?? BigInt(0), callData: c.data }))]
  )

  if (gasFeePayerPrivateKey) {
    // ── Gas代付路径：txAccount 签名，gas payer 提交 executeWithSig ──────────
    const chain = createCustomChain(chainId, rpcUrl)

    // 读取当前 nonce（存储在 txAccount 的合约 storage 中）
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
    const currentNonce = await publicClient.readContract({
      address: txAccount,
      abi: BatchCallDelegationAbi,
      functionName: 'nonce',
    })

    // txAccount 对 (mode, keccak256(executionData), nonce) 做 EIP-712 签名
    const txWalletClient = createPrivateKeyWalletClient(txAccountPrivateKey, chainId, rpcUrl)
    const signature = await txWalletClient.signTypedData({
      domain: {
        name: 'BatchCallDelegation',
        version: '1',
        chainId,
        verifyingContract: txAccount,
      },
      types: {
        Execute: [
          { name: 'mode', type: 'bytes32' },
          { name: 'executionDataHash', type: 'bytes32' },
          { name: 'nonce', type: 'uint256' },
        ],
      },
      primaryType: 'Execute',
      message: {
        mode: BATCH_EXECUTION_MODE,
        executionDataHash: keccak256(executionData),
        nonce: currentNonce,
      },
    })

    // gas payer 提交 executeWithSig
    const gasPayerClient = createPrivateKeyWalletClient(gasFeePayerPrivateKey, chainId, rpcUrl)
    return await gasPayerClient.writeContract({
      address: txAccount,
      abi: BatchCallDelegationAbi,
      functionName: 'executeWithSig',
      args: [BATCH_EXECUTION_MODE, executionData, signature],
      value: totalValue,
    })
  }

  // ── 普通路径：txAccount 自己提交 execute ────────────────────────────────
  const walletClient = createPrivateKeyWalletClient(txAccountPrivateKey, chainId, rpcUrl)
  return await walletClient.writeContract({
    address: txAccount,
    abi: BatchCallDelegationAbi,
    functionName: 'execute',
    args: [BATCH_EXECUTION_MODE, executionData],
    value: totalValue,
  })
}
