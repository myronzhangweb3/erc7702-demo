import {
  BrowserProvider,
  Contract,
  parseEther as ethersParseEther,
  formatEther as ethersFormatEther,
  Wallet,
  JsonRpcProvider
} from 'ethers'
import { createPublicClient, createWalletClient, http } from 'viem'
import { Account, Address, privateKeyToAccount } from 'viem/accounts'
import { eip7702Actions } from 'viem/experimental'
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
 * 获取 Web3 Provider (支持 MetaMask, Rabby Wallet 等)
 */
export const getMetaMaskProvider = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return window.ethereum
  }
  return null
}

/**
 * 获取 ethers Provider
 */
export const getEthersProvider = () => {
  const provider = getMetaMaskProvider()
  if (!provider) {
    throw new Error('未检测到 Web3 钱包。请安装 MetaMask、Rabby Wallet 或其他 Web3 钱包。')
  }
  return new BrowserProvider(provider)
}

/**
 * 获取 Signer (基于 MetaMask)
 * @deprecated 不再使用 MetaMask，请使用 getPrivateKeySigner
 */
export const getSigner = async () => {
  const provider = await getEthersProvider()
  return await provider.getSigner()
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
  privateKey: string,
  contractAddress: string,
  chainId: number,
  rpcUrl: string,
  gasFeePayerPrivateKey?: string,
): Promise<string> => {
  try {
    // 创建 viem 账户（从私钥）
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    const chain = createCustomChain(chainId, rpcUrl);

    // 创建 wallet client
    const walletClient = createWalletClient({
      account,
      chain: chain,
      transport: http(rpcUrl),
    }).extend(eip7702Actions)

    let executor: Address | 'self';
    let txSenderClient: typeof walletClient;

    if (gasFeePayerPrivateKey) {
      const gasFeePayer = privateKeyToAccount(gasFeePayerPrivateKey as `0x${string}`);
      executor = gasFeePayer.address;
      txSenderClient = createWalletClient({
        account: gasFeePayer,
        chain: chain,
        transport: http(rpcUrl),
      }).extend(eip7702Actions);
    } else {
      executor = 'self';
      txSenderClient = walletClient;
    }

    console.log('Account:', account.address)
    console.log('Target:', contractAddress)
    console.log('ChainId:', chainId)

    // 发送 EIP-7702 授权交易
    const authorization = await walletClient.signAuthorization({
      contractAddress: contractAddress as Address,
      executor: executor,
    });
     
    const hash = await txSenderClient.sendTransaction({
      authorizationList: [authorization],
      data: "0x",
      to: walletClient.account.address,
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

// createManualAuthorization 函数已移除
// 现在使用 viem 的 EIP-7702 支持，它会自动处理授权签名

/**
 * 执行批量调用 - 关键修改：不发送到已代理的地址
 * 而是通过合约交互方式调用
 * @deprecated 不再使用 MetaMask，请使用 executeBatchCallsWithPrivateKey
 */
export const executeBatchCalls = async (
  calls: Array<{
    data: string
    to: string
    value: bigint
  }>,
  abi: any,
  totalValue: bigint = BigInt(0)
): Promise<string> => {
  try {
    const signer = await getSigner()
    const signerAddress = await signer.getAddress()

    console.log('执行批量调用，Signer 地址:', signerAddress)
    console.log('Calls:', calls)

    // 创建合约实例 - 注意：这里使用 signer 的地址
    // 因为 signer 已经被代理到合约
    const contract = new Contract(signerAddress, abi, signer)

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
 * 使用私钥执行批量调用
 */
export const executeBatchCallsWithPrivateKey = async (
  privateKey: string,
  rpcUrl: string,
  calls: Array<{
    data: string
    to: string
    value: bigint
  }>,
  abi: any,
  totalValue: bigint = BigInt(0)
): Promise<string> => {
  try {
    const signer = getPrivateKeySigner(privateKey, rpcUrl)
    const signerAddress = await signer.getAddress()

    console.log('执行批量调用，Signer 地址:', signerAddress)
    console.log('Calls:', calls)

    // 创建合约实例 - 注意：这里使用 signer 的地址
    // 因为 signer 已经被代理到合约
    const contract = new Contract(signerAddress, abi, signer)

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

// 导出 ethers 的工具函数
export { ethersParseEther as parseEther, ethersFormatEther as formatEther }

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
