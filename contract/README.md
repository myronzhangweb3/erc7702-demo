# ERC7702 Smart Contracts

这个目录包含ERC7702 Demo项目的智能合约代码和部署脚本。

## 目录结构

```
contract/
├── contracts/           # Solidity智能合约
│   ├── BatchCallDelegation.sol  # 批量调用代理合约
│   └── ERC20Token.sol           # ERC20代币合约
├── scripts/             # 实用脚本
│   ├── SendERC20Token.ts        # 发送ERC20代币示例
│   ├── SendNativeToken.ts       # 发送原生代币示例
│   ├── mint.ts                  # Mint ERC20代币
│   └── ABI.ts                   # 合约ABI定义
├── ignition/            # Hardhat Ignition部署模块
│   └── modules/
│       ├── ERC20Token.ts        # ERC20部署脚本
│       └── BatchCallDelegation.ts  # BatchCall部署脚本
├── test/                # 测试文件
├── hardhat.config.ts    # Hardhat配置
├── tsconfig.json        # TypeScript配置
└── .env.example         # 环境变量示例
```

## 智能合约说明

### 1. BatchCallDelegation.sol

批量调用代理合约，用于EIP7702代理功能。

**功能:**
- 允许批量执行多个调用
- 支持Native Token和ERC20转账
- 每个调用可以指定目标地址、数据和金额

**核心函数:**
```solidity
function execute(Call[] calldata calls) external payable
```

**Call结构:**
```solidity
struct Call {
    bytes data;      // 调用数据
    address to;      // 目标地址
    uint256 value;   // 发送金额
}
```

### 2. ERC20Token.sol

基于OpenZeppelin的ERC20代币合约。

**功能:**
- 标准ERC20功能
- 公开的mint函数（任何人都可以铸造）
- 基于Ownable的权限管理

## 环境配置

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填写以下信息：

```bash
# 区块链RPC地址
RPC_URL=http://localhost:8545

# 部署合约的私钥
DEPLOY_PRIVATE_KEY=your_deploy_private_key

# BatchCallDelegation合约地址（部署后填写）
BATCH_CALL_DELEGATION_CONTRACT_ADDRESS=

# ERC20代币合约地址（部署后填写）
ERC20_TOKEN_ADDRESS=

# 交易账户私钥（用于发起交易）
TX_ACCOUNT_PRIVATE_KEY=your_tx_account_private_key

# 赞助者私钥（用于支付gas费用）
SPONSOR_PRIVATE_KEY=your_sponsor_private_key
```

## 部署合约

### 1. 编译合约

```bash
npm run compile
```

### 2. 部署ERC20代币合约

```bash
npm run deploy:erc20
```

部署成功后，复制合约地址到 `.env` 文件的 `ERC20_TOKEN_ADDRESS`。

### 3. 部署BatchCallDelegation合约

```bash
npm run deploy:batchcall
```

部署成功后，复制合约地址到 `.env` 文件的 `BATCH_CALL_DELEGATION_CONTRACT_ADDRESS`。

## 使用脚本

### 1. Mint ERC20代币

```bash
npm run mint:erc20
```

这将向指定地址铸造ERC20代币。

### 2. 发送ERC20代币（使用EIP7702批量发送）

```bash
npm run send:erc20
```

**工作流程:**
1. 使用sponsor账户签署EIP7702授权
2. 授权将sponsor的代码指向BatchCallDelegation合约
3. 使用txAccount发起批量ERC20转账
4. gas费用由sponsor支付

**关键代码说明:**

```typescript
// 1. 签署EIP7702授权
const authorization = await sponsorWalletClient.signAuthorization({
  contractAddress: BATCH_CALL_DELEGATION_ADDRESS,
  sponsor: sponsor,
});

// 2. 构建批量调用数据
const calls = [
  {
    data: encodeFunctionData({
      abi: ERC20Abi,
      functionName: 'transfer',
      args: [recipientAddress, amount],
    }),
    to: ERC20_TOKEN_ADDRESS,
    value: parseEther('0'),
  },
  // 可以添加更多调用...
];

// 3. 执行批量转账
const txHash = await txWalletClient.writeContract({
  account: sponsor,
  abi: BatchCallDelegationAbi,
  address: txAccount.address,  // 调用txAccount地址（已代理）
  functionName: 'execute',
  args: [calls],
  authorizationList: [authorization],  // 包含授权
});
```

