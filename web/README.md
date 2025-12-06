# ERC7702 Web Interface

ERC7702 Demo项目的Web用户界面，提供友好的图形界面来管理EIP7702功能。

## 功能特性

### 1. 钱包连接
- 通过私钥连接钱包（支持两个账户：TxAccount和Sponsor）
- 自动保存连接状态到浏览器本地存储
- 实时显示连接状态和账户信息

### 2. 代理管理
- **绑定代理**: 将Sponsor账户绑定到BatchCallDelegation合约
- **解绑代理**: 解除代理绑定，恢复为普通EOA
- **状态检查**: 实时显示代理绑定状态

### 3. Mint ERC20 Token
- 铸造ERC20代币到指定地址
- 默认铸造到当前账户
- 实时查看代币余额

### 4. 发送ERC20 Token
- **已绑定模式**: 使用BatchCallDelegation批量发送（节省gas）
- **未绑定模式**: 使用普通ERC20 transfer逐笔发送
- 支持批量添加多个接收地址
- 实时显示发送模式和预期效果

### 5. 发送Native Token (ETH)
- **已绑定模式**: 批量发送原生代币
- **未绑定模式**: 逐笔发送
- 支持多地址批量转账
- 自动计算总金额

## 技术栈

- **React 18**: 用户界面框架
- **TypeScript**: 类型安全的JavaScript
- **Vite**: 快速的开发服务器和构建工具
- **Viem**: 轻量级以太坊库，支持EIP7702
- **React Router**: 客户端路由

## 项目结构

```
web/
├── src/
│   ├── components/        # React组件
│   │   ├── Layout.tsx    # 布局组件（导航栏、状态栏）
│   │   └── Card.tsx      # 卡片组件
│   ├── pages/            # 页面组件
│   │   ├── Home.tsx      # 首页（连接钱包）
│   │   ├── Delegation.tsx    # 代理管理
│   │   ├── MintToken.tsx     # Mint代币
│   │   ├── SendERC20.tsx     # 发送ERC20
│   │   └── SendNative.tsx    # 发送Native
│   ├── hooks/            # React Hooks
│   │   └── useWallet.tsx     # 钱包状态管理Hook
│   ├── utils/            # 工具函数
│   │   ├── abi.ts        # 合约ABI定义
│   │   └── web3.ts       # Web3工具函数
│   ├── types/            # TypeScript类型定义
│   │   └── index.ts
│   ├── config.ts         # 配置文件
│   ├── App.tsx           # 应用根组件
│   ├── main.tsx          # 应用入口
│   └── index.css         # 全局样式
├── public/               # 静态资源
├── index.html            # HTML入口
├── vite.config.ts        # Vite配置
├── tsconfig.json         # TypeScript配置
└── package.json          # 项目依赖
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置

合约地址已在 `src/config.ts` 中硬编码：

```typescript
export const CONFIG = {
  ERC20_TOKEN_ADDRESS: '0x0D3c26B307115AD096d856dC4C8f95Ca2fFD4F4b',
  BATCH_CALL_DELEGATION_CONTRACT_ADDRESS: '0x90489BDa2d09131471c287F3cc67EA60cf48c157',
}
```

如需修改，请编辑 `src/config.ts` 文件。

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 构建生产版本

```bash
npm run build
```

构建产物将生成在 `dist/` 目录。

### 5. 预览生产版本

```bash
npm run preview
```

## 使用指南

### 连接钱包

1. 在首页输入以下信息：
   - **RPC URL**: 区块链节点地址（如 http://localhost:8545）
   - **TX Account Private Key**: 交易账户私钥
   - **Sponsor Private Key**: 赞助者账户私钥

2. 点击"连接钱包"按钮

3. 连接成功后，信息会保存到浏览器本地存储

**注意**: 私钥仅保存在浏览器本地，不会上传到任何服务器。

### 绑定代理

1. 导航到"代理管理"页面
2. 查看当前绑定状态
3. 点击"绑定代理"按钮
4. 等待交易确认
5. 状态将更新为"已绑定"

### Mint ERC20 Token

1. 导航到"Mint Token"页面
2. 输入接收地址（留空则为自己）
3. 输入铸造数量
4. 点击"Mint Token"按钮
5. 等待交易确认

### 发送ERC20 Token

1. 导航到"发送ERC20"页面
2. 查看当前发送模式（已绑定/未绑定）
3. 添加转账项：
   - 输入接收地址
   - 输入转账金额
4. 可添加多个转账项
5. 点击"发送"按钮
6. 等待交易确认

**已绑定模式优势**:
- 所有转账在一笔交易中完成
- 显著降低gas费用
- 更快的执行速度

### 发送Native Token

与发送ERC20类似，但发送的是原生代币（ETH）。

1. 导航到"发送Native"页面
2. 添加转账项
3. 查看总金额
4. 点击"发送"按钮

## 核心功能实现

### 钱包管理 (useWallet Hook)

```typescript
// 连接钱包
const { connectWallet, disconnect, updateDelegationStatus } = useWallet()

await connectWallet(txPrivateKey, sponsorPrivateKey, rpcUrl)

// 访问钱包状态
const { txAccount, sponsor, isDelegated, isConnected } = useWallet()
```

### 检查代理状态

```typescript
import { checkDelegationStatus, createCustomPublicClient } from './utils/web3'

