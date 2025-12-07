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
            ERC7702 Demo {gasFeePayer && `- Gas Fee Payer: ${gasFeePayer.slice(0, 6)}...${gasFeePayer.slice(-4)}`}
          </h1>

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
            {/* 左侧：账户地址 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: '1', minWidth: '300px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                  钱包地址
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