### 3. 发送Native代币（使用EIP7702批量发送）

```bash
npm run send:native
```

**工作流程:**
与ERC20类似，但发送的是原生代币（ETH）。

**关键代码说明:**

```typescript
// Native转账不需要调用数据，只需指定接收地址和金额
const calls = [
  {
    data: '0x',
    to: recipientAddress1,
    value: parseEther('0.01'),
  },
  {
    data: '0x',
    to: recipientAddress2,
    value: parseEther('0.02'),
  },
];

// 执行时需要传入总金额作为value
const totalValue = parseEther('0.03');
await txWalletClient.writeContract({
  account: sponsor,
  abi: BatchCallDelegationAbi,
  address: txAccount.address,
  functionName: 'execute',
  args: [calls],
  value: totalValue,  // 总金额
  authorizationList: [authorization],
});
```

## EIP7702 工作原理

### 什么是EIP7702？

EIP7702允许外部拥有账户(EOA)临时授权将其代码指向代理合约，使EOA能够像智能合约账户一样执行复杂操作。

### 关键特性

1. **临时授权**: EOA保持对私钥的完全控制
2. **批量操作**: 可以在一笔交易中执行多个操作
3. **Gas优化**: 批量操作共享固定gas成本，更节省
4. **可逆**: 可以随时解除授权，恢复为普通EOA

### 授权流程

```
1. Sponsor账户签署授权 (signAuthorization)
   ↓
2. 授权指定代理合约地址 (BatchCallDelegation)
   ↓
3. TxAccount使用sponsor的授权发起交易
   ↓
4. 区块链节点验证授权并执行
   ↓
5. Sponsor账户临时获得代理合约的代码
   ↓
6. 执行批量调用
```

### 授权结构

```typescript
interface Authorization {
  chainId: number;           // 链ID
  address: Address;          // 授权账户地址
  nonce: bigint;            // Nonce
  contractAddress: Address;  // 代理合约地址
  r: Hex;                   // 签名r
  s: Hex;                   // 签名s
  yParity: number;          // 签名yParity
}
```

## 注意事项

### 安全性

1. **私钥安全**:
   - 永远不要在生产环境中将私钥硬编码
   - 使用环境变量或硬件钱包
   - 定期轮换密钥

2. **授权范围**:
   - EIP7702授权是临时的，仅在交易执行期间有效
   - 授权不会持久化到链上
   - 每次交易都需要重新签署授权

3. **Gas费用**:
   - Sponsor账户需要有足够的余额支付gas
   - TxAccount需要有足够的余额用于转账
   - 批量操作可以显著降低平均gas成本

### Gas成本对比

| 操作类型 | 单笔转账 | 批量转账(5笔) | 节省比例 |
|---------|---------|--------------|---------|
| Native  | ~21,000 gas/笔 | ~30,000 gas总 | ~71% |
| ERC20   | ~65,000 gas/笔 | ~120,000 gas总 | ~63% |

### 常见问题

**Q: 为什么需要两个私钥？**

A: TxAccount发起交易，Sponsor支付gas费用并提供授权。这样可以实现gas费用代付和批量操作。

**Q: 授权会永久改变我的账户吗？**

A: 不会。EIP7702授权是临时的，仅在交易执行期间有效。交易完成后，账户恢复为普通EOA。

**Q: 可以在任何链上使用EIP7702吗？**

A: 只有支持EIP7702的链才能使用。目前主要是测试网络。请确认您的目标链支持EIP7702。

**Q: BatchCallDelegation合约是否需要权限控制？**

A: 当前实现没有权限控制，任何人都可以调用execute函数。这是设计上的选择，因为调用者需要提供有效的授权才能代表其他账户执行操作。

## 测试

运行测试（如果有）：

```bash
npx hardhat test
```

## 相关资源

- [EIP-7702 规范](https://eips.ethereum.org/EIPS/eip-7702)
- [Viem EIP7702 文档](https://viem.sh/experimental/eip7702)
- [Hardhat 文档](https://hardhat.org/docs)
- [OpenZeppelin 合约](https://docs.openzeppelin.com/contracts)

## 许可证

MIT License
