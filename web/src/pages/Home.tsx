import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { Card } from '../components/Card'
import { getContractAddressesForChain } from '../config'
import { privateKeyToAccount } from 'viem/accounts'

export const Home = () => {
  const {
    isConnected, isUnlocked, storedWallets, chainId, gasFeePayer,
    unlockWallets, addWallet, selectWallet, setGasFeePayer, clearGasFeePayer, webCryptoAvailable,
  } = useWallet()
  const navigate = useNavigate()

  // ── State ──────────────────────────────────────────────────────────────────
  const [password, setPassword] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [unlockLoading, setUnlockLoading] = useState(false)

  const [addName, setAddName] = useState('')
  const [addKey, setAddKey] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addPasswordConfirm, setAddPasswordConfirm] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const [gasPayerKey, setGasPayerKey] = useState('')
  const [gasPayerError, setGasPayerError] = useState('')
  const [gasPayerLoading, setGasPayerLoading] = useState(false)

  const contracts = getContractAddressesForChain(chainId)
  const hasStoredWallets = storedWallets.length > 0

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleUnlockAndSelect = async (e: React.FormEvent) => {
    e.preventDefault()
    setUnlockError('')
    setUnlockLoading(true)
    try {
      const ok = await unlockWallets(password)
      if (!ok) { setUnlockError('密码错误，请重试'); return }
      // Auto-select first stored wallet
      if (storedWallets.length > 0) {
        await selectWallet(storedWallets[0].id)
      }
      navigate('/delegation')
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : '解锁失败')
    } finally {
      setUnlockLoading(false)
    }
  }

  const handleAddFirstWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    if (addPassword !== addPasswordConfirm) { setAddError('两次密码不一致'); return }
    if (addPassword.length < 6) { setAddError('密码至少 6 位'); return }

    let formattedKey = addKey.trim()
    if (!formattedKey.startsWith('0x')) formattedKey = '0x' + formattedKey
    if (formattedKey.length !== 66) { setAddError('私钥格式错误：必须为 64 位十六进制字符'); return }
    try {
      privateKeyToAccount(formattedKey as `0x${string}`)
    } catch {
      setAddError('私钥无效，请检查格式')
      return
    }

    setAddLoading(true)
    try {
      await addWallet(addName || '我的钱包', formattedKey, addPassword)
      navigate('/delegation')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : '添加失败')
    } finally {
      setAddLoading(false)
    }
  }

  const handleSetGasPayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setGasPayerError('')
    setGasPayerLoading(true)
    try {
      await setGasFeePayer(gasPayerKey)
      setGasPayerKey('')
    } catch (err) {
      setGasPayerError(err instanceof Error ? err.message : '设置失败')
    } finally {
      setGasPayerLoading(false)
    }
  }

  // ── Web Crypto not available ───────────────────────────────────────────────
  if (!webCryptoAvailable) {
    return (
      <Card title="不支持的环境">
        <div style={{ padding: '1rem', backgroundColor: '#f8d7da', borderRadius: '8px', color: '#721c24' }}>
          <strong>⚠️ 需要安全上下文</strong>
          <p style={{ margin: '0.5rem 0 0' }}>
            本应用需要 Web Crypto API（需要 HTTPS 或 localhost 环境）。请通过 HTTPS 访问。
          </p>
        </div>
      </Card>
    )
  }

  // ── Connected dashboard ───────────────────────────────────────────────────
  if (isConnected && isUnlocked) {
    return (
      <div>
        <Card title="欢迎使用 ERC7702 Demo">
          <p style={{ fontSize: '1rem', lineHeight: '1.6', color: '#555' }}>
            您已成功登录。请使用导航栏访问各项功能：
          </p>
          <ul style={{ fontSize: '1rem', lineHeight: '1.9', color: '#555', marginTop: '1rem', marginLeft: '2rem' }}>
            <li><strong>发送交易</strong> — 发送原生代币或 ERC20 代币（支持批量）</li>
            <li><strong>7702 授权管理</strong> — 绑定或解绑 EIP-7702 代理合约</li>
            <li><strong>工具</strong> — Mint ERC20 测试代币</li>
          </ul>
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#e7f3ff', borderRadius: '8px', borderLeft: '4px solid #007bff' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#004085' }}>什么是 EIP-7702？</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#004085', lineHeight: '1.6' }}>
              EIP-7702 允许 EOA 临时将代码指向代理合约，使其可像智能合约账户一样批量执行交易，同时保持对私钥的完全控制。
            </p>
          </div>
        </Card>

        <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <Card title="当前链合约配置">
            <div style={{ fontSize: '0.875rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#666', marginBottom: '0.25rem' }}>ERC20 Token</div>
                <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: contracts.erc20Token ? '#333' : '#aaa' }}>
                  {contracts.erc20Token || '未配置（可在链选择器中设置）'}
                </div>
              </div>
              <div>
                <div style={{ color: '#666', marginBottom: '0.25rem' }}>BatchCall Delegation</div>
                <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: contracts.batchCallDelegation ? '#333' : '#aaa' }}>
                  {contracts.batchCallDelegation || '未配置（可在链选择器中设置）'}
                </div>
              </div>
            </div>
          </Card>

          {/* Gas Payer config */}
          <Card title="Gas Fee Payer（可选）">
            {gasFeePayer ? (
              <div style={{ fontSize: '0.875rem' }}>
                <div style={{ color: '#666', marginBottom: '0.5rem' }}>当前配置</div>
                <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: '#333', marginBottom: '1rem' }}>
                  {gasFeePayer}
                </div>
                <button onClick={clearGasFeePayer} style={dangerSmallBtnStyle}>清除 Gas Payer</button>
              </div>
            ) : (
              <form onSubmit={handleSetGasPayer}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <input
                    type="password" value={gasPayerKey}
                    onChange={e => setGasPayerKey(e.target.value)}
                    placeholder="输入 Gas Payer 私钥"
                    style={inputStyle}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                    用于代付 Gas 费的独立账户私钥，加密存储
                  </div>
                </div>
                {gasPayerError && <div style={{ color: '#dc3545', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{gasPayerError}</div>}
                <button type="submit" disabled={!gasPayerKey || gasPayerLoading} style={primarySmallBtnStyle}>
                  {gasPayerLoading ? '设置中...' : '设置'}
                </button>
              </form>
            )}
          </Card>
        </div>
      </div>
    )
  }

  // ── No stored wallets → First-time setup ──────────────────────────────────
  if (!hasStoredWallets) {
    return (
      <Card title="欢迎使用 ERC7702 Demo">
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#d1ecf1', borderRadius: '8px', borderLeft: '4px solid #17a2b8' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#0c5460' }}>首次使用</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#0c5460', lineHeight: '1.6' }}>
            添加您的第一个钱包。私钥将使用您设置的密码加密后存储在本地，不会上传到任何服务器。
          </p>
        </div>

        <form onSubmit={handleAddFirstWallet}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>钱包名称</label>
            <input type="text" value={addName} onChange={e => setAddName(e.target.value)}
              placeholder="我的钱包" style={inputStyle} />
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              留空则使用"我的钱包"，名称后将自动附加地址
            </div>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>私钥 *</label>
            <input type="password" value={addKey} onChange={e => setAddKey(e.target.value)}
              placeholder="64位十六进制，可选 0x 前缀" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>设置密码 *（用于加密所有钱包）</label>
            <input type="password" value={addPassword} onChange={e => setAddPassword(e.target.value)}
              placeholder="至少 6 位" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>确认密码 *</label>
            <input type="password" value={addPasswordConfirm} onChange={e => setAddPasswordConfirm(e.target.value)}
              placeholder="再次输入密码" style={inputStyle} required />
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.8rem', lineHeight: '1.6', borderLeft: '4px solid #ffc107' }}>
            <strong style={{ color: '#856404' }}>⚠️ 重要：</strong>
            <span style={{ color: '#856404' }}>密码丢失将无法找回加密的私钥。请务必在其他地方备份您的私钥。</span>
          </div>

          {addError && <div style={{ color: '#dc3545', fontSize: '0.875rem', marginBottom: '1rem' }}>{addError}</div>}

          <button type="submit" disabled={addLoading} style={submitBtnStyle}>
            {addLoading ? '创建中...' : '创建并进入'}
          </button>
        </form>
      </Card>
    )
  }

  // ── Has stored wallets → Unlock screen ────────────────────────────────────
  return (
    <Card title="解锁钱包">
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
          已存储 {storedWallets.length} 个钱包，输入密码解锁：
        </div>
        {storedWallets.map(w => (
          <div key={w.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.75rem', backgroundColor: '#f8f9fa', borderRadius: '6px', marginBottom: '0.5rem',
          }}>
            <span style={{ fontSize: '1.25rem' }}>👛</span>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#333' }}>{w.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'monospace' }}>{w.address}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleUnlockAndSelect}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>密码</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="输入密码" style={inputStyle} required autoFocus
          />
        </div>
        {unlockError && <div style={{ color: '#dc3545', fontSize: '0.875rem', marginBottom: '1rem' }}>{unlockError}</div>}

        <button type="submit" disabled={unlockLoading} style={submitBtnStyle}>
          {unlockLoading ? '解锁中...' : '解锁'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '0.8rem', color: '#666', lineHeight: 1.6 }}>
        <strong>忘记密码？</strong> 密码无法找回。如果您有私钥备份，可清除浏览器本地存储后重新添加钱包。
      </div>
    </Card>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.375rem', fontWeight: 600, color: '#333', fontSize: '0.875rem' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.875rem', fontFamily: 'monospace', boxSizing: 'border-box' }
const submitBtnStyle: React.CSSProperties = { width: '100%', padding: '0.875rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }
const primarySmallBtnStyle: React.CSSProperties = { padding: '0.4rem 1rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }
const dangerSmallBtnStyle: React.CSSProperties = { padding: '0.4rem 1rem', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }
