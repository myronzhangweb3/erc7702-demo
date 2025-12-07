import { createWalletClient, http, PublicClient, createPublicClient, custom, formatEther } from 'viem'
import { eip7702Actions } from 'viem/experimental'
import { privateKeyToAccount } from 'viem/accounts'
import { ERC20Abi } from './abi'
import { createCustomChain } from './chain'

/**
 * 获取 MetaMask Provider
 */
export const getMetaMaskProvider = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return window.ethereum
  }
  return null
}

/**
 * 发送 EIP-7702 授权交易
 * 直接通过 RPC 发送交易，支持 authorizationList
 */
export const sendEIP7702Transaction = async (
  account: `0x${string}`,
  to: `0x${string}`,
  data: `0x${string}`,
  value: string,
  authorizationList: Array<{
    chainId: number
    address: `0x${string}`
    nonce: number
  }>,
  chainId: number
): Promise<string> => {
  const provider = getMetaMaskProvider()
  if (!provider) {
    throw new Error('MetaMask 未安装')
  }

  try {
    // 获取当前账户的 nonce
    const nonce = await provider.request({
      method: 'eth_getTransactionCount',
      params: [account, 'latest'],
    }) as string

    // 获取 gas 价格
    const gasPrice = await provider.request({
      method: 'eth_gasPrice',
      params: [],
    }) as string

    // 估算 gas limit
    let gasLimit = '0x186a0' // 默认 100000
    try {
      gasLimit = await provider.request({
        method: 'eth_estimateGas',
        params: [{
          from: account,
          to,
          data,
          value: value === '0x0' ? undefined : value,
        }],
      }) as string
    } catch (e) {
      console.warn('Gas estimation failed, using default:', e)
    }

    // 构造 EIP-7702 交易
    // 注意：EIP-7702 使用交易类型 0x04
    const tx = {
      from: account,
      to,
      value: value === '0x0' ? '0x0' : value,
      data,
      gas: gasLimit,
      gasPrice,
      nonce,
      chainId: `0x${chainId.toString(16)}`,
      type: '0x04', // EIP-7702 交易类型
      authorizationList: authorizationList.map(auth => ({
        chainId: `0x${auth.chainId.toString(16)}`,
        address: auth.address,
        nonce: `0x${auth.nonce.toString(16)}`,
        // 签名字段由 MetaMask 自动添加
      })),
    }

    console.log('发送 EIP-7702 交易:', tx)

    // 发送交易
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [tx],
    }) as string

    return txHash
  } catch (error) {
    console.error('发送 EIP-7702 交易失败:', error)
    throw error
  }
}

/**
 * 简化的授权签署 - 返回授权对象格式
 */
export const createAuthorizationTuple = async (
  account: `0x${string}`,
  contractAddress: `0x${string}`,
  chainId: number
): Promise<{
  chainId: number
  address: `0x${string}`
  nonce: number
}> => {
  const provider = getMetaMaskProvider()
  if (!provider) {
    throw new Error('MetaMask 未安装')
  }

  // 获取账户的 nonce
  const nonceHex = await provider.request({
    method: 'eth_getTransactionCount',
    params: [account, 'latest'],
  }) as string

  const nonce = parseInt(nonceHex, 16)

  return {
    chainId,
    address: contractAddress,
    nonce,
  }
}

/**
 * 创建基于 MetaMask 的钱包客户端（支持EIP7702）
 * @deprecated 不再使用 MetaMask，请使用 createPrivateKeyWalletClient
 */
export const createMetaMaskWalletClient = (
  chainId: number,
  rpcUrl: string
) => {
  const provider = getMetaMaskProvider()
  if (!provider) {
    throw new Error('MetaMask 未安装')
  }

  const chain = createCustomChain(chainId, rpcUrl)

  return createWalletClient({
    chain,
    transport: custom(provider),
  }).extend(eip7702Actions)
}

/**
 * 创建基于私钥的钱包客户端（支持EIP7702）
 */
export const createPrivateKeyWalletClient = (
  privateKey: string,
  chainId: number,
  rpcUrl: string
) => {
  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const chain = createCustomChain(chainId, rpcUrl)

  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  }).extend(eip7702Actions)
}

/**
 * 创建公共客户端
 */
export const createCustomPublicClient = (chainId: number, rpcUrl: string): PublicClient => {
  const chain = createCustomChain(chainId, rpcUrl)

  return createPublicClient({
    chain,
    transport: http(),
  })
}

/**
 * 检查地址是否已绑定代理合约
 * 通过读取账户的code来判断是否已经绑定
 */
export const checkDelegationStatus = async (
  address: `0x${string}`,
  publicClient: PublicClient
): Promise<boolean> => {
  try {
    // 读取地址的code
    const code = await publicClient.getBytecode({ address })

    // 如果code存在且不为空，说明已经绑定了代理合约
    // EIP7702绑定后，账户会有代理合约的code
    if (code && code !== '0x') {
      return true
    }
    return false
  } catch (error) {
    console.error('检查绑定状态失败:', error)
    return false
  }
}

/**
 * 从 MetaMask 获取账户地址
 */
export const getMetaMaskAccount = async (): Promise<`0x${string}` | null> => {
  const provider = getMetaMaskProvider()
  if (!provider) {
    return null
  }

  try {
    const accounts = await provider.request({
      method: 'eth_requestAccounts',
    }) as string[]
    return accounts[0] as `0x${string}`
  } catch (error) {
    console.error('获取账户失败:', error)
    return null
  }
}

/**
 * 获取链ID
 */
export const getChainId = async (rpcUrl: string): Promise<number> => {
  try {
    const response = await fetch(rpcUrl, {
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

    const data = await response.json()
    return parseInt(data.result, 16)
  } catch (error) {
    console.error('获取链ID失败:', error)
    throw error
  }
}

/**
 * 检查网络是否支持 EIP-7702
 */
export const checkEIP7702Support = async (rpcUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: ['0x0000000000000000000000000000000000000000', 'latest'],
        id: 1,
      }),
    })

    const data = await response.json()
    // 这是一个简单的检查，实际上需要更复杂的验证
    console.log('Network response:', data)

    // 注意：这个检查并不完整，只是一个示例
    // 实际上需要检查网络的硬分叉版本或其他特定标记
    return true // 临时返回 true，实际需要根据网络特性判断
  } catch (error) {
    console.error('检查 EIP-7702 支持失败:', error)
    return false
  }
}

export const getErc20Balance = async (tokenAddress: `0x${string}`, userAddress: `0x${string}`, chainId: number, rpcUrl: string) => {
  const publicClient = createCustomPublicClient(chainId, rpcUrl);
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20Abi,
    functionName: 'balanceOf',
    args: [userAddress],
  });
  return formatEther(balance as bigint);
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
