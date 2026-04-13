import { parseUnits } from 'viem';
import {
	buildRecommendationSummary,
	buildVaultDisplayName,
	normalizeVaultDetailResponse,
	normalizePortfolioPositionsResponse,
	normalizeVaultListResponse,
	rankVaultCandidates,
	type NormalizedPortfolioPosition,
	type NormalizedVaultCandidate,
} from './lifiRuntime';
import { createLifiClient } from './lifiClient';
import type { ExecutionQuote } from './executionRuntime';

export const USDC_TOKEN_BY_CHAIN: Record<number, string> = {
	1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
	8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
	42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
};

export type SearchVaultsResult =
	| {
			success: true;
			dataSource: 'live';
			vaults: NormalizedVaultCandidate[];
			total: number;
	  }
	| {
			success: false;
			dataSource: 'fallback';
			vaults: [];
			error: string;
	  };

export type PortfolioPositionsResult =
	| {
			success: true;
			positions: NormalizedPortfolioPosition[];
	  }
	| {
			success: false;
			positions: [];
			error: string;
	  };

export type BuildQuoteResult =
	| {
			success: true;
			quote: ExecutionQuote;
	  }
	| {
			success: false;
			error: string;
	  };

const lifiClient = createLifiClient();

export async function searchVaults(input: {
	chainId: number;
	limit?: number;
}): Promise<SearchVaultsResult> {
	try {
		const response = await lifiClient.getVaults({
			chainId: input.chainId,
			underlyingTokens: 'USDC',
			limit: input.limit ?? 25,
		});

		if (!response.success) {
			return {
				success: false,
				dataSource: 'fallback',
				vaults: [],
				error: response.error,
			};
		}

		const normalized = normalizeVaultListResponse(response.data);
		if (!normalized.success) {
			return {
				success: false,
				dataSource: 'fallback',
				vaults: [],
				error: normalized.error,
			};
		}

		const total =
			response.data &&
			typeof response.data === 'object' &&
			typeof (response.data as { total?: unknown }).total === 'number'
				? (response.data as { total: number }).total
				: normalized.vaults.length;

		return {
			success: true,
			dataSource: 'live',
			vaults: normalized.vaults,
			total,
		};
	} catch (error) {
		return {
			success: false,
			dataSource: 'fallback',
			vaults: [],
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

export async function getVaultDetails(input: {
	chainId: number;
	address: string;
}): Promise<NormalizedVaultCandidate | null> {
	const response = await lifiClient.getVaultByChainAndAddress({
		chainId: input.chainId,
		address: input.address,
	});

	if (!response.success) {
		return null;
	}

	return normalizeVaultDetailResponse(response.data);
}

export async function getPortfolioPositions(input: {
	userAddress: string;
}): Promise<PortfolioPositionsResult> {
	try {
		const response = await lifiClient.getPortfolioPositions({
			userAddress: input.userAddress,
		});

		if (!response.success) {
			return {
				success: false,
				positions: [],
				error: response.error,
			};
		}

		return {
			success: true,
			positions: normalizePortfolioPositionsResponse(response.data),
		};
	} catch (error) {
		return {
			success: false,
			positions: [],
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

export async function buildDepositQuote(input: {
	sourceChainId: number;
	targetChainId: number;
	amount: number;
	fromAddress: string;
	targetVaultAddress: string;
}): Promise<BuildQuoteResult> {
	try {
		const fromToken = USDC_TOKEN_BY_CHAIN[input.sourceChainId];
		if (!fromToken) {
			return {
				success: false,
				error: `USDC token address is not configured for chain ${input.sourceChainId}.`,
			};
		}

		const amountBaseUnits = parseUnits(String(input.amount), 6).toString();
		const response = await lifiClient.getQuote({
			fromChain: input.sourceChainId,
			toChain: input.targetChainId,
			fromToken,
			toToken: input.targetVaultAddress,
			fromAmount: amountBaseUnits,
			fromAddress: input.fromAddress,
			toAddress: input.fromAddress,
		});

		if (!response.success) {
			return {
				success: false,
				error: response.error,
			};
		}

		return {
			success: true,
			quote: response.data as ExecutionQuote,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

export function selectRecommendedVault(input: {
	vaults: NormalizedVaultCandidate[];
	minApy: number | null;
	riskPreference: 'low' | 'medium' | 'high';
}): {
	selectedVault: NormalizedVaultCandidate | null;
	alternatives: NormalizedVaultCandidate[];
	thresholdSatisfied: boolean;
} {
	const ranked = rankVaultCandidates(input.vaults, {
		minApy: input.minApy,
		limit: 3,
		riskPreference: input.riskPreference,
	});

	const selectedVault = ranked[0] ?? null;
	const thresholdSatisfied =
		selectedVault != null &&
		(input.minApy == null || selectedVault.apyTotal >= input.minApy);

	return {
		selectedVault,
		alternatives: ranked.slice(1),
		thresholdSatisfied,
	};
}

export function renderEarnRecommendation(input: {
	chainName: string;
	dataSource: 'live' | 'fallback';
	fallbackReason?: string;
	selectedVault: NormalizedVaultCandidate | null;
	alternatives: NormalizedVaultCandidate[];
	portfolioPositions: NormalizedPortfolioPosition[];
	plan: {
		amount: number | null;
		sourceChain: number;
		targetChain: number;
		minApy: number | null;
		riskPreference: 'low' | 'medium' | 'high';
		mode: 'recommend' | 'execute';
	};
	executionPreview: {
		canExecute: boolean;
		blockingReason: string | null;
		fees: string;
		routeSource: 'live' | 'fallback';
		executionDurationSeconds: number | null;
	};
	thresholdSatisfied: boolean;
}): string {
	const sections: string[] = [];

	sections.push(
		buildRecommendationSummary({
			chainName: input.chainName,
			dataSource: input.dataSource,
			fallbackReason: input.fallbackReason,
			selectedVault: input.selectedVault,
			alternatives: input.alternatives,
		}),
	);

	if (input.selectedVault) {
		const displayName = buildVaultDisplayName(input.selectedVault);
		const reasons = [
			'## Why This Pick',
			`- Recommended vault: ${displayName}`,
			`- Current live APY: ${input.selectedVault.apyTotal.toFixed(2)}%`,
			`- TVL: $${input.selectedVault.tvlUsd.toLocaleString('en-US')}`,
			`- Protocol: ${input.selectedVault.protocolName}`,
			`- Transactional: ${input.selectedVault.isTransactional ? 'yes' : 'no'}`,
			`- Risk preference: ${input.plan.riskPreference}`,
		];

		if (input.plan.minApy != null && !input.thresholdSatisfied) {
			reasons.push(
				`- No live vault met your ${input.plan.minApy}% APY threshold, so this is the best currently available live USDC vault.`,
			);
		}

		sections.push(reasons.join('\n'));
	}

	if (input.alternatives.length > 0) {
		sections.push(
			[
				'## Alternatives',
				'| Vault | Protocol | APY | TVL |',
				'| --- | --- | --- | --- |',
				...input.alternatives.map(
					(vault) =>
						`| ${vault.name} | ${vault.protocolName} | ${vault.apyTotal.toFixed(
							2,
						)}% | $${vault.tvlUsd.toLocaleString('en-US')} |`,
				),
			].join('\n'),
		);
	}

	if (input.portfolioPositions.length > 0) {
		sections.push(
			[
				'## Wallet Context',
				...input.portfolioPositions.slice(0, 3).map(
					(position) =>
						`- ${position.assetSymbol} on chain ${position.chainId}: ${position.balanceNative.toFixed(4)} (${position.protocolName})`,
				),
			].join('\n'),
		);
	}

	sections.push(
		[
			'## Execution Preview',
			`- Mode: ${input.plan.mode}`,
			`- Source chain: ${input.plan.sourceChain}`,
			`- Target chain: ${input.plan.targetChain}`,
			`- Amount: ${input.plan.amount == null ? 'not provided' : `${input.plan.amount} USDC`}`,
			`- Route source: ${input.executionPreview.routeSource}`,
			`- Estimated fees: ${input.executionPreview.fees}`,
			`- Estimated duration: ${input.executionPreview.executionDurationSeconds == null ? 'n/a' : `${input.executionPreview.executionDurationSeconds}s`}`,
			input.executionPreview.blockingReason
				? `- Blocking reason: ${input.executionPreview.blockingReason}`
				: '- Ready for wallet confirmation',
		].join('\n'),
	);

	return sections.join('\n\n');
}
