import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { WalletState, StoredWallet, StoredGasPayer } from '../types'
import { getChainById } from '../config'
import { checkDelegationStatus, getChainId } from '../utils/ethers-web3'
import { privateKeyToAccount } from 'viem/accounts'
import { Hex } from 'viem'
import {
  deriveKey, encryptPrivateKey, decryptPrivateKey,
  generateSalt, hashPassword, isWebCryptoAvailable,
} from '../utils/crypto'
import {
  getStoredWallets, saveWallet, removeWallet as removeWalletFromStorage,
  getPasswordSalt, savePasswordSalt, getPasswordHash, savePasswordHash,
  getSelectedChainId, saveSelectedChainId,
  getStoredGasPayer, saveGasPayer, removeGasPayer,
} from '../utils/storage'
import { DEFAULT_CHAIN_ID } from '../config'

interface WalletContextType extends WalletState {
  // Legacy connect (kept for any residual callers during migration)
  connectWallet: (privateKey: Hex, rpcUrl: string, gasFeePayerPrivateKey?: Hex) => Promise<void>
  disconnect: () => void
  updateDelegationStatus: () => Promise<void>
  switchChain: (chainId: number) => Promise<void>
  txAccountPrivateKey: Hex | null
  gasFeePayerPrivateKey: Hex | null

  // Multi-wallet management
  storedWallets: StoredWallet[]
  unlockWallets: (password: string) => Promise<CryptoKey | null>
  addWallet: (name: string, privateKey: string, password?: string) => Promise<void>
  selectWallet: (walletId: string, keyOverride?: CryptoKey) => Promise<void>
  removeWallet: (walletId: string) => void

  // Gas payer
  setGasFeePayer: (privateKey: string) => Promise<void>
  clearGasFeePayer: () => void

  // Crypto key (in-memory only)
  cryptoKey: CryptoKey | null
  webCryptoAvailable: boolean
}

