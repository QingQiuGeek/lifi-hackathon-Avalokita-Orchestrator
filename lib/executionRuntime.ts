export type ExecutionPreview = {
	canExecute: boolean;
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
	quote: unknown;
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
	quote: {
		estimate?: {
			toAmount?: string;
			toAmountMin?: string;
			executionDuration?: number;
			feeCosts?: Array<{ amountUSD?: string }>;
		};
		tool?: string;
	} | null;
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

export function buildExecutionPreview(input: PreviewInput): ExecutionPreview {
	if (!hasValidAmount(input.plan.amount)) {
		return {
			canExecute: false,
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
			quote: input.quote,
		};
	}

	return {
		canExecute: input.quote != null,
		blockingReason:
			input.quote == null
				? 'Live LI.FI quote data is unavailable right now.'
				: null,
		routeSource: input.quote ? 'live' : input.selectedVault.dataSource,
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
