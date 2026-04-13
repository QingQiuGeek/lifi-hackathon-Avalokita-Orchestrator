export type ExecutionEligibility =
	| 'ready'
	| 'blocked_missing_amount'
	| 'blocked_quote_failure'
	| 'blocked_wallet_context'
	| 'blocked_missing_approval_target'
	| 'blocked_insufficient_gas';

export type ExecutionQuoteTransactionRequest = {
	to?: string;
	data?: string;
	value?: string;
	gasLimit?: string;
	gasPrice?: string;
};

export type ExecutionQuote = {
	action?: {
		fromAmount?: string;
		fromToken?: {
			address?: string;
			symbol?: string;
		};
	};
	estimate?: {
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
	};
	tool?: string;
	transactionRequest?: ExecutionQuoteTransactionRequest;
	transactionId?: string;
};

export type ExecutionPreview = {
	canExecute: boolean;
	eligibility: ExecutionEligibility;
	blockingReason: string | null;
	routeSource: 'live' | 'fallback';
	fromChain: number;
	toChain: number;
	fromToken: string;
	fromAmount: string | null;
	targetVault: string;
	targetVaultAddress: string;
	estimatedReceived: string | null;
	minimumReceived: string | null;
	fees: string;
	executionDurationSeconds: number | null;
	requiresApproval: boolean;
	approvalAddress: string | null;
	estimatedGasUsd: string | null;
	estimatedGasNative: string | null;
	quote: ExecutionQuote | null;
};

type PreviewInput = {
	plan: {
		intent: string;
		asset: string;
		amount: number | null;
		sourceChain: number;
		targetChain: number;
		minApy: number | null;
		riskPreference: string;
		needsConfirmation: boolean;
		mode: string;
	};
	selectedVault: {
		address: string;
		name: string;
		displayName?: string;
		dataSource: 'live' | 'fallback';
	};
	quote: ExecutionQuote | null;
};

function hasValidAmount(amount: number | null): amount is number {
	return typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
}

function sumUsdFees(feeCosts: Array<{ amountUSD?: string }> = []): string {
	const total = feeCosts.reduce((sum, item) => {
		const value = Number(item.amountUSD ?? 0);
		return Number.isFinite(value) ? sum + value : sum;
	}, 0);

	return total > 0 ? `$${total.toFixed(2)}` : '$0.00';
}

function sumGasAmounts(
	gasCosts:
		| Array<{
				amount?: string;
				amountUSD?: string;
				token?: { symbol?: string };
		  }>
		| undefined,
) {
	const totals = (gasCosts ?? []).reduce(
		(acc, cost) => {
			const usd = Number(cost.amountUSD ?? 0);
			if (Number.isFinite(usd)) {
				acc.usd += usd;
			}

			if (!acc.symbol && cost.token?.symbol) {
				acc.symbol = cost.token.symbol;
			}

			try {
				if (cost.amount) {
					acc.native += BigInt(cost.amount);
				}
			} catch {
				// Ignore malformed gas amounts and keep deterministic output.
			}

			return acc;
		},
		{ usd: 0, native: BigInt(0), symbol: '' },
	);

	return {
		usd:
			totals.usd > 0
				? `$${totals.usd.toFixed(2)}`
				: null,
		native:
			totals.native > 0
				? `${totals.native.toString()}${totals.symbol ? ` ${totals.symbol}` : ''}`
				: null,
	};
}