const defaultWalletState: WalletState = {
  txAccount: null,
  gasFeePayer: null,
  isConnected: false,
  isDelegated: false,
  rpcUrl: '',
  chainId: DEFAULT_CHAIN_ID,
  currentWalletId: null,
  currentWalletName: null,
  isUnlocked: false,
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletState, setWalletState] = useState<WalletState>(defaultWalletState)
  const [txAccountPrivateKey, setTxAccountPrivateKey] = useState<Hex | null>(null)
  const [gasFeePayerPrivateKey, setGasFeePayerPrivateKey] = useState<Hex | null>(null)
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null)
  const [storedWallets, setStoredWallets] = useState<StoredWallet[]>([])
  const webCryptoAvailable = isWebCryptoAvailable()

  // Load stored wallets and restore selected chain on mount
  useEffect(() => {
    setStoredWallets(getStoredWallets())
    const savedChainId = getSelectedChainId() ?? DEFAULT_CHAIN_ID
    const chain = getChainById(savedChainId)
    if (chain) {
      setWalletState(prev => ({ ...prev, chainId: chain.chainId, rpcUrl: chain.rpcUrl }))
    }
  }, [])

  // ── Internal helpers ──────────────────────────────────────────────────────

  const _connectWithKey = async (privateKey: Hex, chainId: number) => {
    const chain = getChainById(chainId)
    const rpcUrl = chain?.rpcUrl ?? ''
    const account = privateKeyToAccount(privateKey)
    const resolvedChainId = await getChainId(rpcUrl)
    const isDelegated = await checkDelegationStatus(account.address, rpcUrl)
    setTxAccountPrivateKey(privateKey)
    setWalletState(prev => ({
      ...prev,
      txAccount: account.address,
      isConnected: true,
      isDelegated,
      rpcUrl,
      chainId: resolvedChainId,
    }))
  }

  // ── Wallet unlock ─────────────────────────────────────────────────────────

  const unlockWallets = async (password: string): Promise<CryptoKey | null> => {
    const salt = getPasswordSalt()
    const storedHash = getPasswordHash()
    if (!salt || !storedHash) return null

    try {
      const key = await deriveKey(password, salt)
      const hash = await hashPassword(password, salt)
      if (hash !== storedHash) return null

      setCryptoKey(key)
      setWalletState(prev => ({ ...prev, isUnlocked: true }))

      // Also restore gas payer if stored
      const storedPayer = getStoredGasPayer()
      if (storedPayer) {
        try {
          const payerKey = await decryptPrivateKey(storedPayer.encryptedKey, storedPayer.iv, key) as Hex
          setGasFeePayerPrivateKey(payerKey)
          setWalletState(prev => ({ ...prev, gasFeePayer: storedPayer.address }))
        } catch {
          // Gas payer decryption failed — ignore, non-critical
        }
      }
      return key
    } catch {
      return null
    }
  }

  // ── Add wallet ────────────────────────────────────────────────────────────

  const addWallet = async (name: string, rawPrivateKey: string, password?: string) => {
    let key = cryptoKey
    let salt = getPasswordSalt()

    // First wallet: need password to create salt + hash
    if (!salt && password) {
      salt = generateSalt()
      savePasswordSalt(salt)
      const hash = await hashPassword(password, salt)
      savePasswordHash(hash)
      key = await deriveKey(password, salt)
      setCryptoKey(key)
      setWalletState(prev => ({ ...prev, isUnlocked: true }))
    }

    if (!key || !salt) throw new Error('请先解锁钱包或提供密码')

    let formattedKey = rawPrivateKey.trim()
    if (!formattedKey.startsWith('0x')) formattedKey = '0x' + formattedKey
    const account = privateKeyToAccount(formattedKey as Hex)

    const { ciphertext, iv } = await encryptPrivateKey(formattedKey, key)
    const shortAddr = `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    const walletName = `${name}(${shortAddr})`

    const wallet: StoredWallet = {
      id: crypto.randomUUID(),
      name: walletName,
      address: account.address,
      encryptedKey: ciphertext,
      iv,
    }
    saveWallet(wallet)
    const updated = getStoredWallets()
    setStoredWallets(updated)

    // Auto-select the new wallet
    await _selectWalletWithKey(wallet, formattedKey as Hex)
  }

  // ── Select wallet ─────────────────────────────────────────────────────────

  const _selectWalletWithKey = async (wallet: StoredWallet, privateKey: Hex) => {
    const chainId = walletState.chainId || DEFAULT_CHAIN_ID
    await _connectWithKey(privateKey, chainId)
    setWalletState(prev => ({
      ...prev,
      currentWalletId: wallet.id,
      currentWalletName: wallet.name,
    }))
  }

  const selectWallet = async (walletId: string, keyOverride?: CryptoKey) => {
    const key = keyOverride ?? cryptoKey
    if (!key) throw new Error('钱包未解锁')
    const wallet = getStoredWallets().find(w => w.id === walletId)
    if (!wallet) throw new Error('钱包不存在')
    const privateKey = await decryptPrivateKey(wallet.encryptedKey, wallet.iv, key) as Hex
    await _selectWalletWithKey(wallet, privateKey)
  }

  // ── Remove wallet ─────────────────────────────────────────────────────────

  const removeWallet = (walletId: string) => {
    removeWalletFromStorage(walletId)
    const updated = getStoredWallets()
    setStoredWallets(updated)
    if (walletState.currentWalletId === walletId) {
      // Disconnected from removed wallet
      setTxAccountPrivateKey(null)
      setWalletState(prev => ({
        ...prev,
        txAccount: null,
        isConnected: false,
        isDelegated: false,
        currentWalletId: null,
        currentWalletName: null,
      }))
    }
  }

  // ── Gas payer ─────────────────────────────────────────────────────────────

  const setGasFeePayer = async (rawPrivateKey: string) => {
    if (!cryptoKey) throw new Error('钱包未解锁')
    let formattedKey = rawPrivateKey.trim()
    if (!formattedKey.startsWith('0x')) formattedKey = '0x' + formattedKey
    const account = privateKeyToAccount(formattedKey as Hex)
    const { ciphertext, iv } = await encryptPrivateKey(formattedKey, cryptoKey)
    const stored: StoredGasPayer = { encryptedKey: ciphertext, iv, address: account.address }
    saveGasPayer(stored)
    setGasFeePayerPrivateKey(formattedKey as Hex)
    setWalletState(prev => ({ ...prev, gasFeePayer: account.address }))
  }

  const clearGasFeePayer = () => {
    removeGasPayer()
    setGasFeePayerPrivateKey(null)
    setWalletState(prev => ({ ...prev, gasFeePayer: null }))
  }

  // ── Chain switch ──────────────────────────────────────────────────────────

  const switchChain = async (chainId: number) => {
    const chain = getChainById(chainId)
    if (!chain) return
    saveSelectedChainId(chainId)
    const isDelegated = walletState.txAccount
      ? await checkDelegationStatus(walletState.txAccount, chain.rpcUrl)
      : false
    setWalletState(prev => ({
      ...prev,
      chainId: chain.chainId,
      rpcUrl: chain.rpcUrl,
      isDelegated,
    }))
  }

  // ── Delegation status ─────────────────────────────────────────────────────

  const updateDelegationStatus = async () => {
    if (!walletState.txAccount || !walletState.isConnected) return
    try {
      const isDelegated = await checkDelegationStatus(walletState.txAccount, walletState.rpcUrl)
      setWalletState(prev => ({ ...prev, isDelegated }))
    } catch (error) {
      console.error('更新绑定状态失败:', error)
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = () => {
    setTxAccountPrivateKey(null)
    setGasFeePayerPrivateKey(null)
    setCryptoKey(null)
    setWalletState(defaultWalletState)
  }

  // ── Legacy connectWallet (kept for compatibility) ─────────────────────────

  const connectWallet = async (privateKey: Hex, rpcUrl: string, gasFeePayerPk?: Hex) => {
    const account = privateKeyToAccount(privateKey)
    const chainId = await getChainId(rpcUrl)
    const isDelegated = await checkDelegationStatus(account.address, rpcUrl)
    const payerAccount = gasFeePayerPk ? privateKeyToAccount(gasFeePayerPk).address : null
    setTxAccountPrivateKey(privateKey)
    setGasFeePayerPrivateKey(gasFeePayerPk || null)
    setWalletState({
      txAccount: account.address,
      gasFeePayer: payerAccount,
      isConnected: true,
      isDelegated,
      rpcUrl,
      chainId,
      currentWalletId: null,
      currentWalletName: null,
      isUnlocked: false,
    })
  }

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
        storedWallets,
        unlockWallets,
        addWallet,
        selectWallet,
        removeWallet,
        setGasFeePayer,
        clearGasFeePayer,
        cryptoKey,
        webCryptoAvailable,
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
