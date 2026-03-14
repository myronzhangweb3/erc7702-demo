import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { Card } from '../components/Card'
import { getChainById, getContractAddressesForChain } from '../config'
import { createPrivateKeyWalletClient } from '../utils/web3'
import { isAddress, parseEther } from 'viem'
import { ERC20Abi } from '../utils/abi'

export const MintToken = () => {
  const { txAccount, rpcUrl, chainId, txAccountPrivateKey, gasFeePayerPrivateKey } = useWallet()
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [customTokenAddress, setCustomTokenAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [txHash, setTxHash] = useState('')

  const contracts = getContractAddressesForChain(chainId)
  const defaultTokenAddress = contracts.erc20Token
  const tokenAddress = customTokenAddress.trim() || defaultTokenAddress
  const chain = getChainById(chainId)

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setTxHash('')
    setLoading(true)

    try {
      if (!tokenAddress) throw new Error('当前链未配置 ERC20 代币合约地址，请在下方输入自定义地址')
      if (!isAddress(tokenAddress)) throw new Error('代币合约地址不合法')

      const recipient = recipientAddress || txAccount
      if (!recipient) throw new Error('请输入接收地址')
      if (!isAddress(recipient)) throw new Error('请输入合法的接收地址')
      if (!txAccount) throw new Error('未登录')

      const senderPrivateKey = gasFeePayerPrivateKey || txAccountPrivateKey
      if (!senderPrivateKey) throw new Error('私钥不可用，请重新登录')

      const walletClient = createPrivateKeyWalletClient(senderPrivateKey, chainId, rpcUrl)
      const hash = await walletClient.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20Abi,
        functionName: 'mint',
        args: [recipient, parseEther(amount)],
      })

      setSuccess('Mint 成功！')
      setTxHash(hash)
      setAmount('')
      if (recipientAddress) setRecipientAddress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mint 失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card title="Mint ERC20 Token">
        {!defaultTokenAddress && !customTokenAddress && (
          <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '8px', marginBottom: '1.5rem', borderLeft: '4px solid #ffc107', fontSize: '0.875rem', color: '#856404' }}>
            <strong>⚠️ 未配置代币合约：</strong>当前链未配置默认 ERC20 代币地址，请在下方输入自定义合约地址。
          </div>
        )}

        <form onSubmit={handleMint}>
          {/* Custom token address override */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>
              代币合约地址{defaultTokenAddress ? '（可选，留空使用默认）' : ' *'}
            </label>
            <input
              type="text" value={customTokenAddress}
              onChange={e => setCustomTokenAddress(e.target.value)}
              placeholder={defaultTokenAddress || '0x...'}
              style={inputStyle}
              required={!defaultTokenAddress}
            />
            {defaultTokenAddress && (
              <div style={hintStyle}>默认: {defaultTokenAddress}</div>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>接收地址（留空则为当前账户）</label>
            <input
              type="text" value={recipientAddress}
              onChange={e => setRecipientAddress(e.target.value)}
              placeholder={txAccount || '0x...'}
              style={inputStyle}
            />
            <div style={hintStyle}>留空将 Mint 到当前 txAccount 地址</div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>数量（Token） *</label>
            <input
              type="text" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="1.0"
              style={inputStyle}
              required
            />
            <div style={hintStyle}>以 Ether 单位（18 位精度），如 1.0 表示 1 个 Token</div>
          </div>

          {/* Quick amounts */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>快捷选择:</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['0.1', '1', '10', '100'].map(val => (
                <button key={val} type="button" onClick={() => setAmount(val)} style={quickBtnStyle}>{val}</button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <strong>错误：</strong> {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem', wordBreak: 'break-all' }}>
              <strong>成功：</strong> {success}
              {txHash && chain && (
                <a href={`${chain.explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '1rem' }}>
                  {txHash}
                </a>
              )}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '0.75rem',
              backgroundColor: loading ? '#6c757d' : '#28a745',
              color: '#fff', border: 'none', borderRadius: '4px',
              fontSize: '1rem', fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Minting...' : 'Mint Token'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#e7f3ff', borderRadius: '8px', borderLeft: '4px solid #007bff' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#004085' }}>关于 Mint</h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#004085', lineHeight: 1.8 }}>
            <li>Mint 操作会铸造新的 ERC20 代币</li>
            <li>无需绑定代理，使用普通 ERC20 mint 函数</li>
            <li>仅适用于具有公开 mint 函数的测试合约</li>
            {tokenAddress && <li>当前代币合约: {tokenAddress}</li>}
            <li>代币精度为 18 位（与 ETH 相同）</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.375rem', fontWeight: 600, color: '#333', fontSize: '0.875rem' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.875rem', fontFamily: 'monospace', boxSizing: 'border-box' }
const hintStyle: React.CSSProperties = { marginTop: '0.25rem', fontSize: '0.75rem', color: '#666' }
const quickBtnStyle: React.CSSProperties = { padding: '0.5rem 1rem', backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }
