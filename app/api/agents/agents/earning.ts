import { generateText } from 'ai';
import { getAgentConfig } from '@/lib/agentConfig';
import { getModelFromConfig } from '@/lib/agentClient';
import type { AgentStepEvent } from '@/lib/agentSteps';
import { buildExecutionPreview, type ExecutionPreview } from '@/lib/executionRuntime';
import {
	buildVaultDisplayName,
	type NormalizedVaultCandidate,
	type NormalizedPortfolioPosition,
} from '@/lib/lifiRuntime';
import type { PlannerOutput } from '@/lib/plannerRuntime';
import { SUPPORTED_CHAINS } from '@/lib/chains';
import {
	createEarnAgentTools,
	runGetPortfolio,
	runListVaults,
	type AgentToolResult,
	type ComposerQuoteToolData,
	type ListVaultsToolData,
	type PortfolioToolData,
} from '../tools';
import { renderEarnRecommendation } from '@/lib/lifiDomain';

export type EarningAgentInput = {
	userMessage: string;
	userAddress: string;
	plan: PlannerOutput;
	messages: Array<{ role: 'user' | 'ai'; content: string }>;
};

export type EarningStreamChunk =
	| { type: 'thinking'; content: string }
	| { type: 'response'; content: string }
	| { type: 'error'; content: string }
	| { type: 'plan'; plan: PlannerOutput }
	| AgentStepEvent
	| {
			type: 'execution_preview';
			preview: ExecutionPreview;
			selectedVault: NormalizedVaultCandidate | null;
			alternatives: NormalizedVaultCandidate[];
	  };

type EarnRuntimeState = {
	listVaults: AgentToolResult<ListVaultsToolData> | null;
	portfolio: AgentToolResult<PortfolioToolData> | null;
	quote: AgentToolResult<ComposerQuoteToolData> | null;
};

function chainName(chainId: number): string {
	return (
		SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS]?.name ||
		`Chain ${chainId}`
	);
}

function buildEarnPrompt(input: EarningAgentInput): string {
	const history = input.messages
		.slice(-6)
		.map((message) => `${message.role}: ${message.content}`)
		.join('\n');

	return [
		`User wallet: ${input.userAddress}`,
		`Current request: ${input.userMessage}`,
		`Structured plan: ${JSON.stringify(input.plan)}`,
		history ? `Recent messages:\n${history}` : '',
	]
		.filter(Boolean)
		.join('\n\n');
}

function buildEarnSystemPrompt(): string {
	return [
		'You are the LI.FI AI Earn agent for a USDC-focused DeFi assistant.',
		'You must call tools to gather facts before recommending anything.',
		'Only support USDC on Ethereum (1), Base (8453), and Arbitrum (42161).',
		'Always call listVaults before making a recommendation.',
		'Call getPortfolio only if wallet context helps explain the recommendation.',
		'Call getVaultDetail only when you need extra facts about a candidate vault.',
		'If the user provided an amount, call buildComposerQuote after you know the selected vault address.',
		'You may call estimateYield to explain projected returns.',
		'Never invent vault names, APY, TVL, fee, or quote data.',
		'Never claim a transaction has executed. Wallet confirmation and transaction submission happen outside of the model.',
		'Write a concise recommendation that references tool results.',
	].join('\n');
}

function toNormalizedVault(
	vault: ListVaultsToolData['selectedVault'],
	chainId: number,
): NormalizedVaultCandidate | null {
	if (!vault) {
		return null;
	}

	return {
		address: vault.address,
		chainId,
		name: vault.name,
		protocolName: vault.protocol,
		underlyingSymbol: vault.underlyingTokens[0] ?? 'USDC',
		underlyingTokenAddress: '',
		apyTotal: Number(vault.apy),
		tvlUsd: vault.tvl,
		tags: vault.tags,
		isTransactional: vault.openForDeposits,
		isRedeemable: false,
		dataSource: 'live',
	};
}

function toNormalizedAlternatives(
	alternatives: ListVaultsToolData['alternatives'],
	chainId: number,
): NormalizedVaultCandidate[] {
	return alternatives.map((vault) => ({
		address: vault.address,
		chainId,
		name: vault.name,
		protocolName: vault.protocol,
		underlyingSymbol: vault.underlyingTokens[0] ?? 'USDC',
		underlyingTokenAddress: '',
		apyTotal: Number(vault.apy),
		tvlUsd: vault.tvl,
		tags: vault.tags,
		isTransactional: vault.openForDeposits,
		isRedeemable: false,
		dataSource: 'live',
	}));
}

function toPortfolioPositions(
	result: AgentToolResult<PortfolioToolData> | null,
): NormalizedPortfolioPosition[] {
	return result?.success ? result.data.positions : [];
}

function buildFallbackResponse(input: {
	plan: PlannerOutput;
	listVaults: AgentToolResult<ListVaultsToolData> | null;
}): string {
	if (!input.listVaults) {
		return 'I could not fetch LI.FI Earn vault data, so I cannot make a safe recommendation yet.';
	}

	if (!input.listVaults.success) {
		return [
			'Source: live',
			input.listVaults.summary,
			'Execution preview is unavailable until vault discovery succeeds.',
		].join('\n\n');
	}

	if (!input.listVaults.data.selectedVault) {
		return [
			'Source: live',
			`No live transactional USDC vaults are currently available on ${chainName(
				input.plan.targetChain,
			)}.`,
			'Execution preview is unavailable because there is no vault to target.',
		].join('\n\n');
	}

	return input.listVaults.summary;
}

