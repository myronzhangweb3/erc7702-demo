import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { Card } from '../components/Card'
import { getChainById, getContractAddressesForChain } from '../config'
import { createPrivateKeyWalletClient, executeBatchCalls } from '../utils/web3'
import { getNativeBalance } from '../utils/ethers-web3'
import { parseEther, encodeFunctionData, isAddress, Address, Hex } from 'viem'
import { ERC20Abi } from '../utils/abi'

interface TransferItem {
  to: string
  amount: string
}

export const Send = () => {
  const {
    txAccount, isDelegated, updateDelegationStatus,
    txAccountPrivateKey, gasFeePayerPrivateKey,
    rpcUrl, chainId,
  } = useWallet()

  const [tokenAddress, setTokenAddress] = useState('')
  const [transfers, setTransfers] = useState<TransferItem[]>([{ to: '', amount: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txHashes, setTxHashes] = useState<string[]>([])
  const [nativeBalance, setNativeBalance] = useState('')

  const isERC20 = tokenAddress.trim().length > 0
  const contracts = getContractAddressesForChain(chainId)
  const hasDelegationContract = !!contracts.batchCallDelegation

  // Pre-fill ERC20 token address from chain config
  useEffect(() => {
    setTokenAddress('')
  }, [chainId])

  const checkBalance = async () => {
    if (txAccount && rpcUrl) {
      try {
        const bal = await getNativeBalance(txAccount, rpcUrl)
        setNativeBalance(bal)
      } catch { /* ignore */ }
    }
  }

  useEffect(() => {
    checkBalance()
    const interval = setInterval(checkBalance, 8000)
    return () => clearInterval(interval)
  }, [txAccount, rpcUrl])

  const addTransfer = () => setTransfers(t => [...t, { to: '', amount: '' }])
  const removeTransfer = (i: number) => setTransfers(t => t.filter((_, idx) => idx !== i))
  const updateTransfer = (i: number, field: 'to' | 'amount', value: string) => {
    setTransfers(t => t.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const totalNative = transfers.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setTxHashes([])
    setLoading(true)

    try {
      if (isERC20 && !isAddress(tokenAddress)) throw new Error('请输入合法的 Token 合约地址')
      for (const t of transfers) {
        if (!t.to || !t.amount) throw new Error('请填写所有转账信息')
        if (!isAddress(t.to)) throw new Error(`接收地址 ${t.to} 不合法`)
      }

      if (isDelegated && hasDelegationContract) {
        isERC20 ? await sendERC20WithDelegation() : await sendNativeWithDelegation()
      } else {
        isERC20 ? await sendERC20Without() : await sendNativeWithout()
      }
    } catch (err) {
      console.error('发送失败:', err)
      setError(err instanceof Error ? err.message : '发送失败')
    } finally {
      setLoading(false)
    }
  }

  const sendNativeWithDelegation = async () => {
    if (!txAccount || !txAccountPrivateKey) throw new Error('未登录')
    const calls = transfers.map(t => ({
      data: '0x' as const,
      to: t.to as Address,
      value: parseEther(t.amount),
    }))
    const totalValue = transfers.reduce((s, t) => s + parseEther(t.amount), BigInt(0))
    const hash = await executeBatchCalls({ txAccountPrivateKey, rpcUrl, chainId, calls, txAccount, gasFeePayerPrivateKey, totalValue })
    setSuccess(`批量发送成功！共 ${transfers.length} 笔`)
    setTxHashes([hash])
    setTransfers([{ to: '', amount: '' }])
  }

  const sendNativeWithout = async () => {
    if (!txAccount || !txAccountPrivateKey) throw new Error('未登录')
    const senderKey = gasFeePayerPrivateKey || txAccountPrivateKey
    const walletClient = createPrivateKeyWalletClient(senderKey, chainId, rpcUrl)
    const hashes: string[] = []
    for (const t of transfers) {
      const tx = await walletClient.sendTransaction({ to: t.to as Address, value: parseEther(t.amount) })
      hashes.push(tx)
    }
    setSuccess(`发送成功！共 ${transfers.length} 笔`)
    setTxHashes(hashes)
    setTransfers([{ to: '', amount: '' }])
  }

  const sendERC20WithDelegation = async () => {
    if (!txAccount || !txAccountPrivateKey) throw new Error('未登录')
    const calls = transfers.map(t => ({
      data: encodeFunctionData({ abi: ERC20Abi, functionName: 'transfer', args: [t.to as Hex, parseEther(t.amount)] }),
      to: tokenAddress as Hex,
      value: BigInt(0),
    }))
    const hash = await executeBatchCalls({ txAccountPrivateKey, rpcUrl, chainId, calls, txAccount, gasFeePayerPrivateKey })
    setSuccess(`批量 ERC20 发送成功！共 ${transfers.length} 笔`)
    setTxHashes([hash])
    setTransfers([{ to: '', amount: '' }])
  }

  const sendERC20Without = async () => {
    if (!txAccount || !txAccountPrivateKey) throw new Error('未登录')
    const senderKey = gasFeePayerPrivateKey || txAccountPrivateKey
    const walletClient = createPrivateKeyWalletClient(senderKey, chainId, rpcUrl)
    const hashes: string[] = []
    for (const t of transfers) {
      const tx = await walletClient.writeContract({
        address: tokenAddress as Hex,
        abi: ERC20Abi,
        functionName: 'transfer',
        args: [t.to as Hex, parseEther(t.amount)],
      })
      hashes.push(tx)
    }
    setSuccess(`ERC20 发送成功！共 ${transfers.length} 笔`)
    setTxHashes(hashes)
    setTransfers([{ to: '', amount: '' }])
  }

  const chain = getChainById(chainId)

  return (
    <div>
      <Card title="发送交易">
        {/* Balance */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.75rem 1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '1.5rem',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>原生代币余额</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#333' }}>
              {nativeBalance ? `${nativeBalance} ${chain?.nativeCurrency?.symbol ?? 'ETH'}` : '加载中...'}
            </div>
          </div>
          <button onClick={checkBalance} style={smallBtnStyle}>刷新</button>
        </div>

        {/* Delegation status */}
        <div style={{
          padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem',
          backgroundColor: isDelegated ? '#d4edda' : '#fff3cd',
          borderLeft: `4px solid ${isDelegated ? '#28a745' : '#ffc107'}`,
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#333' }}>
            {isDelegated ? '✓ 批量发送模式（已绑定代理）' : '⚠ 逐笔发送模式（未绑定代理）'}
          </div>
          {!isDelegated && (
            <div style={{ fontSize: '0.8rem', color: '#555' }}>
              前往 <a href="/delegation" style={{ color: '#856404', fontWeight: 'bold' }}>7702 授权管理</a> 绑定代理以启用批量发送
            </div>
          )}
          {isDelegated && !hasDelegationContract && (
            <div style={{ fontSize: '0.8rem', color: '#856404', marginTop: '0.25rem' }}>
              当前链未配置 BatchCallDelegation 合约地址，将使用逐笔发送
            </div>
          )}
          <button onClick={updateDelegationStatus} style={{ ...smallBtnStyle, marginTop: '0.5rem' }}>刷新状态</button>
        </div>

        <form onSubmit={handleSend}>
          {/* Token address */}
          <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #dee2e6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <label style={labelStyle}>Token 合约地址</label>
              <span style={{
                padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                backgroundColor: isERC20 ? '#dbeafe' : '#f3f4f6',
                color: isERC20 ? '#1d4ed8' : '#6b7280',
              }}>
                {isERC20 ? 'ERC20' : 'Native'}
              </span>
            </div>
            <input
              type="text" value={tokenAddress}
              onChange={e => setTokenAddress(e.target.value)}
              placeholder="留空发送原生代币，填写合约地址发送 ERC20"
              style={inputStyle}
            />
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              留空 → 发送 {chain?.nativeCurrency?.symbol ?? 'ETH'}　|　填写地址 → 发送 ERC20
            </div>
          </div>

          {/* Transfer list */}
          {transfers.map((transfer, index) => (
            <div key={index} style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #dee2e6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#333' }}>转账 #{index + 1}</div>
                {transfers.length > 1 && (
                  <button type="button" onClick={() => removeTransfer(index)} style={removeBtnStyle}>移除</button>
                )}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>接收地址 *</label>
                <input type="text" value={transfer.to} onChange={e => updateTransfer(index, 'to', e.target.value)}
                  placeholder="0x..." style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>数量 *</label>
                <input type="text" value={transfer.amount} onChange={e => updateTransfer(index, 'amount', e.target.value)}
                  placeholder="0.01" style={inputStyle} required />
              </div>
            </div>
          ))}

          <button type="button" onClick={addTransfer} style={addBtnStyle}>+ 添加转账</button>

          {/* Total (native only) */}
          {!isERC20 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.75rem 1rem', backgroundColor: '#e7f3ff', borderRadius: '8px', marginBottom: '1.5rem',
            }}>
              <span style={{ fontSize: '0.875rem', color: '#004085' }}>总金额:</span>
              <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#004085' }}>
                {totalNative.toFixed(6)} {chain?.nativeCurrency?.symbol ?? 'ETH'}
              </span>
            </div>
          )}

          {error && (
            <div style={{ padding: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <strong>错误：</strong> {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem', wordBreak: 'break-all' }}>
              <strong>成功：</strong> {success}
              {txHashes.length > 0 && chain && txHashes.map((hash, i) => (
                <div key={i} style={{ marginTop: '0.25rem' }}>
                  <a href={`${chain.explorerUrl}/tx/${hash}`} target="_blank" rel="noopener noreferrer">{hash}</a>
                </div>
              ))}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '0.75rem',
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: '#fff', border: 'none', borderRadius: '4px',
            fontSize: '1rem', fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '发送中...' : `发送 ${transfers.length} 笔${isERC20 ? ' ERC20' : ''}`}
          </button>
        </form>
      </Card>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.375rem', fontWeight: 600, color: '#333', fontSize: '0.875rem' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.875rem', fontFamily: 'monospace', boxSizing: 'border-box' }
const smallBtnStyle: React.CSSProperties = { padding: '0.4rem 0.875rem', backgroundColor: 'transparent', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }
const removeBtnStyle: React.CSSProperties = { padding: '0.25rem 0.75rem', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }
const addBtnStyle: React.CSSProperties = { width: '100%', padding: '0.75rem', backgroundColor: '#f8f9fa', color: '#333', border: '1px dashed #dee2e6', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '1.5rem' }