export function buildExecutionPreview(input: PreviewInput): ExecutionPreview {
	if (!hasValidAmount(input.plan.amount)) {
		return {
			canExecute: false,
			eligibility: 'blocked_missing_amount',
			blockingReason:
				'A USDC amount is required before execution can proceed.',
			routeSource: input.selectedVault.dataSource,
			fromChain: input.plan.sourceChain,
			toChain: input.plan.targetChain,
			fromToken: input.plan.asset,
			fromAmount: null,
			targetVault: input.selectedVault.displayName ?? input.selectedVault.name,
			targetVaultAddress: input.selectedVault.address,
			estimatedReceived: null,
			minimumReceived: null,
			fees: '$0.00',
			executionDurationSeconds: null,
			requiresApproval: false,
			approvalAddress: null,
			estimatedGasUsd: null,
			estimatedGasNative: null,
			quote: input.quote,
		};
	}

	if (input.plan.sourceChain !== input.plan.targetChain) {
		return {
			canExecute: false,
			eligibility: 'blocked_quote_failure',
			blockingReason:
				'Cross-chain Earn execution is not enabled in this version yet.',
			routeSource: input.selectedVault.dataSource,
			fromChain: input.plan.sourceChain,
			toChain: input.plan.targetChain,
			fromToken: input.plan.asset,
			fromAmount: String(input.plan.amount),
			targetVault: input.selectedVault.displayName ?? input.selectedVault.name,
			targetVaultAddress: input.selectedVault.address,
			estimatedReceived: input.quote?.estimate?.toAmount ?? null,
			minimumReceived: input.quote?.estimate?.toAmountMin ?? null,
			fees: sumUsdFees(input.quote?.estimate?.feeCosts),
			executionDurationSeconds: input.quote?.estimate?.executionDuration ?? null,
			requiresApproval: false,
			approvalAddress: input.quote?.estimate?.approvalAddress ?? null,
			estimatedGasUsd: sumGasAmounts(input.quote?.estimate?.gasCosts).usd,
			estimatedGasNative: sumGasAmounts(input.quote?.estimate?.gasCosts).native,
			quote: input.quote,
		};
	}

	if (input.quote == null) {
		return {
			canExecute: false,
			eligibility: 'blocked_quote_failure',
			blockingReason: 'Live LI.FI quote data is unavailable right now.',
			routeSource: input.selectedVault.dataSource,
			fromChain: input.plan.sourceChain,
			toChain: input.plan.targetChain,
			fromToken: input.plan.asset,
			fromAmount: String(input.plan.amount),
			targetVault: input.selectedVault.displayName ?? input.selectedVault.name,
			targetVaultAddress: input.selectedVault.address,
			estimatedReceived: null,
			minimumReceived: null,
			fees: '$0.00',
			executionDurationSeconds: null,
			requiresApproval: false,
			approvalAddress: null,
			estimatedGasUsd: null,
			estimatedGasNative: null,
			quote: null,
		};
	}

	if (!input.quote.estimate?.approvalAddress) {
		return {
			canExecute: false,
			eligibility: 'blocked_missing_approval_target',
			blockingReason:
				'LI.FI quote is missing the approval target required for ERC20 execution.',
			routeSource: 'live',
			fromChain: input.plan.sourceChain,
			toChain: input.plan.targetChain,
			fromToken: input.plan.asset,
			fromAmount: String(input.plan.amount),
			targetVault: input.selectedVault.displayName ?? input.selectedVault.name,
			targetVaultAddress: input.selectedVault.address,
			estimatedReceived: input.quote.estimate?.toAmount ?? null,
			minimumReceived: input.quote.estimate?.toAmountMin ?? null,
			fees: sumUsdFees(input.quote.estimate?.feeCosts),
			executionDurationSeconds: input.quote.estimate?.executionDuration ?? null,
			requiresApproval: false,
			approvalAddress: null,
			estimatedGasUsd: sumGasAmounts(input.quote.estimate?.gasCosts).usd,
			estimatedGasNative: sumGasAmounts(input.quote.estimate?.gasCosts).native,
			quote: input.quote,
		};
	}

	const gasSummary = sumGasAmounts(input.quote.estimate?.gasCosts);

	return {
		canExecute:
			Boolean(
				input.quote.transactionRequest?.to && input.quote.transactionRequest?.data,
			),
		eligibility:
			input.quote.transactionRequest?.to && input.quote.transactionRequest?.data
				? 'ready'
				: 'blocked_quote_failure',
		blockingReason:
			input.quote.transactionRequest?.to && input.quote.transactionRequest?.data
				? null
				: 'LI.FI quote is missing executable transaction data.',
		routeSource: 'live',
		fromChain: input.plan.sourceChain,
		toChain: input.plan.targetChain,
		fromToken: input.plan.asset,
		fromAmount: String(input.plan.amount),
		targetVault: input.selectedVault.displayName ?? input.selectedVault.name,
		targetVaultAddress: input.selectedVault.address,
		estimatedReceived: input.quote.estimate?.toAmount ?? null,
		minimumReceived: input.quote.estimate?.toAmountMin ?? null,
		fees: sumUsdFees(input.quote.estimate?.feeCosts),
		executionDurationSeconds: input.quote.estimate?.executionDuration ?? null,
		requiresApproval: true,
		approvalAddress: input.quote.estimate?.approvalAddress ?? null,
		estimatedGasUsd: gasSummary.usd,
		estimatedGasNative: gasSummary.native,
		quote: input.quote,
	};
}

export function collectTransactionHashes(route: {
	steps?: Array<{
		execution?: {
			process?: Array<{ txHash?: string | null | undefined }>;
		};
	}>;
} | null): string[] {
	if (!route?.steps) {
		return [];
	}

	const hashes = new Set<string>();
	for (const step of route.steps) {
		for (const process of step.execution?.process ?? []) {
			if (typeof process.txHash === 'string' && process.txHash) {
				hashes.add(process.txHash);
			}
		}
	}

	return [...hashes];
}
