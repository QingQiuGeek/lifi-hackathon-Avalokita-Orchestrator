export const SUPPORTED_WALLET_CHAIN_IDS = [1, 8453, 42161] as const;
export const DEFAULT_WALLET_CHAIN_ID = 8453;

export type SupportedWalletChainId =
	(typeof SUPPORTED_WALLET_CHAIN_IDS)[number];
export type PlannerIntent = 'earn.deposit' | 'bridge' | 'monitor' | 'unknown';
export type PlannerMode = 'recommend' | 'execute';
export type RiskPreference = 'low' | 'medium' | 'high';

export type PlannerOutput = {
	intent: PlannerIntent;
	asset: 'USDC';
	amount: number | null;
	sourceChain: SupportedWalletChainId;
	targetChain: SupportedWalletChainId;
	minApy: number | null;
	riskPreference: RiskPreference;
	needsConfirmation: boolean;
	mode: PlannerMode;
};

function normalizeAmount(value: unknown): number | null {
	const amount = Number(value);
	if (!Number.isFinite(amount) || amount <= 0) {
		return null;
	}

	return amount;
}

function parseAmount(message: string): number | null {
	const match = message.match(/\b(\d[\d,]*\.?\d*)\s*usdc\b/i);
	if (!match) {
		return null;
	}

	return normalizeAmount(match[1].replace(/,/g, ''));
}

function parseMinApy(message: string): number | null {
	const match = message.match(/(\d+(?:\.\d+)?)\s*%\s*apy/i);
	if (match) {
		const value = Number(match[1]);
		return Number.isFinite(value) ? value : null;
	}

	const thresholdMatch = message.match(/above\s*(\d+(?:\.\d+)?)\s*%/i);
	if (thresholdMatch) {
		const value = Number(thresholdMatch[1]);
		return Number.isFinite(value) ? value : null;
	}

	return null;
}

function includesAny(message: string, patterns: string[]): boolean {
	return patterns.some((pattern) => message.includes(pattern));
}

function parseChainByName(message: string): SupportedWalletChainId | null {
	const lowered = message.toLowerCase();
	if (lowered.includes('arbitrum')) {
		return 42161;
	}
	if (lowered.includes('ethereum')) {
		return 1;
	}
	if (lowered.includes('base')) {
		return 8453;
	}

	return null;
}

function parseSourceChain(message: string): SupportedWalletChainId | null {
	const lowered = message.toLowerCase();
	if (lowered.includes('from arbitrum')) {
		return 42161;
	}
	if (lowered.includes('from ethereum')) {
		return 1;
	}
	if (lowered.includes('from base')) {
		return 8453;
	}

	return null;
}

function parseTargetChain(message: string): SupportedWalletChainId | null {
	const lowered = message.toLowerCase();
	if (
		lowered.includes('on arbitrum') ||
		lowered.includes('into arbitrum') ||
		lowered.includes('to arbitrum')
	) {
		return 42161;
	}
	if (
		lowered.includes('on ethereum') ||
		lowered.includes('into ethereum') ||
		lowered.includes('to ethereum')
	) {
		return 1;
	}
	if (
		lowered.includes('on base') ||
		lowered.includes('into base') ||
		lowered.includes('to base')
	) {
		return 8453;
	}

	return null;
}

export function resolveWalletChainId(
	chainId: number | null | undefined,
): SupportedWalletChainId {
	if (
		typeof chainId === 'number' &&
		SUPPORTED_WALLET_CHAIN_IDS.includes(chainId as SupportedWalletChainId)
	) {
		return chainId as SupportedWalletChainId;
	}

	return DEFAULT_WALLET_CHAIN_ID;
}

export function detectIntentFromMessage(message: string): {
	intent: PlannerIntent;
	actionMode: PlannerMode;
} {
	const lowered = message.trim().toLowerCase();
	const actionMode = includesAny(lowered, [
		'go ahead',
		'execute',
		'run it',
		'deposit now',
		'confirm',
	])
		? 'execute'
		: 'recommend';

	if (
		includesAny(lowered, [
			'vault',
			'apy',
			'yield',
			'deposit',
			'put my',
			'put ',
			'earn',
			'safest',
		])
	) {
		return { intent: 'earn.deposit', actionMode };
	}

	if (includesAny(lowered, ['bridge', 'swap from', 'transfer from'])) {
		return { intent: 'bridge', actionMode };
	}

	if (includesAny(lowered, ['monitor', 'positions', 'portfolio', 'balance'])) {
		return { intent: 'monitor', actionMode };
	}

	return { intent: 'unknown', actionMode };
}

export function buildPlannerFallback(input: {
	message: string;
	walletChainId: number | null | undefined;
}): PlannerOutput {
	const normalizedWalletChain = resolveWalletChainId(input.walletChainId);
	const lowered = input.message.trim().toLowerCase();
	const sourceChain = parseSourceChain(lowered) ?? normalizedWalletChain;
	const targetChain =
		parseTargetChain(lowered) ??
		parseChainByName(lowered) ??
		normalizedWalletChain;
	const { intent, actionMode } = detectIntentFromMessage(lowered);

	let riskPreference: RiskPreference = 'medium';
	if (includesAny(lowered, ['safest', 'safer', 'low risk'])) {
		riskPreference = 'low';
	} else if (includesAny(lowered, ['highest yield', 'aggressive', 'max apy'])) {
		riskPreference = 'high';
	}

	return {
		intent,
		asset: 'USDC',
		amount: parseAmount(lowered),
		sourceChain,
		targetChain,
		minApy: parseMinApy(lowered),
		riskPreference,
		needsConfirmation: true,
		mode: actionMode,
	};
}

export function extractPlannerPayload(
	text: string,
	walletChainId: number | null | undefined,
): PlannerOutput {
	const fallback = buildPlannerFallback({
		message: text,
		walletChainId,
	});

	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		return fallback;
	}

	try {
		const parsed = JSON.parse(jsonMatch[0]) as Partial<PlannerOutput>;
		const sourceChain = resolveWalletChainId(parsed.sourceChain ?? walletChainId);
		const targetChain = resolveWalletChainId(parsed.targetChain ?? sourceChain);
		const mode: PlannerMode =
			parsed.mode === 'execute' ? 'execute' : 'recommend';
		const riskPreference: RiskPreference =
			parsed.riskPreference === 'low' ||
			parsed.riskPreference === 'medium' ||
			parsed.riskPreference === 'high'
				? parsed.riskPreference
				: 'medium';
		const intent: PlannerIntent =
			parsed.intent === 'earn.deposit' ||
			parsed.intent === 'bridge' ||
			parsed.intent === 'monitor'
				? parsed.intent
				: 'unknown';

		return {
			intent,
			asset: 'USDC',
			amount: normalizeAmount(parsed.amount),
			sourceChain,
			targetChain,
			minApy:
				typeof parsed.minApy === 'number' && Number.isFinite(parsed.minApy)
					? parsed.minApy
					: null,
			riskPreference,
			needsConfirmation:
				typeof parsed.needsConfirmation === 'boolean'
					? parsed.needsConfirmation
					: true,
			mode,
		};
	} catch {
		return fallback;
	}
}
