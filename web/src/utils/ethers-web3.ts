import {
  formatEther as ethersFormatEther,
  Wallet,
  JsonRpcProvider,
  Contract
} from 'ethers'
import { createWalletClient, Hex, http } from 'viem'
import { Address, privateKeyToAccount } from 'viem/accounts'
import { verifyAuthorization } from 'viem/utils'
import { createCustomChain } from './chain'

/**
 * 延迟函数
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * RPC 请求重试逻辑（处理速率限制）
 */
async function rpcRequestWithRetry<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error: any) {
      lastError = error

      // 检查是否是速率限制错误
      const isRateLimit =
        error.message?.includes('rate limit') ||
        error.message?.includes('too many requests') ||
        error.message?.includes('429') ||
        error.code === 429

      if (isRateLimit && attempt < maxRetries) {
        // 指数退避：1s, 2s, 4s
        const delayMs = baseDelay * Math.pow(2, attempt)
        console.warn(`RPC 速率限制，${delayMs}ms 后重试 (${attempt + 1}/${maxRetries})...`)
        await delay(delayMs)
        continue
      }

      // 如果不是速率限制错误，或已达到最大重试次数，抛出错误
      throw error
    }
  }

  throw lastError || new Error('RPC 请求失败')
}

/**
 * 获取基于私钥的 Signer
 */
export const getPrivateKeySigner = (privateKey: string, rpcUrl: string) => {
  const provider = new JsonRpcProvider(rpcUrl)
  return new Wallet(privateKey, provider)
}

/**
 * 发送 EIP-7702 授权交易（绑定/解绑代理）
 * 使用 viem 和私钥直接签署和发送
 */
export const sendAuthorizationTransaction = async (
  txAccountPrivateKey: Hex,
  contractAddress: Address,
  chainId: number,
  rpcUrl: string,
  gasFeePayerPrivateKey?: Hex | null,
): Promise<string> => {
  try {
    // 创建 viem 账户（从私钥）
    const txAccount = privateKeyToAccount(txAccountPrivateKey)
    const chain = createCustomChain(chainId, rpcUrl);

    // 创建 wallet client
    const walletClient = createWalletClient({
      account: txAccount,
      chain: chain,
      transport: http(rpcUrl),
    })

    let executor: Address | 'self';
    let txSenderClient: typeof walletClient;

    if (gasFeePayerPrivateKey) {
      const gasFeePayer = privateKeyToAccount(gasFeePayerPrivateKey);
      executor = gasFeePayer.address;
      txSenderClient = createWalletClient({
        account: gasFeePayer,
        chain: chain,
        transport: http(rpcUrl),
      });
    } else {
      executor = 'self';
      txSenderClient = walletClient;
    }

    console.log('TxAccount:', txAccount.address)
    console.log('Target:', contractAddress)
    console.log('ChainId:', chainId)

    // 发送 EIP-7702 授权交易
    const authorization = await walletClient.signAuthorization({
      contractAddress: contractAddress,
      executor: executor,
    });

    // 验证 authorization
    const valid = await verifyAuthorization({
      address: txAccount.address,
      authorization,
    })
    if (!valid) {
      throw new Error(
        'EIP-7702 authorization 验证失败',
      )
    }

    let gas = undefined;
    switch (chainId) {
      case 11155420:
        gas = BigInt(46000);
        break;
    }

    const hash = await txSenderClient.sendTransaction({
      authorizationList: [authorization],
      data: "0x",
      to: walletClient.account.address,
      gas: gas,
    });

    console.log('授权交易已发送:', hash)
    return hash
  } catch (error: any) {
    console.error('授权失败:', error)
    throw new Error(
      'EIP-7702 授权失败\n\n' +
      '原始错误: ' + error.message
    )
  }
}

/**
 * 使用私钥执行批量调用
 */
export const executeBatchCallsWithPrivateKey = async (
  privateKey: Hex,
  rpcUrl: string,
  calls: Array<{
    data: string
    to: string
    value: bigint
  }>,
  abi: any,
  totalValue: bigint = BigInt(0),
  gasFeePayerPrivateKey?: Hex | null,
): Promise<string> => {
  try {
    const txAccountSigner = getPrivateKeySigner(privateKey, rpcUrl)
    const txAccountAddress = await txAccountSigner.getAddress()

    const finalSigner = gasFeePayerPrivateKey ? getPrivateKeySigner(gasFeePayerPrivateKey, rpcUrl) : txAccountSigner;

    console.log('执行批量调用，Signer 地址:', txAccountAddress)
    console.log('Gas Payer 地址:', await finalSigner.getAddress())
    console.log('Calls:', calls)

    // 创建合约实例 - 注意：这里使用 signer 的地址
    // 因为 signer 已经被代理到合约
    const contract = new Contract(txAccountAddress, abi, finalSigner)

    console.log('调用 execute 函数...')

    // 直接调用 execute 函数
    const tx = await contract.execute(calls, {
      value: totalValue,
    })

    console.log('交易已发送:', tx.hash)

    return tx.hash
  } catch (error) {
    console.error('执行批量调用失败:', error)
    throw error
  }
}

/**
 * 检查地址是否已绑定代理
 */
export const checkDelegationStatus = async (
  address: string,
  rpcUrl: string
): Promise<boolean> => {
  try {
    const response = await rpcRequestWithRetry(async () => {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getCode',
          params: [address, 'latest'],
          id: 1,
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      return res
    })

    const data = await response.json()

    // 检查是否有 RPC 错误
    if (data.error) {
      throw new Error(data.error.message || 'RPC 错误')
    }

    const code = data.result

    // 如果有代码，说明已经绑定了代理
    return code && code !== '0x'
  } catch (error) {
    console.error('检查绑定状态失败:', error)
    return false
  }
}

/**
 * 获取链ID
 */
export const getChainId = async (rpcUrl: string): Promise<number> => {
  try {
    const response = await rpcRequestWithRetry(async () => {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1,
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      return res
    })

    const data = await response.json()

    // 检查是否有 RPC 错误
    if (data.error) {
      throw new Error(data.error.message || 'RPC 错误')
    }

    return parseInt(data.result, 16)
  } catch (error) {
    console.error('获取链ID失败:', error)
    throw error
  }
}

/**
 * 获取原生代币余额
 */
export const getNativeBalance = async (address: string, rpcUrl: string): Promise<string> => {
  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    return ethersFormatEther(balance);
  } catch (error) {
    console.error('获取原生代币余额失败:', error);
    throw error;
  }
};

// 扩展window类型
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }
}
