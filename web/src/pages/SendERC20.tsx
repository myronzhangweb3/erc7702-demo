import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { Card } from '../components/Card'
import { CONFIG, getChainById } from '../config'
import { createPrivateKeyWalletClient, getErc20Balance } from '../utils/web3'
import { parseEther, encodeFunctionData, isAddress } from 'viem'
import { ERC20Abi, BatchCallDelegationAbi } from '../utils/abi'

interface TransferItem {
  to: string
  amount: string
}

export const SendERC20 = () => {
  const { txAccount, isDelegated, rpcUrl, chainId, updateDelegationStatus, privateKey } = useWallet()
  const [tokenAddress, setTokenAddress] = useState(CONFIG.ERC20_TOKEN_ADDRESS)
  const [transfers, setTransfers] = useState<TransferItem[]>([{ to: '', amount: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txHashes, setTxHashes] = useState<string[]>([])
  const [balance, setBalance] = useState('')

  const checkBalance = async () => {
    if (txAccount && isAddress(tokenAddress)) {
      const bal = await getErc20Balance(tokenAddress, txAccount, chainId, rpcUrl);
      setBalance(bal);
    }
  };

  useEffect(() => {
    checkBalance();
    const interval = setInterval(checkBalance, 5000);
    return () => clearInterval(interval);
  }, [txAccount, rpcUrl, chainId, tokenAddress]);

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
   * 发送ERC20代币（根据是否绑定代理使用不同方式）
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
        // 未绑定代理：使用普通ERC20转账
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
   * 使用代理合约批量发送ERC20
   */
  const sendWithDelegation = async () => {
    if (!txAccount) {
      throw new Error('未登录')
    }

    if (!privateKey) {
      throw new Error('私钥不存在，请重新登录')
    }

    console.log('使用代理合约批量发送ERC20...')

    // 构建批量调用数据
    const calls = transfers.map((transfer) => ({
      data: encodeFunctionData({
        abi: ERC20Abi,
        functionName: 'transfer',
        args: [transfer.to as `0x${string}`, parseEther(transfer.amount)],
      }),
      to: tokenAddress,
      value: parseEther('0'),
    }))

    console.log('批量调用数据:', calls)

    // 创建基于私钥的钱包客户端
    const walletClient = createPrivateKeyWalletClient(privateKey, chainId, rpcUrl)

    // 调用 execute 函数
    const hash = await walletClient.writeContract({
      address: txAccount, // 发送到自己（已代理的账户）
      abi: BatchCallDelegationAbi,
      functionName: 'execute',
      args: [calls],
    })

    console.log('批量转账交易已发送:', hash)

    setSuccess(
      `批量转账成功！共发送${transfers.length}笔交易。`
    )
    setTxHashes([hash])

    // 清空表单
    setTransfers([{ to: '', amount: '' }])
  }

  /**
   * 使用普通方式逐笔发送ERC20
   */
  const sendWithoutDelegation = async () => {
    if (!txAccount) {
      throw new Error('未登录')
    }

    if (!privateKey) {
      throw new Error('私钥不存在，请重新登录')
    }

    // 创建基于私钥的钱包客户端
    const walletClient = createPrivateKeyWalletClient(privateKey, chainId, rpcUrl)

    console.log('使用普通方式逐笔发送ERC20...')

    const hashes: string[] = []

    // 逐笔发送
    for (let i = 0; i < transfers.length; i++) {
      const transfer = transfers[i]
      console.log(`发送第${i + 1}笔转账...`, transfer)

      const txHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20Abi,
        functionName: 'transfer',
        args: [transfer.to as `0x${string}`, parseEther(transfer.amount)],
      })

      console.log(`第${i + 1}笔转账已发送:`, txHash)
      hashes.push(txHash)
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
      <Card title="发送 ERC20 Token">
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
              {balance ? `${balance} Tokens` : '加载中...'}
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
                您的账户未绑定代理，将使用普通ERC20转账方式逐笔发送。
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
          {/* Token 地址输入 */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #dee2e6'
          }}>
            <label style={labelStyle}>
              Token 合约地址
            </label>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value as `0x${string}`)}
              placeholder="0x..."
              style={inputStyle}
              required
            />
            <div style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: '#666'
            }}>
              默认为 7702TestToken 地址。如需发送其他 ERC20 代币，请修改此地址。
            </div>
          </div>

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
                <label style={labelStyle}>数量 (Token) *</label>
                <input
                  type="text"
                  value={transfer.amount}
                  onChange={(e) => updateTransfer(index, 'amount', e.target.value)}
                  placeholder="1.0"
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
