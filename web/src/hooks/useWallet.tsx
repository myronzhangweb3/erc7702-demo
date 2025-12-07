import { createContext, useContext, useState, ReactNode } from 'react'
import { WalletState } from '../types'
import { CONFIG, CHAINS, getChainById } from '../config'
import { checkDelegationStatus, getChainId } from '../utils/ethers-web3'
import { privateKeyToAccount } from 'viem/accounts'

interface WalletContextType extends WalletState {
  connectWallet: (privateKey: string, rpcUrl: string) => Promise<void>
  disconnect: () => void
  updateDelegationStatus: () => Promise<void>
  setGasFeePayer: (address: `0x${string}` | null) => void;
  switchChain: (chainId: number) => void;
  privateKey: string | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletState, setWalletState] = useState<WalletState>({
    txAccount: null,
    gasFeePayer: null,
    isConnected: false,
    isDelegated: false,
    rpcUrl: CONFIG.DEFAULT_RPC_URL,
    chainId: CONFIG.CHAIN_ID,
  })
  const [privateKey, setPrivateKey] = useState<string | null>(null)

  /**
   * 使用私钥登录
   * @param privateKey - 用户私钥
   * @param rpcUrl - RPC URL
   */
  const connectWallet = async (privateKey: string, rpcUrl: string) => {
    try {
      // 使用 viem 从私钥生成账户
      const account = privateKeyToAccount(privateKey as `0x${string}`)
      const accountAddress = account.address

      // 获取链ID
      const chainId = await getChainId(rpcUrl)

      // 检查绑定状态
      const isDelegated = await checkDelegationStatus(accountAddress, rpcUrl)

      // 保存到状态（私钥只在内存中，不保存到 localStorage）
      setPrivateKey(privateKey)
      setWalletState({
        txAccount: accountAddress,
        gasFeePayer: null,
        isConnected: true,
        isDelegated,
        rpcUrl,
        chainId,
      })
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    }
  }

  /**
   * 断开连接
   */
  const disconnect = () => {
    setPrivateKey(null)
    setWalletState({
      txAccount: null,
      gasFeePayer: null,
      isConnected: false,
      isDelegated: false,
      rpcUrl: CONFIG.DEFAULT_RPC_URL,
      chainId: CONFIG.CHAIN_ID,
    })
  }

  /**
   * 更新绑定状态
   */
  const updateDelegationStatus = async () => {
    if (!walletState.txAccount || !walletState.isConnected) return

    try {
      const isDelegated = await checkDelegationStatus(walletState.txAccount, walletState.rpcUrl)

      setWalletState((prev) => ({
        ...prev,
        isDelegated,
      }))
    } catch (error) {
      console.error('更新绑定状态失败:', error)
    }
  }

  const setGasFeePayer = (address: `0x${string}` | null) => {
    setWalletState(prev => ({ ...prev, gasFeePayer: address }));
  };

  const switchChain = async (chainId: number) => {
    const chain = getChainById(chainId);
    if (chain) {
      const isDelegated = walletState.txAccount ? await checkDelegationStatus(walletState.txAccount, chain.rpcUrl) : false;
      setWalletState(prev => ({
        ...prev,
        chainId: chain.chainId,
        rpcUrl: chain.rpcUrl,
        isDelegated
      }));
    }
  };

  return (
    <WalletContext.Provider
      value={{
        ...walletState,
        connectWallet,
        disconnect,
        updateDelegationStatus,
        setGasFeePayer,
        switchChain,
        privateKey,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
