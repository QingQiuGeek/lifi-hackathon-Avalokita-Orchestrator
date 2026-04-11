/**
 * Main Agent - Intent Router
 * 职责：理解用户意图，分类后转发给对应的 Sub-Agent
 */

import { generateText } from 'ai';
import { getAgentConfig } from '@/lib/agentConfig';
import { getModelFromConfig } from '@/lib/agentClient';
import { earningAgent } from './earning';

interface MainAgentInput {
	userMessage: string;
	userAddress: string;
	chainId?: number;
}

interface MainAgentOutput {
	intent: 'earn' | 'bridge' | 'monitor' | 'unknown';
	chainId: number;
	response: string;
}

export async function mainAgent(
	input: MainAgentInput,
): Promise<MainAgentOutput> {
	const { userMessage, userAddress, chainId = 8453 } = input; // 默认 Base 链

	// Step 1: 意图识别
	const intentConfig = getAgentConfig('main');
	const intentModel = getModelFromConfig(intentConfig);

	const intentSystemPrompt = `你是一个智能的意图识别器（Intent Router）。
你需要理解用户在 DeFi 收益和跨链转账中的真实意图。

可能的意图包括：
1. earn - 用户想要存入资产到收益 vault，赚取收益
   关键词：存、deposit、yield、earn、赚、收益、vault、最高、安全
2. bridge - 用户想要跨链转账
   关键词：转、转账、bridge、swap、跨链、从...到..., from...to...
3. monitor - 用户想查询仓位、收益、账户状态
   关键词：查、查询、余额、仓位、收益、怎么样、status、position
4. unknown - 无法识别的请求

你需要：
1. 识别用户的意图（只返回上面的 4 个之一）
2. 提取链信息（如果有提到特定的链）
3. 严格按照以下 JSON 格式返回，不做任何其他处理：
{
  "intent": "earn|bridge|monitor|unknown",
  "chainId": 8453,  // 如果用户提到链，转换为 chainId；不确定则用 8453（Base）
  "confidence": 0.95
}`;

	const intentPrompt = `用户消息："${userMessage}"

请识别意图并返回 JSON 格式的结果。`;

	let recognizedIntent = 'unknown';
	let recognizedChainId = chainId;

	try {
		const intentResult = await generateText({
			model: intentModel,
			system: intentSystemPrompt,
			prompt: intentPrompt,
			temperature: 0.3,
			maxTokens: 200,
		});

		// 尝试解析 JSON
		const jsonMatch = intentResult.text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);
			recognizedIntent = parsed.intent || 'unknown';
			recognizedChainId = parsed.chainId || chainId;
		}
	} catch (error) {
		console.error('Intent recognition error:', error);
	}

	// Step 2: 根据意图转发给子 Agent
	let response = '';

	try {
		switch (recognizedIntent) {
			case 'earn':
				const earningResult = await earningAgent({
					userMessage,
					userAddress,
					chainId: recognizedChainId,
				});
				response = earningResult.response;
				break;

			case 'bridge':
				response = `🌉 Bridge Agent (即将推出)\n\n你想要跨链转账。目前我们的 Bridge Agent 还在开发中，预计 Phase 2 上线。\n\n你可以说："把我的 USDC 从 Ethereum 转到 Base"，我会帮你找到最优的桥接路由。`;
				break;

			case 'monitor':
				response = `📊 Monitor Agent (即将推出)\n\n你想查询仓位或收益。Monitor Agent 会在 Phase 3 上线，支持实时查询你的 Earn 收益、仓位变化等。`;
				break;

			case 'unknown':
			default:
				response = `我没有完全理解你的意思。😅\n\n我目前支持以下功能：\n1️⃣ **Earn** - "我想在 Base 存 500 USDC 最高收益"\n2️⃣ **Bridge** - "把 USDC 从 Ethereum 转到 Base"（开发中）\n3️⃣ **Monitor** - "我的仓位怎么样？"（开发中）\n\n请用更清楚的表述，我会尽力帮助你！`;
				break;
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		response = `处理请求时出错：${errorMsg}。请重试。`;
		recognizedIntent = 'unknown';
	}

	return {
		intent: recognizedIntent as 'earn' | 'bridge' | 'monitor' | 'unknown',
		chainId: recognizedChainId,
		response,
	};
}
