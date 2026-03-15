import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { Card } from '../components/Card'
import { getChainById, getContractAddressesForChain } from '../config'
import { createPrivateKeyWalletClient, executeBatchCalls } from '../utils/web3'
import { getNativeBalance } from '../utils/ethers-web3'
import { parseEther, encodeFunctionData, isAddress, Address, Hex, createPublicClient, http } from 'viem'
import { ERC20Abi } from '../utils/abi'
import { createCustomChain } from '../utils/chain'

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
  const [tokenName, setTokenName] = useState('')
  const [transfers, setTransfers] = useState<TransferItem[]>([{ to: '', amount: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txHashes, setTxHashes] = useState<string[]>([])
  const [nativeBalance, setNativeBalance] = useState('')

  const isERC20 = tokenAddress.trim().length > 0
  const contracts = getContractAddressesForChain(chainId)
  const hasDelegationContract = !!contracts.batchCallDelegation
  const chain = getChainById(chainId)
  const nativeSymbol = chain?.nativeCurrency?.symbol ?? 'ETH'

  useEffect(() => { setTokenAddress(''); setTokenName('') }, [chainId])

  // Fetch ERC20 token name when address changes
  useEffect(() => {
    const addr = tokenAddress.trim()
    if (!addr || !isAddress(addr)) { setTokenName(''); return }
    let cancelled = false
    const fetch = async () => {
      try {
        const publicClient = createPublicClient({
          chain: createCustomChain(chainId, rpcUrl),
          transport: http(rpcUrl),
        })
        const name = await publicClient.readContract({
          address: addr as Address,
          abi: ERC20Abi,
          functionName: 'name',
        }) as string
        if (!cancelled) setTokenName(name)
      } catch {
        if (!cancelled) setTokenName('')
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [tokenAddress, chainId, rpcUrl])

  const checkBalance = async () => {
    if (txAccount && rpcUrl) {
      try { setNativeBalance(await getNativeBalance(txAccount, rpcUrl)) } catch { /* ignore */ }
    }
  }

  useEffect(() => {
    checkBalance()
    const interval = setInterval(checkBalance, 8000)
    return () => clearInterval(interval)
  }, [txAccount, rpcUrl])

  const addTransfer = () => setTransfers(t => [...t, { to: '', amount: '' }])
  const removeTransfer = (i: number) => setTransfers(t => t.filter((_, idx) => idx !== i))
  const updateTransfer = (i: number, field: 'to' | 'amount', value: string) =>
    setTransfers(t => t.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

  const totalNative = transfers.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(''); setTxHashes([])
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
      data: '0x' as Hex,
      to: t.to as Address,
      value: parseEther(t.amount),
    }))
    const totalValue = transfers.reduce((s, t) => s + parseEther(t.amount), BigInt(0))
    const hash = await executeBatchCalls({ txAccountPrivateKey, rpcUrl, chainId, calls, txAccount, gasFeePayerPrivateKey, totalValue })
    setSuccess(`批量发送成功！共 ${transfers.length} 笔`); setTxHashes([hash]); setTransfers([{ to: '', amount: '' }])
  }

  const sendNativeWithout = async () => {
    if (!txAccount || !txAccountPrivateKey) throw new Error('未登录')
    const senderKey = gasFeePayerPrivateKey || txAccountPrivateKey
    const walletClient = createPrivateKeyWalletClient(senderKey, chainId, rpcUrl)
    const hashes: string[] = []
    for (const t of transfers) {
      hashes.push(await walletClient.sendTransaction({ to: t.to as Address, value: parseEther(t.amount) }))
    }
    setSuccess(`发送成功！共 ${transfers.length} 笔`); setTxHashes(hashes); setTransfers([{ to: '', amount: '' }])
  }

  const sendERC20WithDelegation = async () => {
    if (!txAccount || !txAccountPrivateKey) throw new Error('未登录')
    const calls = transfers.map(t => ({
      data: encodeFunctionData({ abi: ERC20Abi, functionName: 'transfer', args: [t.to as Hex, parseEther(t.amount)] }),
      to: tokenAddress as Address,
      value: BigInt(0),
    }))
    const hash = await executeBatchCalls({ txAccountPrivateKey, rpcUrl, chainId, calls, txAccount, gasFeePayerPrivateKey })
    setSuccess(`批量 ERC20 发送成功！共 ${transfers.length} 笔`); setTxHashes([hash]); setTransfers([{ to: '', amount: '' }])
  }

  const sendERC20Without = async () => {
    if (!txAccount || !txAccountPrivateKey) throw new Error('未登录')
    const senderKey = gasFeePayerPrivateKey || txAccountPrivateKey
    const walletClient = createPrivateKeyWalletClient(senderKey, chainId, rpcUrl)
    const hashes: string[] = []
    for (const t of transfers) {
      hashes.push(await walletClient.writeContract({
        address: tokenAddress as Hex,
        abi: ERC20Abi,
        functionName: 'transfer',
        args: [t.to as Hex, parseEther(t.amount)],
      }))
    }
    setSuccess(`ERC20 发送成功！共 ${transfers.length} 笔`); setTxHashes(hashes); setTransfers([{ to: '', amount: '' }])
  }

  const tokenLabel = isERC20 ? (tokenName || 'ERC20') : nativeSymbol

  return (
    <div>
      <Card title="发送交易">
        {/* Balance row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.15rem' }}>原生代币余额</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111' }}>
              {nativeBalance ? `${nativeBalance} ${nativeSymbol}` : '—'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={updateDelegationStatus} style={ghostBtn}>刷新状态</button>
            <button onClick={checkBalance} style={ghostBtn}>刷新余额</button>
            <span style={{
              fontSize: '0.75rem', fontWeight: 500,
              color: isDelegated ? '#059669' : '#d97706',
            }}>
              {isDelegated ? '● 批量模式' : '○ 逐笔模式'}
            </span>
          </div>
        </div>

        {!isDelegated && (
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1.25rem' }}>
            前往 <a href="/delegation" style={{ color: '#6366f1' }}>7702 授权管理</a> 绑定代理以启用批量发送
          </div>
        )}
        {isDelegated && !hasDelegationContract && (
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginBottom: '1.25rem' }}>
            当前链未配置 BatchCallDelegation 合约地址，将使用逐笔发送
          </div>
        )}

        <form onSubmit={handleSend}>
          {/* Token address */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>
              Token 合约地址
              <span style={{
                marginLeft: '0.5rem', padding: '0.1rem 0.45rem', borderRadius: '4px',
                fontSize: '0.7rem', fontWeight: 600,
                backgroundColor: isERC20 ? '#ede9fe' : '#f3f4f6',
                color: isERC20 ? '#7c3aed' : '#6b7280',
              }}>
                {isERC20 ? (tokenName || 'ERC20') : nativeSymbol}
              </span>
            </label>
            <input
              type="text" value={tokenAddress}
              onChange={e => setTokenAddress(e.target.value)}
              placeholder={`留空发送 ${nativeSymbol}，填写合约地址发送 ERC20`}
              style={inputStyle}
            />
          </div>

          {/* Transfer list */}
          {transfers.map((transfer, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end', marginBottom: '0.75rem' }}>
              <div>
                {index === 0 && <label style={labelStyle}>接收地址</label>}
                <input type="text" value={transfer.to}
                  onChange={e => updateTransfer(index, 'to', e.target.value)}
                  placeholder="0x..." style={inputStyle} required />
              </div>
              <div>
                {index === 0 && <label style={labelStyle}>数量 ({tokenLabel})</label>}
                <input type="text" value={transfer.amount}
                  onChange={e => updateTransfer(index, 'amount', e.target.value)}
                  placeholder="0.01" style={inputStyle} required />
              </div>
              <div style={{ paddingBottom: '1px' }}>
                {transfers.length > 1 && (
                  <button type="button" onClick={() => removeTransfer(index)} style={removeBtn}>×</button>
                )}
              </div>
            </div>
          ))}

          <button type="button" onClick={addTransfer} style={addBtn}>+ 添加收款人</button>

          {!isERC20 && transfers.length > 1 && (
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem', textAlign: 'right' }}>
              合计 {totalNative.toFixed(6)} {nativeSymbol}
            </div>
          )}

          {error && (
            <div style={{ fontSize: '0.8rem', color: '#dc2626', marginBottom: '1rem', padding: '0.6rem 0.75rem', background: '#fef2f2', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ fontSize: '0.8rem', color: '#059669', marginBottom: '1rem', padding: '0.6rem 0.75rem', background: '#ecfdf5', borderRadius: '6px' }}>
              {success}
              {txHashes.map((hash, i) => chain && (
                <div key={i} style={{ marginTop: '0.25rem', wordBreak: 'break-all' }}>
                  <a href={`${chain.explorerUrl}/tx/${hash}`} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#059669', fontSize: '0.75rem' }}>{hash}</a>
                </div>
              ))}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '0.65rem',
            backgroundColor: loading ? '#e5e7eb' : '#4f46e5',
            color: loading ? '#9ca3af' : '#fff',
            border: 'none', borderRadius: '8px',
            fontSize: '0.875rem', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '发送中...' : `发送 ${tokenLabel}${transfers.length > 1 ? `（${transfers.length} 笔）` : ''}`}
          </button>
        </form>
      </Card>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace', boxSizing: 'border-box', color: '#111' }
const ghostBtn: React.CSSProperties = { padding: '0.3rem 0.65rem', background: 'none', border: '1px solid #e5e7eb', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280' }
const removeBtn: React.CSSProperties = { width: '32px', height: '32px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', color: '#9ca3af', fontSize: '1rem', lineHeight: 1 }
const addBtn: React.CSSProperties = { width: '100%', padding: '0.5rem', background: 'none', border: '1px dashed #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }
