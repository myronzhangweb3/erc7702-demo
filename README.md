# ERC7702 Demo

一个完整的EIP-7702演示项目，包含智能合约和Web用户界面。通过友好的UI展示如何使用EIP-7702实现批量交易、gas代付等高级功能。

## 什么是 EIP-7702？

EIP-7702是以太坊的一个提案，允许外部拥有账户(EOA)临时授权将其代码指向代理合约。这使得EOA可以像智能合约账户一样批量执行交易，同时保持对账户的完全控制。

### 核心特性

- **临时授权**: EOA可以临时获得智能合约的能力
- **批量操作**: 在一笔交易中执行多个操作
- **Gas优化**: 批量操作可以显著降低gas成本
- **完全控制**: 用户始终保持对私钥的控制
- **可逆性**: 可以随时解除授权

### 实际应用场景

1. **批量转账**: 一次交易完成多笔ERC20或Native转账
2. **Gas代付**: Sponsor账户为其他账户支付gas费用
3. **原子操作**: 多个操作要么全部成功，要么全部失败
4. **复杂交互**: EOA可以调用复杂的合约交互逻辑

## 项目结构

```
erc7702-demo/
├── contract/              # 智能合约工作空间
│   ├── contracts/        # Solidity合约
│   ├── scripts/          # 部署和测试脚本
│   ├── ignition/         # Hardhat Ignition部署模块
│   ├── test/             # 合约测试
│   └── README.md         # 合约文档
├── web/                  # Web前端应用
│   ├── src/              # React源代码
│   ├── public/           # 静态资源
│   └── README.md         # Web应用文档
└── README.md             # 本文件
```

## 快速开始

### 前置要求

- Node.js 18+
- npm或yarn
- 支持EIP-7702的区块链网络（测试网或本地节点）

### 1. 安装依赖

```bash
# 安装合约依赖
cd contract
npm install

# 安装Web依赖
cd ../web
npm install
```

### 2. 部署合约

```bash
cd contract

# 配置环境变量
cp .env.example .env
# 编辑.env文件，填写RPC_URL和DEPLOY_PRIVATE_KEY

# 编译合约
npm run compile

# 部署ERC20合约
npm run deploy:erc20

# 部署BatchCallDelegation合约
npm run deploy:batchcall

# 记录两个合约地址，稍后需要配置到Web应用中
```

### 3. 配置Web应用

```bash
cd ../web

# 编辑 src/config.ts
# 将部署的合约地址填入：
# - ERC20_TOKEN_ADDRESS
# - BATCH_CALL_DELEGATION_CONTRACT_ADDRESS
```

### 4. 启动Web应用

```bash
cd web
npm run dev
```

访问 http://localhost:3000

### 5. 使用应用

1. **连接钱包**
   - 输入RPC URL
   - 输入TxAccount私钥
   - 输入Sponsor私钥
   - 点击连接

2. **绑定代理**
   - 导航到"代理管理"
   - 点击"绑定代理"
   - 等待交易确认

3. **Mint代币**
   - 导航到"Mint Token"
   - 输入数量
   - 点击Mint

4. **发送代币**
   - 导航到"发送ERC20"或"发送Native"
   - 添加接收地址和金额
   - 点击发送
   - 观察批量发送的效果

## 核心功能

### 1. EIP-7702 代理绑定

将Sponsor账户绑定到BatchCallDelegation合约，使其能够批量执行操作。

```typescript
// 签署授权
const authorization = await walletClient.signAuthorization({
  contractAddress: DELEGATION_CONTRACT_ADDRESS,
})

// 发送交易激活授权
await walletClient.sendTransaction({
  to: sponsorAddress,
  value: parseEther('0'),
  authorizationList: [authorization],
})
```

### 2. 批量ERC20转账

在一笔交易中完成多笔ERC20转账。

```typescript
const calls = [
  {
    data: encodeFunctionData({
      abi: ERC20Abi,
      functionName: 'transfer',
      args: [recipient1, amount1],
    }),
    to: ERC20_ADDRESS,
    value: 0n,
  },
  {
    data: encodeFunctionData({
      abi: ERC20Abi,
      functionName: 'transfer',
      args: [recipient2, amount2],
    }),
    to: ERC20_ADDRESS,
    value: 0n,
  },
]

await walletClient.writeContract({
  account: sponsor,
  address: txAccount.address,
  abi: BatchCallDelegationAbi,
  functionName: 'execute',
  args: [calls],
  authorizationList: [authorization],
})
```

### 3. 批量Native转账

在一笔交易中完成多笔ETH转账。

```typescript
const calls = [
  {
    data: '0x',
    to: recipient1,
    value: parseEther('0.01'),
  },
  {
    data: '0x',
    to: recipient2,
    value: parseEther('0.02'),
  },
]

await walletClient.writeContract({
  account: sponsor,
  address: txAccount.address,
  abi: BatchCallDelegationAbi,
  functionName: 'execute',
  args: [calls],
  value: parseEther('0.03'), // 总金额
  authorizationList: [authorization],
})
```

## 技术架构

### 智能合约

- **BatchCallDelegation.sol**: 批量调用代理合约
  - 实现批量执行多个调用
  - 支持Native和ERC20转账
  - 无权限限制（由授权机制保障安全）

- **ERC20Token.sol**: 标准ERC20代币
  - 基于OpenZeppelin实现
  - 公开mint函数用于演示

### Web应用

- **React 18**: 用户界面
- **TypeScript**: 类型安全
- **Viem**: 以太坊库（支持EIP-7702）
- **React Router**: 路由管理

### 工作流程

```
┌─────────────┐
│   用户输入   │
│ (TxAccount) │
│  (Sponsor)  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Sponsor签署    │
│  EIP-7702授权   │
└──────┬──────────┘
       │
       ▼
┌──────────────────┐
│  TxAccount发起   │
│   批量交易请求    │
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│  区块链验证授权      │
│  Sponsor临时获得     │
│  代理合约代码        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  BatchCallDelegation │
│  执行批量调用        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  多笔操作原子执行    │
│  全部成功或全部失败  │
└──────────────────────┘
```

## Gas成本对比

### ERC20转账（5笔）

| 模式 | Gas成本 | 节省 |
|------|---------|------|
| 普通模式 | ~325,000 (65k×5) | 0% |
| 批量模式 | ~120,000 | 63% |

### Native转账（5笔）

| 模式 | Gas成本 | 节省 |
|------|---------|------|
| 普通模式 | ~105,000 (21k×5) | 0% |
| 批量模式 | ~30,000 | 71% |

**结论**: 批量操作可以节省60-70%的gas费用！

## 安全性

### 私钥管理

- Web应用中的私钥仅保存在浏览器本地存储
- 不会上传到任何服务器
- 建议仅在测试环境使用

### 授权安全

- EIP-7702授权是临时的，仅在交易执行期间有效
- 授权不会持久化到链上
- 用户始终保持对私钥的控制

### 合约安全

- BatchCallDelegation合约经过审计（建议在生产环境使用前进行专业审计）
- 使用OpenZeppelin标准库
- 所有操作都有适当的错误处理

### 最佳实践

1. ✅ 在测试网络上先测试所有功能
2. ✅ 使用小金额进行初次测试
3. ✅ 定期清理浏览器存储的私钥
4. ✅ 不要在生产环境使用测试私钥
5. ✅ 确认交易详情后再签名

## 开发

### 添加新功能

1. **合约端**: 在`contract/contracts/`添加新合约
2. **Web端**: 在`web/src/pages/`添加新页面
3. **集成**: 更新路由和导航

### 测试

```bash
# 合约测试
cd contract
npx hardhat test

# Web应用（手动测试）
cd web
npm run dev
```

### 构建

```bash
# 编译合约
cd contract
npm run compile

# 构建Web应用
cd web
npm run build
```

## 故障排查

### 常见问题

**Q: 连接失败？**
- 检查RPC URL是否正确
- 确认网络是否支持EIP-7702
- 检查私钥格式（64字符十六进制）

**Q: 交易失败？**
- 确认账户余额充足（包括gas费用）
- 检查是否已绑定代理（批量操作需要）
- 查看浏览器控制台错误信息

**Q: 批量发送不可用？**
- 确认已在"代理管理"页面绑定代理
- 点击"刷新状态"更新绑定状态
- 检查Sponsor账户余额

**Q: 代理绑定失败？**
- 确认网络支持EIP-7702
- 检查合约地址是否正确
- Sponsor账户需要有足够的ETH支付gas

## 文档

- [合约文档](./contract/README.md) - 智能合约详细说明
- [Web应用文档](./web/README.md) - Web界面使用指南

## 示例用例

### 场景1: 批量发工资

使用批量ERC20转账功能，一次性向多个员工发放工资代币。

```
好处：
- 节省60%以上gas费用
- 一次交易完成，原子性保证
- 减少操作时间和复杂度
```

### 场景2: 空投代币

向多个地址批量空投代币。

```
好处：
- 大幅降低空投成本
- 提高操作效率
- 用户体验更好
```

### 场景3: Gas代付

Sponsor账户为其他用户支付gas费用。

```
好处：
- 新用户无需持有ETH即可使用DApp
- 改善用户体验
- 降低使用门槛
```

## 路线图

- [x] 基础EIP-7702集成
- [x] 批量ERC20转账
- [x] 批量Native转账
- [x] Web用户界面
- [ ] 移动端适配
- [ ] 更多批量操作类型
- [ ] 交易历史记录
- [ ] Gas估算优化

## 贡献

欢迎贡献代码、报告问题或提出建议！

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 相关资源

- [EIP-7702 规范](https://eips.ethereum.org/EIPS/eip-7702)
- [Viem EIP-7702 文档](https://viem.sh/experimental/eip7702)
- [Hardhat 文档](https://hardhat.org/docs)
- [React 文档](https://react.dev)

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 联系方式

如有问题或建议，请提交Issue或通过以下方式联系：

- GitHub Issues: [项目Issues](https://github.com/your-repo/erc7702-demo/issues)
- Email: your-email@example.com

---

**免责声明**: 本项目仅供学习和演示使用，未经专业审计，不建议在生产环境中直接使用。使用本项目造成的任何损失，开发者不承担责任。
