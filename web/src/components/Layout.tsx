import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { CHAINS } from '../config'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const { isConnected, txAccount, isDelegated, disconnect, gasFeePayer, switchChain, chainId } = useWallet()

  const handleChainChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    switchChain(Number(event.target.value))
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* 导航栏 */}
      <nav style={{
        backgroundColor: '#fff',
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>
            ERC7702 Demo
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <a href="https://github.com/myronzhangweb3/erc7702-demo" target="_blank" rel="noopener noreferrer"
               style={{ color: '#333', display: 'flex', alignItems: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 0.297c-6.627 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.385 0.6.11 0.82-.26 0.82-.58 0-.285-0.01-1.04-0.015-2.04-3.338 0.724-4.042-1.61-4.042-1.61-0.545-1.385-1.328-1.75-1.328-1.75-1.087-0.745 0.083-0.73 0.083-0.73 1.205 0.085 1.838 1.238 1.838 1.238 1.07 1.835 2.809 1.305 3.492 0.998 0.108-0.775 0.418-1.305 0.762-1.605-2.665-0.3-5.466-1.332-5.466-5.93 0-1.31 0.465-2.38 1.235-3.22-0.135-0.303-0.54-1.523 0.115-3.175 0 0 1.005-0.322 3.3-1.22 0.955-0.26 1.98-0.39 3.005-0.39 1.025 0 2.05 0.13 3.005 0.39 2.295 0.898 3.3 1.22 3.3 1.22 0.655 1.652 0.25 2.872 0.115 3.175 0.77 0.84 1.235 1.91 1.235 3.22 0 4.58-2.804 5.625-5.475 5.92 0.43 0.375 0.82 1.12 0.82 2.275 0 1.64-0.015 2.96-0.015 3.36 0 0.32 0.218 0.69 0.825 0.57C20.565 22.18 24 17.68 24 12.297 24 5.373 18.627 0.297 12 0.297z"/>
              </svg>
            </a>

            {isConnected && (
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <Link to="/" style={navLinkStyle}>首页</Link>
                <Link to="/delegation" style={navLinkStyle}>代理管理</Link>
                <Link to="/mint" style={navLinkStyle}>Mint Token</Link>
                <Link to="/send-native" style={navLinkStyle}>发送Native</Link>
                <Link to="/send-erc20" style={navLinkStyle}>发送ERC20</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 状态栏 */}
      {isConnected && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 2rem',
          padding: '1rem 1.5rem',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: '1', minWidth: '300px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                  Chain
                </div>
                <select value={chainId} onChange={handleChainChange} style={{
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  color: '#333',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  border: '1px solid #ced4da',
                }}>
                  {Object.values(CHAINS).map(chain => (
                    <option key={chain.chainId} value={chain.chainId}>{chain.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                  交易地址
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  color: '#333',
                  fontWeight: 'bold'
                }}>
                  {txAccount ? `${txAccount.slice(0, 6)}...${txAccount.slice(-4)}` : ''}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                  GasPayer地址
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  color: '#333',
                  fontWeight: 'bold'
                }}>
                  {gasFeePayer ? `${gasFeePayer.slice(0, 6)}...${gasFeePayer.slice(-4)}` : '未配置'}
                </div>
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                backgroundColor: isDelegated ? '#d4edda' : '#fff3cd',
                color: isDelegated ? '#155724' : '#856404',
                border: isDelegated ? '2px solid #28a745' : '2px solid #ffc107'
              }}>
                <span style={{ fontSize: '1rem' }}>
                  {isDelegated ? '✓' : '○'}
                </span>
                代理{isDelegated ? '已绑定' : '未绑定'}
              </div>
            </div>

            {/* 右侧：断开连接按钮 */}
            <button
              onClick={disconnect}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#c82333'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#dc3545'
              }}
            >
              断开连接
            </button>
          </div>
        </div>
      )}

      {/* 主内容 */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1rem'
      }}>
        {children}
      </main>
    </div>
  )
}

const navLinkStyle: React.CSSProperties = {
  textDecoration: 'none',
  color: '#333',
  fontWeight: 500,
  transition: 'color 0.2s',
}
