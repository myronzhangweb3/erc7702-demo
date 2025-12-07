import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { Card } from '../components/Card'
import { CONFIG } from '../config'
import { privateKeyToAccount } from 'viem/accounts'

export const Home = () => {
  const { isConnected, connectWallet } = useWallet()
  const navigate = useNavigate()

  const [privateKey, setPrivateKey] = useState('')
  const [rpcUrl, setRpcUrl] = useState(CONFIG.DEFAULT_RPC_URL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!privateKey) {
        throw new Error('请输入私钥')
      }

      if (!rpcUrl) {
        throw new Error('请填写 RPC URL')
      }

      // 验证私钥格式并自动添加 0x 前缀
      let formattedPrivateKey = privateKey.trim()
      if (!formattedPrivateKey.startsWith('0x')) {
        formattedPrivateKey = '0x' + formattedPrivateKey
      }

      if (formattedPrivateKey.length !== 66) {
        throw new Error('私钥格式错误：必须为 64 位十六进制字符（可选 0x 前缀）')
      }

      // 验证私钥是否有效（尝试生成账户）
      try {
        privateKeyToAccount(formattedPrivateKey as `0x${string}`)
      } catch {
        throw new Error('私钥无效：请检查私钥格式')
      }

      await connectWallet(formattedPrivateKey, rpcUrl)
      navigate('/delegation')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  if (isConnected) {
    return (
      <div>
        <Card title="欢迎使用 ERC7702 Demo">
          <p style={{ fontSize: '1.125rem', lineHeight: '1.6', color: '#555' }}>
            您已成功登录。请使用导航栏访问各项功能：
          </p>
          <ul style={{ fontSize: '1rem', lineHeight: '1.8', color: '#555', marginTop: '1rem' }}>
            <li><strong>代理管理</strong> - 绑定或解绑EIP7702代理地址</li>
            <li><strong>Mint Token</strong> - 铸造ERC20代币</li>
            <li><strong>发送Native</strong> - 发送原生代币（支持批量）</li>
            <li><strong>发送ERC20</strong> - 发送ERC20代币（支持批量）</li>
          </ul>

          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#e7f3ff',
            borderRadius: '4px',
            borderLeft: '4px solid #007bff'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#004085' }}>
              什么是 EIP7702？
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#004085', lineHeight: '1.6' }}>
              EIP7702允许外部拥有账户（EOA）临时授权将其代码指向代理合约。
              这使得EOA可以像智能合约账户一样批量执行交易，同时保持对账户的完全控制。
            </p>
          </div>
        </Card>

        <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <Card title="合约配置">
            <div style={{ fontSize: '0.875rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#666', marginBottom: '0.25rem' }}>ERC20 Token</div>
                <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: '#333' }}>
                  {CONFIG.ERC20_TOKEN_ADDRESS}
                </div>
              </div>
              <div>
                <div style={{ color: '#666', marginBottom: '0.25rem' }}>BatchCall Delegation</div>
                <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: '#333' }}>
                  {CONFIG.BATCH_CALL_DELEGATION_CONTRACT_ADDRESS}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <Card title="登录 ERC7702 Demo">

      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: '#d1ecf1',
        borderRadius: '8px',
        fontSize: '0.875rem',
        lineHeight: '1.6',
        borderLeft: '4px solid #17a2b8'
      }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#0c5460' }}>
          使用步骤
        </h3>
        <ol style={{ margin: 0, paddingLeft: '1.5rem', color: '#0c5460' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>准备私钥：</strong>从您的以太坊钱包导出账户私钥
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>确保测试网余额：</strong>账户需要有 Sepolia 测试网 ETH（可从 <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#17a2b8', textDecoration: 'underline' }}>水龙头</a> 获取）
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>配置 RPC：</strong>输入 Sepolia 测试网的 RPC URL（或使用默认值）
          </li>
          <li>
            <strong>登录：</strong>输入私钥后点击登录按钮
          </li>
        </ol>
      </div>
      <form onSubmit={handleConnect}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>
            私钥 (Private Key) *
          </label>
          <input
            type="password"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="0x..."
            style={inputStyle}
            required
          />
          <div style={hintStyle}>
            输入您的以太坊账户私钥（64位十六进制字符，可选 0x 前缀）
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>
            RPC URL *
          </label>
          <input
            type="text"
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
            placeholder="https://eth-sepolia.g.alchemy.com/v2/demo"
            style={inputStyle}
            required
          />
          <div style={hintStyle}>
            输入区块链节点的RPC地址（Sepolia 测试网）
          </div>
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap'
          }}>
            {error}
          </div>
        )}

        <div style={{
          padding: '1rem',
          backgroundColor: '#fff3cd',
          borderRadius: '4px',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          lineHeight: '1.6',
          borderLeft: '4px solid #ffc107'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <strong style={{ color: '#856404' }}>⚠️ 重要提示：私钥安全</strong>
          </div>
          <p style={{ margin: 0, color: '#856404' }}>
            <strong>请注意：</strong>本应用需要您直接输入私钥以使用 EIP-7702 功能。
            您的私钥仅在浏览器本地使用，<strong>不会被上传或存储到任何服务器</strong>。
            请确保在安全的环境中使用本应用。
          </p>
        </div>

        <div style={{
          padding: '1rem',
          backgroundColor: '#e7f3ff',
          borderRadius: '4px',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          lineHeight: '1.6',
          borderLeft: '4px solid #007bff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <strong style={{ color: '#004085' }}>🔐 本地加密</strong>
          </div>
          <p style={{ margin: 0, color: '#004085' }}>
            本应用使用 <strong>viem</strong> 库在浏览器本地进行私钥签名操作，
            所有交易签名都在您的设备上完成，确保私钥安全。
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '1rem',
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: loading ? 'none' : '0 2px 4px rgba(0, 123, 255, 0.3)'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#0056b3'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.4)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#007bff'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.3)'
            }
          }}
        >
          {loading ? (
            '验证中...'
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              登录
            </>
          )}
        </button>
      </form>

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        fontSize: '0.875rem',
        color: '#555',
        lineHeight: '1.6'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
          合约配置
        </h3>
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ color: '#666', marginBottom: '0.25rem' }}>7702Test ERC20 Token:</div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', color: '#333' }}>
            {CONFIG.ERC20_TOKEN_ADDRESS}
          </div>
        </div>
        <div>
          <div style={{ color: '#666', marginBottom: '0.25rem' }}>BatchCall Delegation:</div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', color: '#333' }}>
            {CONFIG.BATCH_CALL_DELEGATION_CONTRACT_ADDRESS}
          </div>
        </div>
      </div>
    </Card>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: 'bold',
  color: '#333',
  fontSize: '0.875rem'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontFamily: 'monospace',
  boxSizing: 'border-box'
}

const hintStyle: React.CSSProperties = {
  marginTop: '0.25rem',
  fontSize: '0.75rem',
  color: '#666'
}