const publicClient = createCustomPublicClient(chainId, rpcUrl)
const isDelegated = await checkDelegationStatus(address, publicClient)
```

通过读取账户的bytecode判断是否已绑定代理合约。

### 绑定代理

```typescript
import { createEIP7702WalletClient } from './utils/web3'

const walletClient = createEIP7702WalletClient(privateKey, chainId, rpcUrl)

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

### 批量发送ERC20（已绑定模式）

```typescript
// 1. 签署授权
const authorization = await sponsorWalletClient.signAuthorization({
  contractAddress: DELEGATION_CONTRACT_ADDRESS,
  sponsor: sponsorWalletClient.account,
})

// 2. 构建批量调用
const calls = transfers.map(t => ({
  data: encodeFunctionData({
    abi: ERC20Abi,
    functionName: 'transfer',
    args: [t.to, parseEther(t.amount)],
  }),
  to: ERC20_TOKEN_ADDRESS,
  value: parseEther('0'),
}))

// 3. 执行批量转账
await txWalletClient.writeContract({
  account: sponsorWalletClient.account,
  abi: BatchCallDelegationAbi,
  address: txWalletClient.account.address,
  functionName: 'execute',
  args: [calls],
  authorizationList: [authorization],
})
```

### 普通发送ERC20（未绑定模式）

```typescript
for (const transfer of transfers) {
  await walletClient.writeContract({
    address: ERC20_TOKEN_ADDRESS,
    abi: ERC20Abi,
    functionName: 'transfer',
    args: [transfer.to, parseEther(transfer.amount)],
  })
}
```

## 状态管理

应用使用React Context进行状态管理：

```typescript
interface WalletState {
  txAccount: Address | null        // TX账户地址
  sponsor: Address | null           // Sponsor账户地址
  isConnected: boolean              // 是否已连接
  isDelegated: boolean              // 是否已绑定代理
  rpcUrl: string                    // RPC URL
  chainId: number                   // 链ID
}
```

状态持久化到 `localStorage`：
- `txPrivateKey`: TX账户私钥
- `sponsorPrivateKey`: Sponsor账户私钥
- `rpcUrl`: RPC URL

## UI设计

### 布局
- **导航栏**: 顶部固定，显示应用名称和导航链接
- **状态栏**: 显示账户信息和代理状态
- **主内容区**: 各功能页面

### 颜色主题
- **主色**: #007bff (蓝色)
- **成功**: #28a745 (绿色)
- **警告**: #ffc107 (黄色)
- **危险**: #dc3545 (红色)
- **中性**: #6c757d (灰色)

### 响应式设计
- 使用CSS Grid和Flexbox
- 支持移动端和桌面端
- 自适应布局

## 安全性

### 私钥管理
- 私钥仅保存在浏览器 `localStorage`
- 不会上传到任何服务器
- 使用时通过HTTPS连接区块链节点

### 交易安全
- 所有交易需要私钥签名
- 显示交易详情供用户确认
- 显示交易哈希供用户追踪

### 最佳实践
1. **测试环境使用**: 仅在测试网络使用此应用
2. **小额测试**: 先用小金额测试功能
3. **定期清理**: 使用后可断开连接，清除浏览器数据
4. **私钥保护**: 不要在不安全的环境中输入私钥

## 故障排查

### 连接失败
- 检查RPC URL是否正确
- 确认区块链节点是否运行
- 检查私钥格式是否正确（需要完整的64字符十六进制）

### 交易失败
- 检查账户余额是否充足（包括gas费用）
- 确认网络是否支持EIP7702
- 查看浏览器控制台的错误信息

### 代理绑定失败
- 确认Sponsor账户有足够的ETH支付gas
- 检查合约地址是否正确
- 确认网络支持EIP7702

### 批量发送不可用
- 确认已在"代理管理"页面绑定代理
- 点击"刷新状态"按钮更新绑定状态
- 检查Sponsor账户余额

## 开发

### 添加新页面

1. 在 `src/pages/` 创建新组件
2. 在 `src/App.tsx` 添加路由
3. 在 `src/components/Layout.tsx` 添加导航链接

### 修改合约地址

编辑 `src/config.ts`:

```typescript
export const CONFIG = {
  ERC20_TOKEN_ADDRESS: '0xYourAddress',
  BATCH_CALL_DELEGATION_CONTRACT_ADDRESS: '0xYourAddress',
}
```

### 自定义样式

编辑 `src/index.css` 或在组件中使用内联样式。

## 部署

### 静态托管

构建后可部署到任何静态托管服务：

- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

```bash
npm run build
# 将 dist/ 目录上传到托管服务
```

### 环境变量

如需使用环境变量，在 `.env` 文件中定义：

```
VITE_RPC_URL=http://localhost:8545
```

在代码中访问：

```typescript
const rpcUrl = import.meta.env.VITE_RPC_URL
```

## 浏览器支持

- Chrome/Edge (推荐)
- Firefox
- Safari

需要支持：
- ES2020+
- localStorage API
- Fetch API

## 相关资源

- [React 文档](https://react.dev)
- [Viem 文档](https://viem.sh)
- [Vite 文档](https://vitejs.dev)
- [TypeScript 文档](https://www.typescriptlang.org)

## 许可证

MIT License
