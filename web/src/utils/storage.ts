import { StoredWallet, ChainConfig, ContractAddresses, StoredGasPayer } from '../types'

const KEYS = {
  WALLETS: 'erc7702_wallets',
  PASSWORD_SALT: 'erc7702_password_salt',
  PASSWORD_HASH: 'erc7702_password_hash',
  CUSTOM_CHAINS: 'erc7702_custom_chains',
  RPC_OVERRIDES: 'erc7702_rpc_overrides',
  CONTRACT_ADDRESSES: 'erc7702_contract_addresses',
  GAS_PAYER: 'erc7702_gas_payer',
  SELECTED_CHAIN: 'erc7702_selected_chain',
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`Storage write failed for key "${key}":`, e)
  }
}

// ── Wallet storage ──────────────────────────────────────────────────────────

export function getStoredWallets(): StoredWallet[] {
  return safeGet<StoredWallet[]>(KEYS.WALLETS, [])
}

export function saveWallet(wallet: StoredWallet): void {
  const wallets = getStoredWallets()
  const idx = wallets.findIndex(w => w.id === wallet.id)
  if (idx >= 0) {
    wallets[idx] = wallet
  } else {
    wallets.push(wallet)
  }
  safeSet(KEYS.WALLETS, wallets)
}

export function removeWallet(id: string): void {
  const wallets = getStoredWallets().filter(w => w.id !== id)
  safeSet(KEYS.WALLETS, wallets)
}

// ── Password salt & hash ────────────────────────────────────────────────────

export function getPasswordSalt(): Uint8Array | null {
  const raw = safeGet<string | null>(KEYS.PASSWORD_SALT, null)
  if (!raw) return null
  return new Uint8Array(atob(raw).split('').map(c => c.charCodeAt(0)))
}

export function savePasswordSalt(salt: Uint8Array): void {
  safeSet(KEYS.PASSWORD_SALT, btoa(String.fromCharCode(...salt)))
}

export function getPasswordHash(): string | null {
  return safeGet<string | null>(KEYS.PASSWORD_HASH, null)
}

export function savePasswordHash(hash: string): void {
  safeSet(KEYS.PASSWORD_HASH, hash)
}

// ── Custom chains ───────────────────────────────────────────────────────────

export function getCustomChains(): ChainConfig[] {
  return safeGet<ChainConfig[]>(KEYS.CUSTOM_CHAINS, [])
}

export function saveCustomChain(chain: ChainConfig): void {
  const chains = getCustomChains()
  const idx = chains.findIndex(c => c.key === chain.key)
  if (idx >= 0) {
    chains[idx] = chain
  } else {
    chains.push(chain)
  }
  safeSet(KEYS.CUSTOM_CHAINS, chains)
}

export function removeCustomChain(key: string): void {
  const chains = getCustomChains().filter(c => c.key !== key)
  safeSet(KEYS.CUSTOM_CHAINS, chains)
}

// ── RPC overrides ───────────────────────────────────────────────────────────

export function getRpcOverrides(): Record<number, string> {
  return safeGet<Record<number, string>>(KEYS.RPC_OVERRIDES, {})
}

export function saveRpcOverride(chainId: number, rpcUrl: string): void {
  const overrides = getRpcOverrides()
  overrides[chainId] = rpcUrl
  safeSet(KEYS.RPC_OVERRIDES, overrides)
}

// ── Selected chain ──────────────────────────────────────────────────────────

export function getSelectedChainId(): number | null {
  return safeGet<number | null>(KEYS.SELECTED_CHAIN, null)
}

export function saveSelectedChainId(chainId: number): void {
  safeSet(KEYS.SELECTED_CHAIN, chainId)
}

// ── Contract addresses ──────────────────────────────────────────────────────

export function getStoredContractAddresses(): Record<number, ContractAddresses> {
  return safeGet<Record<number, ContractAddresses>>(KEYS.CONTRACT_ADDRESSES, {})
}

export function saveContractAddresses(chainId: number, addresses: ContractAddresses): void {
  const all = getStoredContractAddresses()
  all[chainId] = addresses
  safeSet(KEYS.CONTRACT_ADDRESSES, all)
}

// ── Gas payer ───────────────────────────────────────────────────────────────

export function getStoredGasPayer(): StoredGasPayer | null {
  return safeGet<StoredGasPayer | null>(KEYS.GAS_PAYER, null)
}

export function saveGasPayer(gasPayer: StoredGasPayer): void {
  safeSet(KEYS.GAS_PAYER, gasPayer)
}

export function removeGasPayer(): void {
  localStorage.removeItem(KEYS.GAS_PAYER)
}

// ── Clear all ───────────────────────────────────────────────────────────────

export function clearAllStorage(): void {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}
