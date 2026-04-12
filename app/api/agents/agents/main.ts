import { generateText } from 'ai';
import { getAgentConfig } from '@/lib/agentConfig';
import { getModelFromConfig } from '@/lib/agentClient';
import {
	buildPlannerFallback,
	detectIntentFromMessage,
	extractPlannerPayload,
	type PlannerOutput,
	type SupportedWalletChainId,
} from '@/lib/plannerRuntime';
import { earningAgentStream, type EarningStreamChunk } from './earning';

type MainAgentInput = {
	userMessage: string;
	userAddress: string;
	walletChainId: number;
	messages: Array<{ role: 'user' | 'ai'; content: string }>;
};

export type MainAgentStreamChunk =
	| { type: 'thinking'; content: string }
	| { type: 'response'; content: string }
	| { type: 'error'; content: string }
	| { type: 'plan'; plan: PlannerOutput }
	| EarningStreamChunk
	| {
			type: 'done';
			intent: 'earn' | 'bridge' | 'monitor' | 'unknown';
			chainId: number;
	  };

function buildPlannerPrompt(input: MainAgentInput): string {
	const history = input.messages
		.slice(-6)
		.map((message) => `${message.role}: ${message.content}`)
		.join('\n');

	return [
		`Wallet chain: ${input.walletChainId}`,
		`Current message: ${input.userMessage}`,
		history ? `Recent messages:\n${history}` : '',
	].filter(Boolean).join('\n\n');
}

async function planRequest(input: MainAgentInput): Promise<PlannerOutput> {
	const fallback = buildPlannerFallback({
		message: input.userMessage,
		walletChainId: input.walletChainId,
	});

	try {
		const config = getAgentConfig('main');
		const model = getModelFromConfig(config);
		const result = await generateText({
			model,
			temperature: 0,
			maxTokens: 400,
			system: [
				'You are the planner for a DeFi earn application.',
				'Return JSON only.',
				'Supported intents: earn.deposit, bridge, monitor, unknown.',
				'Supported asset in this version: USDC.',
				'Supported chains in this version: Ethereum(1), Base(8453), Arbitrum(42161).',
				'Use execute mode only when the user clearly asks to proceed now.',
				'Schema:',
				'{"intent":"earn.deposit|bridge|monitor|unknown","asset":"USDC","amount":500,"sourceChain":1,"targetChain":8453,"minApy":5,"riskPreference":"low|medium|high","needsConfirmation":true,"mode":"recommend|execute"}',
			].join('\n'),
			prompt: buildPlannerPrompt(input),
		});

		return extractPlannerPayload(result.text, input.walletChainId);
	} catch {
		return fallback;
	}
}

function unsupportedIntentMessage(intent: 'bridge' | 'monitor'): string {
	if (intent === 'bridge') {
		return [
			'## Bridge 暂未开放',
			'当前版本先把 Earn 主线做稳，Bridge 会在下一阶段恢复。',
			'你现在可以这样问：Find the best USDC vault on Base',
		].join('\n\n');
	}

	return [
		'## Monitor 暂未开放',
		'当前版本先把 Earn 主线做稳，Monitor 会在后续阶段恢复。',
		'你现在可以这样问：Find the best USDC vault on Arbitrum',
	].join('\n\n');
}

function unknownIntentMessage(): string {
	return [
		'我目前只开放了 Earn 主线。',
		'支持链：Base、Arbitrum、Ethereum。',
		'当前演示资产：USDC。',
		'你可以这样问：put 500 USDC into the safest vault above 5% APY on Arbitrum',
	].join('\n\n');
}

export async function* mainAgentStream(
	input: MainAgentInput,
): AsyncGenerator<MainAgentStreamChunk> {
	yield { type: 'thinking', content: 'Planning request...\n' };

	const plan = await planRequest(input);
	const detected = detectIntentFromMessage(input.userMessage);
	const effectiveIntent =
		plan.intent === 'unknown' && detected.intent !== 'unknown'
			? detected.intent
			: plan.intent;

	if (effectiveIntent === 'earn.deposit') {
		for await (const chunk of earningAgentStream({
			userMessage: input.userMessage,
			userAddress: input.userAddress,
			plan,
		})) {
			yield chunk;
		}

		yield {
			type: 'done',
			intent: 'earn',
			chainId: plan.targetChain as SupportedWalletChainId,
		};
		return;
	}

	if (effectiveIntent === 'bridge' || effectiveIntent === 'monitor') {
		yield { type: 'response', content: unsupportedIntentMessage(effectiveIntent) };
		yield {
			type: 'done',
			intent: effectiveIntent,
			chainId: plan.targetChain,
		};
		return;
	}

	yield { type: 'response', content: unknownIntentMessage() };
	yield {
		type: 'done',
		intent: 'unknown',
		chainId: plan.targetChain,
	};
}
