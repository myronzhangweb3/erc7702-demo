import { createContext, useContext, useState, ReactNode } from 'react'
import { WalletState } from '../types'
import { CONFIG, getChainById } from '../config'
import { checkDelegationStatus, getChainId } from '../utils/ethers-web3'
import { privateKeyToAccount } from 'viem/accounts'
import { Hex } from 'viem'

interface WalletContextType extends WalletState {
  connectWallet: (privateKey: Hex, rpcUrl: string, gasFeePayerPrivateKey?: Hex) => Promise<void>
  disconnect: () => void
  updateDelegationStatus: () => Promise<void>
  switchChain: (chainId: number) => void
  txAccountPrivateKey: Hex | null
  gasFeePayerPrivateKey: Hex | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletState, setWalletState] = useState<WalletState>({
    txAccount: null,
    gasFeePayer: null,
    isConnected: false,
    isDelegated: false,
    rpcUrl: CONFIG.DEFAULT_RPC_URL,
    chainId: -1,
  })
  const [txAccountPrivateKey, setTxAccountPrivateKey] = useState<Hex | null>(null)
  const [gasFeePayerPrivateKey, setGasFeePayerPrivateKey] = useState<Hex | null>(null);

  /**
   * 使用私钥登录
   * @param txAccountPrivateKey - 交易账户私钥
   * @param rpcUrl - RPC URL
   * @param gasFeePayerPk - gas payer 私钥
   */
  const connectWallet = async (txAccountPrivateKey: Hex, rpcUrl: string, gasFeePayerPrivateKey?: Hex) => {
    try {
      // 使用 viem 从私钥生成账户
      const account = privateKeyToAccount(txAccountPrivateKey)
      const accountAddress = account.address

      // 获取链ID
      const chainId = await getChainId(rpcUrl)

      // 检查绑定状态
      const isDelegated = await checkDelegationStatus(accountAddress, rpcUrl)

      // gas payer 地址
      const payerAccount = gasFeePayerPrivateKey ? privateKeyToAccount(gasFeePayerPrivateKey).address : null;
      
      // 保存到状态（私钥只在内存中，不保存到 localStorage）
      setTxAccountPrivateKey(txAccountPrivateKey)
      setGasFeePayerPrivateKey(gasFeePayerPrivateKey || null)
      setWalletState({
        txAccount: accountAddress,
        gasFeePayer: payerAccount,
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
    setTxAccountPrivateKey(null)
    setGasFeePayerPrivateKey(null)
    setWalletState({
      txAccount: null,
      gasFeePayer: null,
      isConnected: false,
      isDelegated: false,
      rpcUrl: CONFIG.DEFAULT_RPC_URL,
      chainId: -1,
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
        switchChain,
        txAccountPrivateKey,
        gasFeePayerPrivateKey,
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
