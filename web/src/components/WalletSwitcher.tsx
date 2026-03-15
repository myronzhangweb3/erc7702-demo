import { useState, useRef, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { Modal } from './Modal'

export const WalletSwitcher = () => {
  const {
    currentWalletName, currentWalletId, storedWallets,
    selectWallet, removeWallet, addWallet, isUnlocked,
  } = useWallet()
  const [open, setOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', privateKey: '' })
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!isUnlocked) return null

  const handleSelect = async (walletId: string) => {
    if (walletId === currentWalletId) { setOpen(false); return }
    setOpen(false)
    setSwitching(true)
    try {
      await selectWallet(walletId)
    } catch (e) {
      console.error('切换钱包失败:', e)
    } finally {
      setSwitching(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    setAddLoading(true)
    try {
      await addWallet(addForm.name, addForm.privateKey)
      setShowAdd(false)
      setAddForm({ name: '', privateKey: '' })
    } catch (err) {
      setAddError(err instanceof Error ? err.message : '添加失败')
    } finally {
      setAddLoading(false)
    }
  }

  const handleDelete = (walletId: string) => {
    removeWallet(walletId)
    setDeleteConfirm(null)
  }

  const displayName = switching ? '切换中...' : (currentWalletName ?? '选择钱包')

  return (
    <>
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 0.75rem', backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0', borderRadius: '6px',
            cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#166534',
            maxWidth: '200px',
          }}
        >
          <span style={{ fontSize: '0.875rem' }}>👛</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          <span style={{ fontSize: '0.625rem', flexShrink: 0 }}>▼</span>
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: '110%', right: 0, zIndex: 200,
            backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '240px',
            maxHeight: '360px', overflowY: 'auto',
          }}>
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>
              我的钱包
            </div>

            {storedWallets.map(wallet => (
              <div
                key={wallet.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.6rem 1rem',
                  backgroundColor: wallet.id === currentWalletId ? '#f0fdf4' : 'transparent',
                }}
              >
                <div
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => handleSelect(wallet.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: wallet.id === currentWalletId ? '#16a34a' : '#d1d5db',
                      display: 'inline-block',
                    }} />
                    <span style={{
                      fontSize: '0.875rem',
                      color: wallet.id === currentWalletId ? '#166534' : '#333',
                      fontWeight: wallet.id === currentWalletId ? 600 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: '160px',
                    }}>
                      {wallet.name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setDeleteConfirm(wallet.id); setOpen(false) }}
                  title="删除钱包"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.875rem', padding: '0 4px', flexShrink: 0 }}
                >
                  🗑
                </button>
              </div>
            ))}

            <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '0.25rem 0' }} />
            <button
              onClick={() => { setOpen(false); setShowAdd(true) }}
              style={{
                width: '100%', padding: '0.6rem 1rem', background: 'none', border: 'none',
                textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', color: '#2563eb', fontWeight: 500,
              }}
            >
              + 添加钱包
            </button>
          </div>
        )}
      </div>

      {/* Add wallet modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="添加钱包">
        <form onSubmit={handleAdd}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>钱包名称 *</label>
            <input
              type="text" value={addForm.name}
              onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              placeholder="测试钱包" style={inputStyle} required
            />
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              最终名称将自动附加钱包地址，如：测试钱包(0xABCD...1234)
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>私钥 *</label>
            <input
              type="password" value={addForm.privateKey}
              onChange={e => setAddForm(f => ({ ...f, privateKey: e.target.value }))}
              placeholder="0x..." style={inputStyle} required
            />
          </div>
          {addError && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginBottom: '1rem' }}>{addError}</div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowAdd(false)} style={secondaryBtnStyle}>取消</button>
            <button type="submit" disabled={addLoading} style={{ ...primaryBtnStyle, opacity: addLoading ? 0.7 : 1 }}>
              {addLoading ? '添加中...' : '添加'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="删除钱包">
        <p style={{ color: '#374151', marginBottom: '1.5rem' }}>
          确认删除此钱包？此操作不可撤销，请确保已备份私钥。
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setDeleteConfirm(null)} style={secondaryBtnStyle}>取消</button>
          <button
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            style={{ ...primaryBtnStyle, backgroundColor: '#dc3545' }}
          >
            确认删除
          </button>
        </div>
      </Modal>
    </>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.375rem', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'monospace' }
const primaryBtnStyle: React.CSSProperties = { padding: '0.5rem 1.25rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }
const secondaryBtnStyle: React.CSSProperties = { padding: '0.5rem 1.25rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }
