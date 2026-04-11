/**
 * Earning Agent
 * 职责：推荐最优 vault，计算预期收益
 */

import { generateText, ToolResult } from 'ai';
import { getAgentConfig } from '@/lib/agentConfig';
import { getModelFromConfig } from '@/lib/agentClient';
import { agentTools } from '../tools';
import { SUPPORTED_CHAINS } from '@/lib/chains';

interface EarningAgentInput {
	userMessage: string;
	userAddress: string;
	chainId: number;
}

interface EarningAgentOutput {
	intent: 'earn';
	response: string;
	vaults?: any[];
	selectedVault?: any;
}

export async function earningAgent(
	input: EarningAgentInput,
): Promise<EarningAgentOutput> {
	const { userMessage, userAddress, chainId } = input;

	const agentConfig = getAgentConfig('earning');
	const model = getModelFromConfig(agentConfig);

	const systemPrompt = `你是一个智能的 DeFi 理财助手（Earning Agent）。
你的职责是帮用户发现与推荐最优的收益 vault（Earning Vault）。

当用户表达存入意图时，你需要：
1. 理解用户的需求（金额、链、风险偏好等）
2. 调用 listVaults 工具查询可用的 vault
3. 根据 APY、TVL、风险等因素推荐 TOP 3
4. 非常清楚地用表格或列表展示推荐结果
5. 计算预期收益（调用 estimateYield）

重要：
- 始终用表格格式展示 vault 对比（名称、Protocol、APY、TVL、风险评分）
- 用户获得一个 vault 的 APY 信息后，可以计算他存入后的预期收益
- 回答必须中英文混用，简洁清晰
- 如果用户没有提供链，默认使用 Base (8453)
- 始终彬彬有礼，解释你的推荐理由

示例：
- 用户："我想在 Base 存 500 USDC 最高收益"
- 你回复："根据你的需求，我为你推荐以下 3 个 vault...（表格）...预期 30 天收益约 $X"
`;

	const userPrompt = `用户请求（第一次交互）：
"${userMessage}"

用户地址： ${userAddress}
目标链（Chain ID）： ${chainId} (${SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS]?.name || 'Unknown'})

根据这个请求：
1. 如果是存入请求，先用 listVaults 工具查询该链的顶级 vault（按 APY 排序，limit=10）
2. 从返回的列表中挑选 TOP 3 最合适的 vault（考虑 APY、TVL、Tags 等）
3. 用表格清晰展示推荐结果
4. 如果用户提到了金额，调用 estimateYield 计算 30 天或用户指定时期的收益
5. 给出最终推荐和理由`;

	try {
		const result = await generateText({
			model,
			system: systemPrompt,
			prompt: userPrompt,
			tools: agentTools,
		});

		return {
			intent: 'earn',
			response: result.text,
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		return {
			intent: 'earn',
			response: `抱歉，Earning Agent 出现错误：${errorMsg}。请重试。`,
		};
	}
}
