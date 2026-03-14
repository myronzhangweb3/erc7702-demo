import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { ChainSelector } from './ChainSelector'
import { WalletSwitcher } from './WalletSwitcher'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const { isConnected, isDelegated, disconnect, gasFeePayer, txAccount } = useWallet()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Nav bar */}
      <nav style={{
        backgroundColor: '#fff',
        padding: '0.75rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
        }}>
          {/* Left: chain selector + app title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ChainSelector />
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#333', whiteSpace: 'nowrap' }}>
              ERC7702 Demo
            </span>
          </div>

          {/* Center: nav links */}
          {isConnected && (
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <Link to="/" style={navLinkStyle}>首页</Link>
              <Link to="/send" style={navLinkStyle}>发送交易</Link>
              <Link to="/delegation" style={navLinkStyle}>7702 管理</Link>
              <Link to="/mint" style={navLinkStyle}>工具</Link>
            </div>
          )}

          {/* Right: wallet switcher + github + disconnect */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <WalletSwitcher />

            <a
              href="https://github.com/myronzhangweb3/erc7702-demo"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#555', display: 'flex', alignItems: 'center' }}
              title="GitHub"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0.297c-6.627 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.385 0.6.11 0.82-.26 0.82-.58 0-.285-0.01-1.04-0.015-2.04-3.338 0.724-4.042-1.61-4.042-1.61-0.545-1.385-1.328-1.75-1.328-1.75-1.087-0.745 0.083-0.73 0.083-0.73 1.205 0.085 1.838 1.238 1.838 1.238 1.07 1.835 2.809 1.305 3.492 0.998 0.108-0.775 0.418-1.305 0.762-1.605-2.665-0.3-5.466-1.332-5.466-5.93 0-1.31 0.465-2.38 1.235-3.22-0.135-0.303-0.54-1.523 0.115-3.175 0 0 1.005-0.322 3.3-1.22 0.955-0.26 1.98-0.39 3.005-0.39 1.025 0 2.05 0.13 3.005 0.39 2.295 0.898 3.3 1.22 3.3 1.22 0.655 1.652 0.25 2.872 0.115 3.175 0.77 0.84 1.235 1.91 1.235 3.22 0 4.58-2.804 5.625-5.475 5.92 0.43 0.375 0.82 1.12 0.82 2.275 0 1.64-0.015 2.96-0.015 3.36 0 0.32 0.218 0.69 0.825 0.57C20.565 22.18 24 17.68 24 12.297 24 5.373 18.627 0.297 12 0.297z"/>
              </svg>
            </a>

            {isConnected && (
              <button
                onClick={disconnect}
                style={{
                  padding: '0.4rem 1rem',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                }}
              >
                退出
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Status bar (shown when connected) */}
      {isConnected && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 1.5rem',
          padding: '0.75rem 1.25rem',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.15rem' }}>交易地址</div>
            <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#374151', fontWeight: 600 }}>
              {txAccount ? `${txAccount.slice(0, 6)}...${txAccount.slice(-4)}` : '—'}
            </div>
          </div>

          {gasFeePayer && (
            <div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.15rem' }}>Gas Payer</div>
              <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#374151', fontWeight: 600 }}>
                {`${gasFeePayer.slice(0, 6)}...${gasFeePayer.slice(-4)}`}
              </div>
            </div>
          )}

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.875rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
            backgroundColor: isDelegated ? '#d4edda' : '#fff3cd',
            color: isDelegated ? '#155724' : '#856404',
            border: isDelegated ? '1.5px solid #28a745' : '1.5px solid #ffc107',
          }}>
            {isDelegated ? '✓' : '○'} 代理{isDelegated ? '已绑定' : '未绑定'}
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        {children}
      </main>
    </div>
  )
}

const navLinkStyle: React.CSSProperties = {
  textDecoration: 'none',
  color: '#374151',
  fontWeight: 500,
  fontSize: '0.9rem',
  transition: 'color 0.2s',
}
