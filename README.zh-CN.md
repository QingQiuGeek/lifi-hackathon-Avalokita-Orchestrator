<p align="right">
  <a href="./README.md">English</a> | 简体中文
</p>

![](.\app\logo.jpg)

# Avalokita

Avalokita 是一个面向 LI.FI `AI x Earn` 赛道打造的 AI Native DeFi Earn 产品。它把意图识别、基于 LI.FI 的实时路由能力，以及钱包确认执行，整合成一条统一的 Earn 工作流。

用户不再需要自己手动比对 vault、拆解 route、拼接多步跨链动作。Avalokita 做的事情是：先理解你的意图，再获取实时事实，生成可审阅的 execution preview，最后由你使用自己的钱包完成执行。

Avalokita 来自“千手观音”的意象。这个名字和产品结构本身是对应的：一个主 Agent 负责识别用户意图，并编排多个 tool 去调用 LI.FI 能力、获取实时信息、构建 route、生成执行预览，最终帮助用户完成 AI Earn。这个产品的体验也刻意做成了 chat-first。用户面对的不是一堆分散的按钮和表单，而是一个 ChatGPT 风格的聊天 Agent。用户在对话里自然地获取信息、理解下一步要做什么，并在同一条对话链路里完成交易。

## 产品概览

Avalokita 的产品体验围绕一个很直接的逻辑展开：

- 用自然语言提出需求
- 获取实时 Earn 机会
- 查看确定性的执行预览
- 在钱包中确认执行
- 跟踪真实的 route 最终结果

这让它既可以作为 DeFi Earn 的探索入口，也可以作为实际执行入口。

## 核心能力

当前产品体验围绕 USDC Earn 流程展开，已实现能力包括：

- 实时 USDC vault 发现与推荐
- same-chain USDC Earn 执行
- 基于 LI.FI 的 cross-chain USDC Earn 执行
- 在任何签名前生成钱包可执行预览
- 跟踪 `completed`、`partial`、`refunded` 等 route 最终状态

## 当前覆盖范围

当前实现范围：

- 资产重点：`USDC`
- 已实现能力类型：same-chain Earn 与 cross-chain Earn
- 业务链范围：`Ethereum`、`Base`、`Arbitrum`、`Polygon`
- 代表性链路组合包括：`Ethereum -> Base`、`Ethereum -> Arbitrum`、`Base -> Arbitrum`、`Arbitrum -> Base`、`Base -> Ethereum`、`Arbitrum -> Ethereum`、`Base -> Polygon`

从用户体验上看，当前已经覆盖：

- same-chain 的 USDC 存入流程
- ETH gas 生态之间的 cross-chain USDC 存入流程
- 以 Polygon 为目标链的 cross-chain USDC Earn 流程

## 这个产品解决什么问题

今天的 DeFi Earn 依然存在几个明显门槛：

- 机会发现分散
- route 结构不透明
- 执行步骤容易看不懂
- 跨链时，很多用户会把“源链确认”误以为“最终完成”

Avalokita 通过明确分层来解决这些问题：

- 模型负责理解意图和解释结果
- 工具负责拿实时事实，例如 vault 候选和 LI.FI quote
- runtime 负责生成确定性的执行预览
- 钱包始终是最终执行入口

这套结构让产品既保留了解释性，也保留了真实执行能力，同时不会假装模型本身应该直接托管或移动资金。

## 如何使用

### 1. 启动项目

```bash
npm install
npm run dev
```

然后打开 [http://localhost:3000](http://localhost:3000)。

完整部署说明见 [DEPLOYMENT.zh-CN.md](./DEPLOYMENT.zh-CN.md)。

### 2. 连接钱包

使用页面顶部的钱包按钮，通过 RainbowKit / WalletConnect 连接钱包。

### 3. 发起 Earn 请求

示例 prompt：

- `Go ahead and deposit 0.1 USDC into the best available USDC vault on Base`
- `Deposit 5 USDC into the safest vault on Arbitrum`
- `Move 10 USDC from Base into the best USDC vault on Arbitrum`

### 4. 查看执行预览

在签名前，页面会展示：

- 选中的 vault 与协议
- 源链与目标链
- 金额、费用、gas 估算、approval target
- route step 摘要
- 当前执行状态与 route 最终结果

### 5. 执行并跟踪结果

如果 route 可执行，用户即可在钱包中确认执行。

对于 cross-chain 场景，产品可以展示：

- source transaction
- route transaction
- receiving transaction
- 最终 LI.FI route outcome

## 执行说明

Avalokita 的设计重点是让每一步都尽量清晰、可审阅、可验证。

- 钱包始终是最终执行入口
- cross-chain 是否真正完成，应以 LI.FI route 最终结果为准，而不是只看源链确认
- 某些 Polygon 目标链流程后续可能仍需要 `POL` 做手动操作
- 目标链收到的 vault share token，可能需要手动导入钱包后才能看到

## 技术栈

- Next.js 16
- React 19
- TypeScript 5
- Ant Design / Ant Design X
- Tailwind CSS 4
- AI SDK providers
- wagmi + RainbowKit + viem
- LI.FI REST integration

## 仓库亮点

- `app/`: Next.js 页面与服务端路由
- `components/`: chat UI、钱包连接、execution preview
- `lib/`: planner、LI.FI 领域逻辑、runtime、执行辅助逻辑
- `tests/`: 运行时与集成导向测试

关键后端入口：

- `POST /api/agents`
- `GET /api/agents`

## 项目定位

Avalokita 是一个聚焦型的 DeFi Earn 产品原型，把这四件事串成了一体化体验：

- 自然语言发现机会
- 工具获取实时事实
- 确定性 execution preview
- 钱包确认执行

它的目标不是模拟“完全自治”，而是把真实的 Earn 工作流做得更容易理解、更容易执行，也更容易验证结果。
