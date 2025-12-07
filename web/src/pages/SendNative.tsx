import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { Card } from '../components/Card'
import { executeBatchCallsWithPrivateKey, parseEther, getPrivateKeySigner, getNativeBalance } from '../utils/ethers-web3'
import { BatchCallDelegationAbi } from '../utils/abi'
import { getChainById } from '../config'

interface TransferItem {
  to: string
  amount: string
}

export const SendNative = () => {
  const { txAccount, isDelegated, updateDelegationStatus, privateKey, rpcUrl, chainId } = useWallet()
  const [transfers, setTransfers] = useState<TransferItem[]>([{ to: '', amount: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txHashes, setTxHashes] = useState<string[]>([])
  const [balance, setBalance] = useState('')

  const checkBalance = async () => {
    if (txAccount && rpcUrl) {
      const bal = await getNativeBalance(txAccount, rpcUrl);
      setBalance(bal);
    }
  };

  useEffect(() => {
    checkBalance();
    const interval = setInterval(checkBalance, 5000);
    return () => clearInterval(interval);
  }, [txAccount, rpcUrl]);

  /**
   * 添加转账项
   */
  const addTransfer = () => {
    setTransfers([...transfers, { to: '', amount: '' }])
  }

  /**
   * 移除转账项
   */
  const removeTransfer = (index: number) => {
    setTransfers(transfers.filter((_, i) => i !== index))
  }

  /**
   * 更新转账项
   */
  const updateTransfer = (index: number, field: 'to' | 'amount', value: string) => {
    const newTransfers = [...transfers]
    newTransfers[index][field] = value
    setTransfers(newTransfers)
  }

  /**
   * 发送Native代币（根据是否绑定代理使用不同方式）
   */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setTxHashes([])
    setLoading(true)

    try {
      // 验证所有转账项
      for (const transfer of transfers) {
        if (!transfer.to || !transfer.amount) {
          throw new Error('请填写所有转账信息')
        }
      }

      if (isDelegated) {
        // 已绑定代理：使用BatchCallDelegation合约批量发送
        await sendWithDelegation()
      } else {
        // 未绑定代理：使用普通转账
        await sendWithoutDelegation()
      }
    } catch (err) {
      console.error('发送失败:', err)
      setError(err instanceof Error ? err.message : '发送失败')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 使用代理合约批量发送Native Token
   */
  const sendWithDelegation = async () => {
    if (!txAccount) {
      throw new Error('未登录')
    }

    if (!privateKey) {
      throw new Error('私钥不存在，请重新登录')
    }

    console.log('使用代理合约批量发送Native Token...')

    // 构建批量调用数据（Native转账不需要data）
    const calls = transfers.map((transfer) => ({
      data: '0x',
      to: transfer.to,
      value: parseEther(transfer.amount),
    }))

    console.log('批量调用数据:', calls)

    // 计算总金额
    const totalValue = transfers.reduce(
      (sum, transfer) => sum + parseEther(transfer.amount),
      BigInt(0)
    )

    // 使用私钥执行批量调用
    const hash = await executeBatchCallsWithPrivateKey(
      privateKey,
      rpcUrl,
      calls,
      BatchCallDelegationAbi,
      totalValue
    )

    console.log('批量转账交易已发送:', hash)

    setSuccess(
      `批量转账成功！共发送${transfers.length}笔交易。`
    )
    setTxHashes([hash])

    // 清空表单
    setTransfers([{ to: '', amount: '' }])
  }

  /**
   * 使用普通方式逐笔发送Native Token
   */
  const sendWithoutDelegation = async () => {
    if (!txAccount) {
      throw new Error('未登录')
    }

    if (!privateKey) {
      throw new Error('私钥不存在，请重新登录')
    }

    console.log('使用普通方式逐笔发送Native Token...')

    const signer = getPrivateKeySigner(privateKey, rpcUrl)
    const hashes: string[] = []

    // 逐笔发送
    for (let i = 0; i < transfers.length; i++) {
      const transfer = transfers[i]
      console.log(`发送第${i + 1}笔转账...`, transfer)

      const tx = await signer.sendTransaction({
        to: transfer.to,
        value: parseEther(transfer.amount),
      })

      console.log(`第${i + 1}笔转账已发送:`, tx.hash)
      hashes.push(tx.hash)
    }

    setSuccess(
      `转账成功！共发送${transfers.length}笔交易。`
    )
    setTxHashes(hashes)

    // 清空表单
    setTransfers([{ to: '', amount: '' }])
  }

  const chain = getChainById(chainId)

  return (
    <div>
      <Card title="发送 Native Token (ETH)">
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
              {balance ? `${balance} ETH` : '加载中...'}
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

        {/* 绑定状态提示 */}
        <div style={{
          padding: '1rem',
          backgroundColor: isDelegated ? '#d4edda' : '#fff3cd',
          borderRadius: '8px',
          marginBottom: '2rem',
          borderLeft: `4px solid ${isDelegated ? '#28a745' : '#ffc107'}`
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#333' }}>
            {isDelegated ? '✓ 已启用批量发送模式' : '⚠ 使用普通发送模式'}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#555', lineHeight: '1.6' }}>
            {isDelegated ? (
              <>
                您的账户已绑定代理，将使用BatchCallDelegation合约批量发送，
                可以在一笔交易中完成多笔转账，节省gas费用。
              </>
            ) : (
              <>
                您的账户未绑定代理，将使用普通转账方式逐笔发送。
                建议先在<a href="/delegation" style={{ color: '#856404', fontWeight: 'bold' }}>代理管理页面</a>绑定代理以启用批量发送功能。
              </>
            )}
          </div>
          <button
            onClick={updateDelegationStatus}
            style={{
              marginTop: '0.5rem',
              padding: '0.25rem 0.75rem',
              backgroundColor: 'transparent',
              color: '#333',
              border: '1px solid #333',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            刷新状态
          </button>
        </div>

        <form onSubmit={handleSend}>
          {/* 转账列表 */}
          {transfers.map((transfer, index) => (
            <div
              key={index}
              style={{
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid #dee2e6'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#333' }}>
                  转账 #{index + 1}
                </div>
                {transfers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTransfer(index)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    移除
                  </button>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>接收地址 *</label>
                <input
                  type="text"
                  value={transfer.to}
                  onChange={(e) => updateTransfer(index, 'to', e.target.value)}
                  placeholder="0x..."
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>数量 (ETH) *</label>
                <input
                  type="text"
                  value={transfer.amount}
                  onChange={(e) => updateTransfer(index, 'amount', e.target.value)}
                  placeholder="0.01"
                  style={inputStyle}
                  required
                />
              </div>
            </div>
          ))}

          {/* 添加转账按钮 */}
          <button
            type="button"
            onClick={addTransfer}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              color: '#333',
              border: '1px dashed #dee2e6',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              marginBottom: '1.5rem'
            }}
          >
            + 添加转账
          </button>

          {/* 总金额显示 */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#e7f3ff',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.875rem', color: '#004085' }}>总金额:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#004085' }}>
              {transfers.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0).toFixed(4)} ETH
            </span>
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
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              <strong>成功：</strong> {success}
              {txHashes.length > 0 && chain && (
                <div>
                  {txHashes.map((hash, index) => (
                    <div key={index}>
                      <a href={`${chain.explorerUrl}/tx/${hash}`} target="_blank" rel="noopener noreferrer">
                        查看交易 {index + 1}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#6c757d' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? '发送中...' : `发送 ${transfers.length} 笔转账`}
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
            发送模式对比
          </h3>
          <table style={{ width: '100%', fontSize: '0.875rem', color: '#004085' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', paddingBottom: '0.5rem' }}>特性</th>
                <th style={{ textAlign: 'left', paddingBottom: '0.5rem' }}>已绑定代理</th>
                <th style={{ textAlign: 'left', paddingBottom: '0.5rem' }}>未绑定代理</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ paddingTop: '0.5rem' }}>发送方式</td>
                <td style={{ paddingTop: '0.5rem' }}>批量（一笔交易）</td>
                <td style={{ paddingTop: '0.5rem' }}>逐笔（多笔交易）</td>
              </tr>
              <tr>
                <td style={{ paddingTop: '0.5rem' }}>Gas费用</td>
                <td style={{ paddingTop: '0.5rem' }}>低（共享固定费用）</td>
                <td style={{ paddingTop: '0.5rem' }}>高（每笔独立）</td>
              </tr>
              <tr>
                <td style={{ paddingTop: '0.5rem' }}>执行速度</td>
                <td style={{ paddingTop: '0.5rem' }}>快</td>
                <td style={{ paddingTop: '0.5rem' }}>慢</td>
              </tr>
              <tr>
                <td style={{ paddingTop: '0.5rem' }}>支付者</td>
                <td style={{ paddingTop: '0.5rem' }}>TxAccount</td>
                <td style={{ paddingTop: '0.5rem' }}>TxAccount</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', lineHeight: '1.6' }}>
            <strong>注意：</strong> 使用代理模式时，Native Token从txAccount账户发出，
            但gas费用由txAccount账户支付。请确保两个账户都有足够的余额。
          </div>
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
