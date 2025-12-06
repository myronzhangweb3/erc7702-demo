import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { Card } from '../components/Card'
import { CONFIG } from '../config'
import { sendAuthorizationTransaction } from '../utils/ethers-web3'

export const Delegation = () => {
  const { sponsor, isDelegated, updateDelegationStatus, chainId, rpcUrl, privateKey } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  /**
   * 绑定代理地址
   * 使用EIP7702将sponsor账户绑定到BatchCallDelegation合约
   */
  const handleBind = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!sponsor) {
        throw new Error('未连接钱包')
      }

      if (!privateKey) {
        throw new Error('请输入私钥')
      }

      // 验证私钥格式并自动添加 0x 前缀
      let formattedPrivateKey = privateKey.trim()
      if (!formattedPrivateKey.startsWith('0x')) {
        formattedPrivateKey = '0x' + formattedPrivateKey
      }

      if (formattedPrivateKey.length !== 66) {
        throw new Error('私钥格式错误：必须为 64 位十六进制字符（可选 0x 前缀）')
      }

      console.log('发送 EIP-7702 授权交易...')

      // 发送 EIP-7702 授权交易
      const txHash = await sendAuthorizationTransaction(
        formattedPrivateKey,
        CONFIG.BATCH_CALL_DELEGATION_CONTRACT_ADDRESS,
        chainId,
        rpcUrl
      )

      console.log('绑定交易已发送:', txHash)

      setSuccess(`绑定成功！交易哈希: ${txHash}`)

      // 等待交易确认后更新状态
      setTimeout(() => {
        updateDelegationStatus()
      }, 3000)
    } catch (err) {
      console.error('绑定失败:', err)
      setError(err instanceof Error ? err.message : '绑定失败')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 解绑代理地址
   * 通过签署一个空地址的授权来解除绑定
   */
  const handleUnbind = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!sponsor) {
        throw new Error('未连接钱包')
      }

      if (!privateKey) {
        throw new Error('请输入私钥')
      }

      // 验证私钥格式并自动添加 0x 前缀
      let formattedPrivateKey = privateKey.trim()
      if (!formattedPrivateKey.startsWith('0x')) {
        formattedPrivateKey = '0x' + formattedPrivateKey
      }

      if (formattedPrivateKey.length !== 66) {
        throw new Error('私钥格式错误：必须为 64 位十六进制字符（可选 0x 前缀）')
      }

      console.log('发送解绑授权交易...')

      // 发送指向零地址的授权交易来解除绑定
      const txHash = await sendAuthorizationTransaction(
        formattedPrivateKey,
        '0x0000000000000000000000000000000000000000',
        chainId,
        rpcUrl
      )

      console.log('解绑交易已发送:', txHash)

      setSuccess(`解绑成功！交易哈希: ${txHash}`)

      // 等待交易确认后更新状态
      setTimeout(() => {
        updateDelegationStatus()
      }, 3000)
    } catch (err) {
      console.error('解绑失败:', err)
      setError(err instanceof Error ? err.message : '解绑失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card title="代理地址管理">
        <div style={{
          padding: '1.5rem',
          backgroundColor: isDelegated ? '#d4edda' : '#fff3cd',
          borderRadius: '8px',
          marginBottom: '2rem',
          borderLeft: `4px solid ${isDelegated ? '#28a745' : '#ffc107'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#333' }}>
                当前状态: {isDelegated ? '已绑定' : '未绑定'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#555' }}>
                {isDelegated
                  ? '您的sponsor账户已绑定到BatchCallDelegation合约，可以使用批量交易功能。'
                  : '您的sponsor账户尚未绑定代理合约，绑定后可使用批量交易功能。'}
              </div>
            </div>
            <button
              onClick={() => updateDelegationStatus()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              刷新状态
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* 绑定卡片 */}
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', color: '#333' }}>
              绑定代理
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#555', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              绑定后，sponsor账户将能够通过BatchCallDelegation合约批量执行交易，
              大大提高交易效率并节省gas费用。
            </p>
            <button
              onClick={handleBind}
              disabled={loading || isDelegated}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: isDelegated ? '#6c757d' : '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: loading || isDelegated ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? '处理中...' : isDelegated ? '已绑定' : '绑定代理'}
            </button>
          </div>

          {/* 解绑卡片 */}
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', color: '#333' }}>
              解绑代理
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#555', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              解绑后，sponsor账户将恢复为普通EOA账户，无法再使用批量交易功能。
              您可以随时重新绑定。
            </p>
            <button
              onClick={handleUnbind}
              disabled={loading || !isDelegated}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: !isDelegated ? '#6c757d' : '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: loading || !isDelegated ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? '处理中...' : !isDelegated ? '未绑定' : '解绑代理'}
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}>
            <strong>错误：</strong> {error}
          </div>
        )}

        {/* 成功提示 */}
        {success && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#d4edda',
            color: '#155724',
            borderRadius: '4px',
            fontSize: '0.875rem',
            wordBreak: 'break-all'
          }}>
            <strong>成功：</strong> {success}
          </div>
        )}

        {/* 说明文档 */}
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          backgroundColor: '#e7f3ff',
          borderRadius: '8px',
          borderLeft: '4px solid #007bff'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#004085' }}>
            关于 EIP7702 代理
          </h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#004085', lineHeight: '1.8' }}>
            <li>EIP7702允许EOA临时指向代理合约代码</li>
            <li>绑定后，账户仍保持对私钥的完全控制</li>
            <li>可以随时解绑，恢复为普通EOA</li>
            <li>BatchCallDelegation合约地址: {CONFIG.BATCH_CALL_DELEGATION_CONTRACT_ADDRESS}</li>
            <li>绑定状态仅在当前网络有效</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
