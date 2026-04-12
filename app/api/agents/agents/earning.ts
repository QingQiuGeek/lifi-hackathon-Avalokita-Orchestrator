import { buildExecutionPreview, type ExecutionPreview } from '@/lib/executionRuntime';
import {
	buildDepositQuote,
	getPortfolioPositions,
	renderEarnRecommendation,
	searchVaults,
	selectRecommendedVault,
} from '@/lib/lifiDomain';
import type { NormalizedVaultCandidate } from '@/lib/lifiRuntime';
import type { PlannerOutput } from '@/lib/plannerRuntime';
import { SUPPORTED_CHAINS } from '@/lib/chains';

export type EarningAgentInput = {
	userMessage: string;
	userAddress: string;
	plan: PlannerOutput;
};

export type EarningStreamChunk =
	| { type: 'thinking'; content: string }
	| { type: 'response'; content: string }
	| { type: 'error'; content: string }
	| { type: 'plan'; plan: PlannerOutput }
	| {
			type: 'execution_preview';
			preview: ExecutionPreview;
			selectedVault: NormalizedVaultCandidate | null;
			alternatives: NormalizedVaultCandidate[];
	  };

function chainName(chainId: number): string {
	return (
		SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS]?.name ||
		`Chain ${chainId}`
	);
}

export async function* earningAgentStream(
	input: EarningAgentInput,
): AsyncGenerator<EarningStreamChunk> {
	yield { type: 'plan', plan: input.plan };
	yield { type: 'thinking', content: 'Searching live LI.FI vaults...\n' };

	const vaultResult = await searchVaults({
		chainId: input.plan.targetChain,
		limit: 25,
	});

	if (!vaultResult.success) {
		yield {
			type: 'response',
			content: [
				'Source: fallback',
				`LI.FI live vault search failed: ${vaultResult.error}`,
				'No controlled fallback registry is configured in this branch, so I cannot safely recommend a vault yet.',
			].join('\n\n'),
		};
		return;
	}

	const recommendation = selectRecommendedVault({
		vaults: vaultResult.vaults,
		minApy: input.plan.minApy,
		riskPreference: input.plan.riskPreference,
	});

	if (!recommendation.selectedVault) {
		yield {
			type: 'response',
			content: [
				'Source: live',
				`No live transactional USDC vaults are currently available on ${chainName(
					input.plan.targetChain,
				)}.`,
				'Execution preview is unavailable because there is no vault to target.',
			].join('\n\n'),
		};
		return;
	}

	yield { type: 'thinking', content: 'Checking wallet context...\n' };
	const portfolioResult = await getPortfolioPositions({
		userAddress: input.userAddress,
	});

	let quotePayload: Record<string, unknown> | null = null;
	let quoteError: string | null = null;

	if (input.plan.amount != null) {
		yield { type: 'thinking', content: 'Building LI.FI execution quote...\n' };
		const quoteResult = await buildDepositQuote({
			sourceChainId: input.plan.sourceChain,
			targetChainId: input.plan.targetChain,
			amount: input.plan.amount,
			fromAddress: input.userAddress,
			targetVaultAddress: recommendation.selectedVault.address,
		});

		if (quoteResult.success) {
			quotePayload = quoteResult.quote;
		} else {
			quoteError = quoteResult.error;
		}
	}

	const executionPreview = buildExecutionPreview({
		plan: input.plan,
		selectedVault: recommendation.selectedVault,
		quote: quotePayload as {
			estimate?: {
				toAmount?: string;
				toAmountMin?: string;
				executionDuration?: number;
				feeCosts?: Array<{ amountUSD?: string }>;
			};
			tool?: string;
		} | null,
	});

	yield {
		type: 'execution_preview',
		preview: executionPreview,
		selectedVault: recommendation.selectedVault,
		alternatives: recommendation.alternatives,
	};

	const content = renderEarnRecommendation({
		chainName: chainName(input.plan.targetChain),
		dataSource: 'live',
		fallbackReason: quoteError || undefined,
		selectedVault: recommendation.selectedVault,
		alternatives: recommendation.alternatives,
		portfolioPositions: portfolioResult.success ? portfolioResult.positions : [],
		plan: input.plan,
		executionPreview,
		thresholdSatisfied: recommendation.thresholdSatisfied,
	});

	yield { type: 'response', content };
}
