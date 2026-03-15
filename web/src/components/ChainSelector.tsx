import { useState, useRef, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { getAllChains, BUILT_IN_CHAINS } from '../utils/chain'
import { ChainConfig } from '../types/index'
import { saveCustomChain, saveRpcOverride, saveContractAddresses } from '../utils/storage'
import { getContractAddressesForChain } from '../config'
import { Modal } from './Modal'

export const ChainSelector = () => {
  const { chainId, switchChain } = useWallet()
  const [open, setOpen] = useState(false)
  const [showAddChain, setShowAddChain] = useState(false)
  const [editChain, setEditChain] = useState<ChainConfig | null>(null)
  const [editForm, setEditForm] = useState({ rpcUrl: '', batchCallDelegation: '', erc20Token: '' })
  const [addChainForm, setAddChainForm] = useState({ name: '', chainId: '', rpcUrl: '', explorerUrl: '' })
  const [addChainError, setAddChainError] = useState('')
  const [switching, setSwitching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const allChains = getAllChains()
  const currentChain = allChains.find(c => c.chainId === chainId)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelectChain = async (id: number) => {
    setOpen(false)
    setSwitching(true)
    try { await switchChain(id) } finally { setSwitching(false) }
  }

  const openEditChain = (chain: ChainConfig) => {
    const contracts = getContractAddressesForChain(chain.chainId)
    setEditForm({
      rpcUrl: chain.rpcUrl,
      batchCallDelegation: contracts.batchCallDelegation,
      erc20Token: contracts.erc20Token,
    })
    setEditChain(chain)
    setOpen(false)
  }

  const handleSaveChainEdit = async () => {
    if (!editChain) return
    saveRpcOverride(editChain.chainId, editForm.rpcUrl.trim() || editChain.rpcUrl)
    saveContractAddresses(editChain.chainId, {
      batchCallDelegation: editForm.batchCallDelegation.trim() as `0x${string}` | '',
      erc20Token: editForm.erc20Token.trim() as `0x${string}` | '',
    })
    setEditChain(null)
    await switchChain(editChain.chainId)
  }

  const handleAddChain = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddChainError('')
    const id = parseInt(addChainForm.chainId)
    if (isNaN(id) || id <= 0) { setAddChainError('链ID必须是正整数'); return }
    if (!addChainForm.rpcUrl.startsWith('http')) { setAddChainError('RPC URL 必须以 http:// 或 https:// 开头'); return }
    const existing = getAllChains().find(c => c.chainId === id)
    if (existing) { setAddChainError(`链ID ${id} 已存在 (${existing.name})`); return }

    const chain: ChainConfig = {
      key: `custom_${id}`,
      name: addChainForm.name.trim() || `Chain ${id}`,
      chainId: id,
      rpcUrl: addChainForm.rpcUrl.trim(),
      explorerUrl: addChainForm.explorerUrl.trim(),
      isCustom: true,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    }
    saveCustomChain(chain)
    setShowAddChain(false)
    setAddChainForm({ name: '', chainId: '', rpcUrl: '', explorerUrl: '' })
    await switchChain(id)
  }

  const builtInChains = allChains.filter(c => !c.isCustom)
  const customChains = allChains.filter(c => c.isCustom)

  return (
    <>
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.35rem 0.65rem',
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, color: '#374151',
          }}
        >
          <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>⛓</span>
          {switching ? '切换中...' : (currentChain?.name ?? '选择链')}
          <span style={{ fontSize: '0.55rem', opacity: 0.5 }}>▼</span>
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: '110%', left: 0, zIndex: 200,
            backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: '200px',
            maxHeight: '380px', overflowY: 'auto',
          }}>
            <div style={{ padding: '0.4rem 0.75rem 0.25rem', fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              内置网络
            </div>
            {builtInChains.map(chain => (
              <ChainRow key={chain.chainId} chain={chain} active={chain.chainId === chainId}
                onSelect={() => handleSelectChain(chain.chainId)}
                onEdit={() => openEditChain(chain)} />
            ))}

            {customChains.length > 0 && (
              <>
                <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '0.25rem 0' }} />
                <div style={{ padding: '0.4rem 0.75rem 0.25rem', fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  自定义网络
                </div>
                {customChains.map(chain => (
                  <ChainRow key={chain.chainId} chain={chain} active={chain.chainId === chainId}
                    onSelect={() => handleSelectChain(chain.chainId)}
                    onEdit={() => openEditChain(chain)} />
                ))}
              </>
            )}

            <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '0.25rem 0' }} />
            <button
              onClick={() => { setOpen(false); setShowAddChain(true) }}
              style={{
                width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none',
                textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', color: '#6366f1', fontWeight: 500,
              }}
            >
              + 添加自定义网络
            </button>
          </div>
        )}
      </div>

      {/* Edit chain modal */}
      <Modal isOpen={!!editChain} onClose={() => setEditChain(null)} title={`编辑 — ${editChain?.name}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="RPC URL">
            <input type="text" value={editForm.rpcUrl}
              onChange={e => setEditForm(f => ({ ...f, rpcUrl: e.target.value }))}
              placeholder={editChain ? (BUILT_IN_CHAINS[editChain.key]?.rpcUrl ?? editChain.rpcUrl) : ''}
              style={inputStyle} autoFocus />
            {editChain && BUILT_IN_CHAINS[editChain.key] && (
              <div style={hintStyle}>默认: {BUILT_IN_CHAINS[editChain.key].rpcUrl}</div>
            )}
          </Field>
          <Field label="BatchCallDelegation 合约地址">
            <input type="text" value={editForm.batchCallDelegation}
              onChange={e => setEditForm(f => ({ ...f, batchCallDelegation: e.target.value }))}
              placeholder="0x..." style={inputStyle} />
          </Field>
          <Field label="ERC20 Token 合约地址（可选）">
            <input type="text" value={editForm.erc20Token}
              onChange={e => setEditForm(f => ({ ...f, erc20Token: e.target.value }))}
              placeholder="0x..." style={inputStyle} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button onClick={() => setEditChain(null)} style={cancelBtnStyle}>取消</button>
          <button onClick={handleSaveChainEdit} style={saveBtnStyle}>保存</button>
        </div>
      </Modal>

      {/* Add custom chain modal */}
      <Modal isOpen={showAddChain} onClose={() => setShowAddChain(false)} title="添加自定义网络">
        <form onSubmit={handleAddChain}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Field label="网络名称 *">
              <input type="text" value={addChainForm.name}
                onChange={e => setAddChainForm(f => ({ ...f, name: e.target.value }))}
                placeholder="My Network" style={inputStyle} required />
            </Field>
            <Field label="链 ID *">
              <input type="number" value={addChainForm.chainId}
                onChange={e => setAddChainForm(f => ({ ...f, chainId: e.target.value }))}
                placeholder="1234" style={inputStyle} required />
            </Field>
            <Field label="RPC URL *">
              <input type="text" value={addChainForm.rpcUrl}
                onChange={e => setAddChainForm(f => ({ ...f, rpcUrl: e.target.value }))}
                placeholder="https://rpc.example.com" style={inputStyle} required />
            </Field>
            <Field label="区块浏览器 URL（可选）">
              <input type="text" value={addChainForm.explorerUrl}
                onChange={e => setAddChainForm(f => ({ ...f, explorerUrl: e.target.value }))}
                placeholder="https://explorer.example.com" style={inputStyle} />
            </Field>
          </div>
          {addChainError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.75rem' }}>{addChainError}</div>}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" onClick={() => setShowAddChain(false)} style={cancelBtnStyle}>取消</button>
            <button type="submit" style={saveBtnStyle}>添加</button>
          </div>
        </form>
      </Modal>
    </>
  )
}

const ChainRow = ({ chain, active, onSelect, onEdit }: {
  chain: ChainConfig; active: boolean; onSelect: () => void; onEdit: () => void
}) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.45rem 0.75rem',
    backgroundColor: active ? '#f5f3ff' : 'transparent',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, cursor: 'pointer' }} onClick={onSelect}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
        backgroundColor: active ? '#6366f1' : '#d1d5db', display: 'inline-block' }} />
      <span style={{ fontSize: '0.8rem', color: active ? '#4f46e5' : '#374151', fontWeight: active ? 600 : 400 }}>
        {chain.name}
      </span>
    </div>
    <button onClick={e => { e.stopPropagation(); onEdit() }} title="编辑链配置"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
        fontSize: '0.7rem', padding: '0 2px', lineHeight: 1 }}>
      ✎
    </button>
  </div>
)

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.375rem' }}>{label}</div>
    {children}
  </div>
)

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #e5e7eb',
  borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace', boxSizing: 'border-box', color: '#111',
}
const hintStyle: React.CSSProperties = { fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem', wordBreak: 'break-all' }
const saveBtnStyle: React.CSSProperties = {
  padding: '0.4rem 1rem', backgroundColor: '#4f46e5', color: '#fff',
  border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '0.4rem 1rem', backgroundColor: 'transparent', color: '#6b7280',
  border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem',
}