function combineResponseSections(modelText: string, deterministicText: string): string {
	const trimmedModelText = modelText.trim();
	if (!trimmedModelText) {
		return deterministicText;
	}

	return [`## Agent Summary`, trimmedModelText, deterministicText].join('\n\n');
}

export async function* earningAgentStream(
	input: EarningAgentInput,
): AsyncGenerator<EarningStreamChunk> {
	yield { type: 'plan', plan: input.plan };
	yield {
		type: 'step',
		key: 'planning',
		title: 'Planning',
		status: 'completed',
		summary: `Earn plan ready for ${chainName(input.plan.targetChain)}.`,
	};
	yield { type: 'thinking', content: 'Calling safe LI.FI Earn tools...\n' };

	const runtimeState: EarnRuntimeState = {
		listVaults: null,
		portfolio: null,
		quote: null,
	};
	const stepLog: AgentStepEvent[] = [];

	const tools = createEarnAgentTools({
		plan: input.plan,
		userAddress: input.userAddress,
		callbacks: {
			onStep: (event) => {
				stepLog.push(event);
			},
			onResult: (name, result) => {
				if (name === 'listVaults') {
					runtimeState.listVaults = result as AgentToolResult<ListVaultsToolData>;
				} else if (name === 'getPortfolio') {
					runtimeState.portfolio = result as AgentToolResult<PortfolioToolData>;
				} else if (name === 'buildComposerQuote') {
					runtimeState.quote = result as AgentToolResult<ComposerQuoteToolData>;
				}
			},
		},
	});

	let modelText = '';
	let modelReasoning = '';

	try {
		const model = getModelFromConfig(getAgentConfig('earning'));
		const result = await generateText({
			model,
			temperature: 0,
			maxTokens: 900,
			maxSteps: 6,
			system: buildEarnSystemPrompt(),
			prompt: buildEarnPrompt(input),
			tools,
			experimental_activeTools: [
				'listVaults',
				'getVaultDetail',
				'getPortfolio',
				'estimateYield',
				'buildComposerQuote',
			],
		});
		modelText = result.text;
		modelReasoning = result.reasoning ?? '';
	} catch (error) {
		yield {
			type: 'error',
			content:
				error instanceof Error ? error.message : 'Tool-driven earn planning failed.',
		};
		return;
	}

	if (!runtimeState.listVaults) {
		runtimeState.listVaults = await runListVaults(
			{
				chainId: input.plan.targetChain,
				token: input.plan.asset,
				minApy: input.plan.minApy ?? undefined,
				limit: 3,
			},
			{
				plan: input.plan,
				userAddress: input.userAddress,
			},
		);
	}

	if (!runtimeState.portfolio) {
		runtimeState.portfolio = await runGetPortfolio(
			{
				userAddress: input.userAddress,
				chainId: input.plan.targetChain,
			},
			{
				plan: input.plan,
				userAddress: input.userAddress,
			},
		);
	}

	for (const step of stepLog) {
		yield step;
	}

	if (modelReasoning.trim()) {
		yield { type: 'thinking', content: `${modelReasoning.trim()}\n` };
	}

	const listVaults = runtimeState.listVaults;
	const selectedVault =
		listVaults?.success && listVaults.data.selectedVault
			? toNormalizedVault(listVaults.data.selectedVault, input.plan.targetChain)
			: null;
	const alternatives =
		listVaults?.success && listVaults.data.alternatives.length > 0
			? toNormalizedAlternatives(
					listVaults.data.alternatives,
					input.plan.targetChain,
				)
			: [];

	if (!selectedVault || !listVaults?.success) {
		yield {
			type: 'response',
			content: buildFallbackResponse({
				plan: input.plan,
				listVaults,
			}),
		};
		return;
	}

	const executionPreview = buildExecutionPreview({
		plan: input.plan,
		selectedVault: {
			address: selectedVault.address,
			name: selectedVault.name,
			displayName: buildVaultDisplayName(selectedVault),
			dataSource: selectedVault.dataSource,
		},
		quote:
			runtimeState.quote?.success
				? {
						action: runtimeState.quote.data.action,
						estimate: runtimeState.quote.data.estimate as {
							approvalAddress?: string;
							toAmount?: string;
							toAmountMin?: string;
							executionDuration?: number;
							feeCosts?: Array<{ amountUSD?: string }>;
							gasCosts?: Array<{
								amount?: string;
								amountUSD?: string;
								token?: { symbol?: string };
							}>;
						},
						tool: runtimeState.quote.data.tool,
						transactionRequest: runtimeState.quote.data.transactionRequest,
						transactionId: runtimeState.quote.data.transactionId,
					}
				: null,
	});

	yield {
		type: 'step',
		key: 'recommendation_ready',
		title: 'Recommendation Ready',
		status: 'completed',
		summary: runtimeState.quote?.success
			? 'Recommendation, quote, and execution preview are ready.'
			: 'Recommendation is ready. Quote is unavailable, so execution remains blocked.',
	};

	yield {
		type: 'execution_preview',
		preview: executionPreview,
		selectedVault,
		alternatives,
	};

	const deterministicText = renderEarnRecommendation({
		chainName: chainName(input.plan.targetChain),
		dataSource: 'live',
		fallbackReason:
			runtimeState.quote && !runtimeState.quote.success
				? runtimeState.quote.error
				: undefined,
		selectedVault,
		alternatives,
		portfolioPositions: toPortfolioPositions(runtimeState.portfolio),
		plan: input.plan,
		executionPreview,
		thresholdSatisfied: listVaults.data.thresholdSatisfied,
	});

	yield {
		type: 'response',
		content: combineResponseSections(modelText, deterministicText),
	};
}
