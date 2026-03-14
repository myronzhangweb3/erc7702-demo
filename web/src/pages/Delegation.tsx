import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { Card } from '../components/Card'
import { getChainById, getContractAddressesForChain } from '../config'
import { sendAuthorizationTransaction } from '../utils/ethers-web3'

export const Delegation = () => {
  const {
    isDelegated, updateDelegationStatus,
    chainId, rpcUrl,
    txAccountPrivateKey, gasFeePayerPrivateKey, txAccount,
  } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txHash, setTxHash] = useState('')

  const contracts = getContractAddressesForChain(chainId)
  const delegationContractAddress = contracts.batchCallDelegation
  const chain = getChainById(chainId)

  const handleBind = async () => {
    setError('')
    setSuccess('')
    setTxHash('')
    setLoading(true)
    try {
      if (!txAccount) throw new Error('未连接钱包')
      if (!txAccountPrivateKey) throw new Error('私钥不可用，请重新登录')
      if (!delegationContractAddress) throw new Error('当前链未配置 BatchCallDelegation 合约地址')

      const hash = await sendAuthorizationTransaction(
        txAccountPrivateKey,
        delegationContractAddress as `0x${string}`,
        chainId, rpcUrl, gasFeePayerPrivateKey,
      )
      setSuccess('绑定成功！')
      setTxHash(hash)
      setTimeout(() => updateDelegationStatus(), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定失败')
    } finally {
      setLoading(false)
    }
  }

  const handleUnbind = async () => {
    setError('')
    setSuccess('')
    setTxHash('')
    setLoading(true)
    try {
      if (!txAccount) throw new Error('未连接钱包')
      if (!txAccountPrivateKey) throw new Error('私钥不可用，请重新登录')

      const hash = await sendAuthorizationTransaction(
        txAccountPrivateKey,
        '0x0000000000000000000000000000000000000000',
        chainId, rpcUrl, gasFeePayerPrivateKey,
      )
      setSuccess('解绑成功！')
      setTxHash(hash)
      setTimeout(() => updateDelegationStatus(), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '解绑失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card title="7702 授权管理">
        {/* Status banner */}
        <div style={{
          padding: '1.25rem', backgroundColor: isDelegated ? '#d4edda' : '#fff3cd',
          borderRadius: '8px', marginBottom: '1.5rem',
          borderLeft: `4px solid ${isDelegated ? '#28a745' : '#ffc107'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#333' }}>
              当前状态: {isDelegated ? '✓ 已绑定' : '○ 未绑定'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#555' }}>
              {isDelegated
                ? '已绑定 BatchCallDelegation 合约，可使用批量交易功能。'
                : '尚未绑定代理合约，绑定后可使用批量交易功能。'}
            </div>
          </div>
          <button onClick={() => updateDelegationStatus()} style={smallBtnStyle}>刷新状态</button>
        </div>

        {/* No contract address warning */}
        {!delegationContractAddress && (
          <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '8px', marginBottom: '1.5rem', borderLeft: '4px solid #ffc107', fontSize: '0.875rem', color: '#856404' }}>
            <strong>⚠️ 未配置合约地址：</strong>当前链尚未配置 BatchCallDelegation 合约地址。
            请点击左上角链选择器中的 ✎ 图标修改 RPC，或联系管理员获取合约地址。
          </div>
        )}

        {/* Bind / Unbind grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.125rem', color: '#333' }}>绑定代理</h3>
            <p style={{ fontSize: '0.875rem', color: '#555', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              绑定后账户将能够通过 BatchCallDelegation 合约批量执行交易，节省 Gas 费用。
            </p>
            <button
              onClick={handleBind}
              disabled={loading || isDelegated || !delegationContractAddress}
              style={{
                width: '100%', padding: '0.75rem',
                backgroundColor: isDelegated || !delegationContractAddress ? '#6c757d' : '#28a745',
                color: '#fff', border: 'none', borderRadius: '4px',
                fontSize: '1rem', fontWeight: 'bold',
                cursor: loading || isDelegated || !delegationContractAddress ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '处理中...' : isDelegated ? '已绑定' : '绑定代理'}
            </button>
          </div>

          <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.125rem', color: '#333' }}>解绑代理</h3>
            <p style={{ fontSize: '0.875rem', color: '#555', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              解绑后账户将恢复为普通 EOA，无法使用批量交易功能。可随时重新绑定。
            </p>
            <button
              onClick={handleUnbind}
              disabled={loading || !isDelegated}
              style={{
                width: '100%', padding: '0.75rem',
                backgroundColor: !isDelegated ? '#6c757d' : '#dc3545',
                color: '#fff', border: 'none', borderRadius: '4px',
                fontSize: '1rem', fontWeight: 'bold',
                cursor: loading || !isDelegated ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '处理中...' : !isDelegated ? '未绑定' : '解绑代理'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '0.875rem' }}>
            <strong>错误：</strong> {error}
          </div>
        )}

        {success && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', fontSize: '0.875rem', wordBreak: 'break-all' }}>
            <strong>成功：</strong> {success}
            {txHash && chain && (
              <a href={`${chain.explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '0.5rem' }}>
                {txHash}
              </a>
            )}
          </div>
        )}

        {/* Info */}
        <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#e7f3ff', borderRadius: '8px', borderLeft: '4px solid #007bff' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#004085' }}>关于 EIP-7702 代理</h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#004085', lineHeight: 1.8 }}>
            <li>EIP-7702 允许 EOA 临时指向代理合约代码</li>
            <li>绑定后账户仍保持对私钥的完全控制</li>
            <li>可以随时解绑，恢复为普通 EOA</li>
            {delegationContractAddress && <li>BatchCallDelegation 合约: {delegationContractAddress}</li>}
            <li>绑定状态仅在当前网络有效</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}

const smallBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }
