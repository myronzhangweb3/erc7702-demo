import { useState, useRef, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { getAllChains, BUILT_IN_CHAINS } from '../utils/chain'
import { ChainConfig } from '../types'
import { saveCustomChain, saveRpcOverride } from '../utils/storage'
import { Modal } from './Modal'

export const ChainSelector = () => {
  const { chainId, switchChain } = useWallet()
  const [open, setOpen] = useState(false)
  const [showAddChain, setShowAddChain] = useState(false)
  const [editRpcChain, setEditRpcChain] = useState<ChainConfig | null>(null)
  const [newRpcUrl, setNewRpcUrl] = useState('')
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
    try {
      await switchChain(id)
    } finally {
      setSwitching(false)
    }
  }

  const handleSaveRpcOverride = async () => {
    if (!editRpcChain || !newRpcUrl.trim()) return
    saveRpcOverride(editRpcChain.chainId, newRpcUrl.trim())
    setEditRpcChain(null)
    await switchChain(editRpcChain.chainId)
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
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 0.75rem', backgroundColor: '#f0f4ff',
            border: '1px solid #c7d2fe', borderRadius: '6px',
            cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#3730a3',
          }}
        >
          <span style={{ fontSize: '0.75rem' }}>⛓</span>
          {switching ? '切换中...' : (currentChain?.name ?? '选择链')}
          <span style={{ fontSize: '0.625rem', marginLeft: '2px' }}>▼</span>
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: '110%', left: 0, zIndex: 200,
            backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '220px',
            maxHeight: '400px', overflowY: 'auto',
          }}>
            {/* Built-in chains */}
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>
              内置网络
            </div>
            {builtInChains.map(chain => (
              <ChainRow
                key={chain.chainId}
                chain={chain}
                active={chain.chainId === chainId}
                onSelect={() => handleSelectChain(chain.chainId)}
                onEditRpc={() => { setEditRpcChain(chain); setNewRpcUrl(chain.rpcUrl); setOpen(false) }}
              />
            ))}

            {/* Custom chains */}
            {customChains.length > 0 && (
              <>
                <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '0.25rem 0' }} />
                <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>
                  自定义网络
                </div>
                {customChains.map(chain => (
                  <ChainRow
                    key={chain.chainId}
                    chain={chain}
                    active={chain.chainId === chainId}
                    onSelect={() => handleSelectChain(chain.chainId)}
                    onEditRpc={() => { setEditRpcChain(chain); setNewRpcUrl(chain.rpcUrl); setOpen(false) }}
                  />
                ))}
              </>
            )}

            <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '0.25rem 0' }} />
            <button
              onClick={() => { setOpen(false); setShowAddChain(true) }}
              style={{
                width: '100%', padding: '0.6rem 1rem', background: 'none', border: 'none',
                textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', color: '#2563eb',
                fontWeight: 500,
              }}
            >
              + 添加自定义网络
            </button>
          </div>
        )}
      </div>

      {/* Edit RPC URL modal */}
      <Modal isOpen={!!editRpcChain} onClose={() => setEditRpcChain(null)} title={`修改 RPC — ${editRpcChain?.name}`}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>RPC URL</label>
          <input
            type="text" value={newRpcUrl} onChange={e => setNewRpcUrl(e.target.value)}
            placeholder="https://..." style={inputStyle} autoFocus
          />
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            默认: {editRpcChain ? BUILT_IN_CHAINS[editRpcChain.key]?.rpcUrl ?? editRpcChain.rpcUrl : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setEditRpcChain(null)} style={secondaryBtnStyle}>取消</button>
          <button onClick={handleSaveRpcOverride} style={primaryBtnStyle}>保存</button>
        </div>
      </Modal>

      {/* Add custom chain modal */}
      <Modal isOpen={showAddChain} onClose={() => setShowAddChain(false)} title="添加自定义网络">
        <form onSubmit={handleAddChain}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>网络名称 *</label>
            <input type="text" value={addChainForm.name}
              onChange={e => setAddChainForm(f => ({ ...f, name: e.target.value }))}
              placeholder="My Network" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>链 ID *</label>
            <input type="number" value={addChainForm.chainId}
              onChange={e => setAddChainForm(f => ({ ...f, chainId: e.target.value }))}
              placeholder="1234" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>RPC URL *</label>
            <input type="text" value={addChainForm.rpcUrl}
              onChange={e => setAddChainForm(f => ({ ...f, rpcUrl: e.target.value }))}
              placeholder="https://rpc.example.com" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>区块浏览器 URL（可选）</label>
            <input type="text" value={addChainForm.explorerUrl}
              onChange={e => setAddChainForm(f => ({ ...f, explorerUrl: e.target.value }))}
              placeholder="https://explorer.example.com" style={inputStyle} />
          </div>
          {addChainError && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginBottom: '1rem' }}>{addChainError}</div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowAddChain(false)} style={secondaryBtnStyle}>取消</button>
            <button type="submit" style={primaryBtnStyle}>添加</button>
          </div>
        </form>
      </Modal>
    </>
  )
}

const ChainRow = ({
  chain, active, onSelect, onEditRpc,
}: {
  chain: ChainConfig
  active: boolean
  onSelect: () => void
  onEditRpc: () => void
}) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.5rem 1rem', backgroundColor: active ? '#eff6ff' : 'transparent',
    cursor: 'pointer',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }} onClick={onSelect}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: active ? '#2563eb' : '#d1d5db', display: 'inline-block' }} />
      <span style={{ fontSize: '0.875rem', color: active ? '#2563eb' : '#333', fontWeight: active ? 600 : 400 }}>
        {chain.name}
      </span>
    </div>
    <button
      onClick={e => { e.stopPropagation(); onEditRpc() }}
      title="修改 RPC"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.75rem', padding: '0 4px' }}
    >
      ✎
    </button>
  </div>
)

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.375rem', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }
const primaryBtnStyle: React.CSSProperties = { padding: '0.5rem 1.25rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }
const secondaryBtnStyle: React.CSSProperties = { padding: '0.5rem 1.25rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }
