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
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      {/* Nav */}
      <nav style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #f0f0f0',
        padding: '0 1.5rem',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
      }}>
        <div style={{
          maxWidth: '1100px', width: '100%', margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
        }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ChainSelector />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>
              ERC7702
            </span>
          </div>

          {/* Center nav links */}
          {isConnected && (
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <NavLink to="/">首页</NavLink>
              <NavLink to="/send">发送</NavLink>
              <NavLink to="/delegation">7702 管理</NavLink>
              <NavLink to="/mint">工具</NavLink>
            </div>
          )}

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <WalletSwitcher />
            <a
              href="https://github.com/myronzhangweb3/erc7702-demo"
              target="_blank" rel="noopener noreferrer"
              style={{ color: '#9ca3af', display: 'flex', alignItems: 'center' }}
              title="GitHub"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0.297c-6.627 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.385 0.6.11 0.82-.26 0.82-.58 0-.285-0.01-1.04-0.015-2.04-3.338 0.724-4.042-1.61-4.042-1.61-0.545-1.385-1.328-1.75-1.328-1.75-1.087-0.745 0.083-0.73 0.083-0.73 1.205 0.085 1.838 1.238 1.838 1.238 1.07 1.835 2.809 1.305 3.492 0.998 0.108-0.775 0.418-1.305 0.762-1.605-2.665-0.3-5.466-1.332-5.466-5.93 0-1.31 0.465-2.38 1.235-3.22-0.135-0.303-0.54-1.523 0.115-3.175 0 0 1.005-0.322 3.3-1.22 0.955-0.26 1.98-0.39 3.005-0.39 1.025 0 2.05 0.13 3.005 0.39 2.295 0.898 3.3 1.22 3.3 1.22 0.655 1.652 0.25 2.872 0.115 3.175 0.77 0.84 1.235 1.91 1.235 3.22 0 4.58-2.804 5.625-5.475 5.92 0.43 0.375 0.82 1.12 0.82 2.275 0 1.64-0.015 2.96-0.015 3.36 0 0.32 0.218 0.69 0.825 0.57C20.565 22.18 24 17.68 24 12.297 24 5.373 18.627 0.297 12 0.297z"/>
              </svg>
            </a>
            {isConnected && (
              <button onClick={disconnect} style={{
                padding: '0.3rem 0.75rem',
                background: 'none', border: '1px solid #e5e7eb',
                borderRadius: '6px', cursor: 'pointer',
                fontSize: '0.75rem', color: '#6b7280',
              }}>
                退出
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Status bar */}
      {isConnected && (
        <div style={{
          maxWidth: '1100px', margin: '0.75rem auto 0',
          padding: '0 1.5rem',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1.25rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#fff', border: '1px solid #f0f0f0',
            borderRadius: '8px', fontSize: '0.75rem',
          }}>
            <StatusItem label="交易地址">
              {txAccount ? `${txAccount.slice(0, 6)}...${txAccount.slice(-4)}` : '—'}
            </StatusItem>
            {gasFeePayer && (
              <StatusItem label="Gas Payer">
                {`${gasFeePayer.slice(0, 6)}...${gasFeePayer.slice(-4)}`}
              </StatusItem>
            )}
            <div style={{
              padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 600,
              backgroundColor: isDelegated ? '#ecfdf5' : '#fffbeb',
              color: isDelegated ? '#059669' : '#d97706',
              fontSize: '0.7rem',
            }}>
              {isDelegated ? '✓ 代理已绑定' : '○ 代理未绑定'}
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main style={{ maxWidth: '1100px', margin: '1rem auto', padding: '0 1.5rem' }}>
        {children}
      </main>
    </div>
  )
}

const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link to={to} style={{
    textDecoration: 'none', color: '#374151',
    fontWeight: 500, fontSize: '0.82rem',
    padding: '0.3rem 0.65rem', borderRadius: '5px',
    transition: 'background 0.15s',
  }}
    onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
  >
    {children}
  </Link>
)

const StatusItem = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div style={{ color: '#9ca3af', fontSize: '0.65rem', marginBottom: '0.1rem' }}>{label}</div>
    <div style={{ fontFamily: 'monospace', color: '#374151', fontWeight: 600 }}>{children}</div>
  </div>
)
