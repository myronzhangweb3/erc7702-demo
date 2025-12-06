import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { Card } from '../components/Card'
import { CONFIG } from '../config'
import { createPrivateKeyWalletClient, createCustomPublicClient } from '../utils/web3'
import { parseEther, formatEther } from 'viem'
import { ERC20Abi } from '../utils/abi'

export const MintToken = () => {
  const { txAccount, rpcUrl, chainId, privateKey } = useWallet()
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [balance, setBalance] = useState<string>('')

  /**
   * 铸造ERC20代币
   */
  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // 使用txAccount或用户输入的地址
      const recipient = (recipientAddress || txAccount) as `0x${string}`
      if (!recipient) {
        throw new Error('请输入接收地址')
      }

      if (!txAccount) {
        throw new Error('未登录')
      }

      if (!privateKey) {
        throw new Error('私钥不存在，请重新登录')
      }

      // 创建基于私钥的钱包客户端
      const walletClient = createPrivateKeyWalletClient(privateKey, chainId, rpcUrl)

      console.log('开始Mint ERC20代币...')
      console.log('接收地址:', recipient)
      console.log('数量:', amount)

      // 调用ERC20的mint函数
      const txHash = await walletClient.writeContract({
        address: CONFIG.ERC20_TOKEN_ADDRESS,
        abi: ERC20Abi,
        functionName: 'mint',
        args: [recipient, parseEther(amount)],
      })

      console.log('Mint交易已发送:', txHash)

      setSuccess(`Mint成功！交易哈希: ${txHash}`)

      // 清空表单
      setAmount('')
      if (recipientAddress) {
        setRecipientAddress('')
      }

      // 刷新余额
      setTimeout(() => {
        checkBalance()
      }, 2000)
    } catch (err) {
      console.error('Mint失败:', err)
      setError(err instanceof Error ? err.message : 'Mint失败')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 查询余额
   */
  const checkBalance = async () => {
    if (!txAccount) return

    try {
      const publicClient = createCustomPublicClient(chainId, rpcUrl)

      const balance = await publicClient.readContract({
        address: CONFIG.ERC20_TOKEN_ADDRESS,
        abi: ERC20Abi,
        functionName: 'balanceOf',
        args: [txAccount],
      }) as bigint

      setBalance(formatEther(balance))
    } catch (err) {
      console.error('查询余额失败:', err)
    }
  }

  return (
    <div>
      <Card title="Mint ERC20 Token">
        {/* 余额显示 */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
              当前余额
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
              {balance ? `${balance} Tokens` : '点击刷新查看'}
            </div>
          </div>
          <button
            onClick={checkBalance}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            刷新余额
          </button>
        </div>

        <form onSubmit={handleMint}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>
              接收地址（留空则为自己）
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder={txAccount || '0x...'}
              style={inputStyle}
            />
            <div style={hintStyle}>
              留空将Mint到当前txAccount地址
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>
              数量（Token） *
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1.0"
              style={inputStyle}
              required
            />
            <div style={hintStyle}>
              要铸造的代币数量（以Ether为单位，如1.0表示1个Token）
            </div>
          </div>

          {/* 快捷按钮 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
              快捷选择:
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['0.1', '1', '10', '100'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f8f9fa',
                    color: '#333',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              <strong>错误：</strong> {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#d4edda',
              color: '#155724',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              wordBreak: 'break-all'
            }}>
              <strong>成功：</strong> {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#6c757d' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Minting...' : 'Mint Token'}
          </button>
        </form>

        {/* 说明 */}
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          backgroundColor: '#e7f3ff',
          borderRadius: '8px',
          borderLeft: '4px solid #007bff'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#004085' }}>
            关于 Mint
          </h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#004085', lineHeight: '1.8' }}>
            <li>Mint操作会铸造新的ERC20代币</li>
            <li>此操作使用普通的ERC20 mint函数，无需绑定代理</li>
            <li>Gas费用由txAccount支付</li>
            <li>代币合约地址: {CONFIG.ERC20_TOKEN_ADDRESS}</li>
            <li>代币精度为18位（与ETH相同）</li>
          </ul>
        </div>
      </Card>
    </div>
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
