<p align="right">
  English | <a href="./README.zh-CN.md">简体中文</a>
</p>

![](./app/logo.jpg)

# Avalokita

Avalokita is an AI-native DeFi Earn experience built for the LI.FI `AI x Earn` track. It combines intent recognition, live LI.FI-powered routing, and wallet-confirmed execution into a single workflow for discovering and entering Earn opportunities.

Instead of asking users to manually compare vaults, inspect routes, and piece together multi-step actions across chains, Avalokita turns that process into a guided product flow: understand the request, fetch live facts, generate an execution preview, then let the user execute with their own wallet.

The name comes from Avalokitesvara, often represented in East Asian culture as the Thousand-Armed Bodhisattva. That image maps naturally to the product architecture: one primary agent orchestrates multiple tools to recognize user intent, gather live LI.FI data, build routes, and guide execution. In Avalokita, the experience is intentionally chat-first. The product is designed so that a user can talk to the agent in a familiar ChatGPT-style interface, understand what is happening step by step, and complete an Earn transaction within the same conversation.

## Product Overview

Avalokita is designed around a simple product idea:

- Ask in natural language
- Get live Earn opportunities
- Review a deterministic execution preview
- Execute with wallet confirmation
- Track the actual route outcome

This makes the product useful both as an exploration interface and as an execution layer for real Earn flows.

## Core Experience

The current experience centers on USDC Earn flows and includes:

- Live USDC vault discovery
- Same-chain USDC Earn execution
- Cross-chain USDC Earn execution through LI.FI
- Wallet-executable previews before any signature is requested
- Route outcome tracking across `completed`, `partial`, and `refunded`

## Supported Coverage

Current implementation range:

- Asset focus: `USDC`
- Implemented flow types: same-chain Earn and cross-chain Earn
- Supported business chains: `Ethereum`, `Base`, `Arbitrum`, and `Polygon`
- Representative route combinations include `Ethereum -> Base`, `Ethereum -> Arbitrum`, `Base -> Arbitrum`, `Arbitrum -> Base`, `Base -> Ethereum`, `Arbitrum -> Ethereum`, and `Base -> Polygon`

In practice, this gives the product coverage across:

- same-chain USDC deposits
- cross-chain USDC deposits between ETH-gas ecosystems
- cross-chain USDC deposits into Polygon-target Earn routes

## Why It Matters

DeFi Earn still has a poor end-user experience:

- opportunity discovery is fragmented
- route construction is opaque
- execution steps are easy to misunderstand
- cross-chain confirmation is often confused with final completion

Avalokita addresses that by separating responsibilities clearly:

- the model interprets intent and explains choices
- tools fetch live facts such as vault candidates and LI.FI quotes
- the runtime generates a deterministic preview
- the wallet remains the final execution authority

That structure keeps the product explainable and practical without pretending the model itself should custody or move funds autonomously.

## How To Use

### 1. Start the app

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

For setup and deployment details, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### 2. Connect your wallet

Use the wallet button in the header to connect through RainbowKit / WalletConnect.

### 3. Ask for an Earn action

Example prompts:

- `Go ahead and deposit 0.1 USDC into the best available USDC vault on Base`
- `Deposit 5 USDC into the safest vault on Arbitrum`
- `Move 10 USDC from Base into the best USDC vault on Arbitrum`

### 4. Review the execution preview

Before you sign, the app surfaces:

- selected vault and protocol
- source and destination chains
- amount, fees, gas estimate, and approval target
- route step summary
- execution status and route outcome

### 5. Execute and monitor

If the route is executable, the user can confirm it with their wallet.

For cross-chain flows, the app can surface:

- source transaction
- route transaction
- receiving transaction
- final LI.FI route outcome

## Execution Notes

Avalokita is intentionally productized around clear, reviewable flows.

- The wallet always remains the final execution authority
- Cross-chain results should be evaluated by the final LI.FI route outcome, not only the source-chain confirmation
- Some Polygon destination flows may still require `POL` later for manual follow-up actions
- Destination-chain vault share tokens may need to be imported manually in the wallet before they become visible

## Tech Stack

- Next.js 16
- React 19
- TypeScript 5
- Ant Design / Ant Design X
- Tailwind CSS 4
- AI SDK providers
- wagmi + RainbowKit + viem
- LI.FI REST integration

## Repo Highlights

- `app/`: Next.js routes and server endpoints
- `components/`: chat UI, wallet connection, and execution preview
- `lib/`: planner, LI.FI domain logic, runtime, and execution helpers
- `tests/`: runtime and integration-oriented tests

Key backend entrypoints:

- `POST /api/agents`
- `GET /api/agents`

## Positioning

Avalokita is a focused DeFi Earn product prototype that combines:

- natural-language discovery
- tool-based live data retrieval
- deterministic execution previews
- wallet-confirmed execution

The goal is not to simulate full autonomy. The goal is to make real Earn workflows easier to understand, easier to execute, and easier to verify.
