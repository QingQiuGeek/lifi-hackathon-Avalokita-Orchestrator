export const DEFAULT_CHAIN_ID = 8453;
export const DEFAULT_QWEN_BASE_URL =
	'https://dashscope.aliyuncs.com/compatible-mode/v1';

type AgentRequestBody = {
	message?: unknown;
	userAddress?: unknown;
	chainId?: unknown;
};

type AgentRequestSuccess = {
	ok: true;
	value: {
		message: string;
		userAddress: string;
		chainId: number;
	};
};

type AgentRequestFailure = {
	ok: false;
	error: string;
};

export function normalizeAgentRequest(
	body: AgentRequestBody | null | undefined,
): AgentRequestSuccess | AgentRequestFailure {
	const message =
		typeof body?.message === 'string' ? body.message.trim() : '';

	if (!message) {
		return {
			ok: false,
			error: 'Missing required field: message',
		};
	}

	const userAddress =
		typeof body?.userAddress === 'string' ? body.userAddress.trim() : '';

	if (!userAddress) {
		return {
			ok: false,
			error: 'Missing required field: userAddress',
		};
	}

	const chainId =
		typeof body?.chainId === 'number' && Number.isFinite(body.chainId)
			? body.chainId
			: DEFAULT_CHAIN_ID;

	return {
		ok: true,
		value: {
			message,
			userAddress,
			chainId,
		},
	};
}

export function getQwenBaseUrl(
	env: Record<string, string | undefined> = process.env,
): string {
	const explicitBaseUrl = env.QWEN_BASE_URL?.trim();
	if (explicitBaseUrl) {
		return explicitBaseUrl;
	}

	const legacyBaseUrl = env.BASE_URL?.trim();
	if (legacyBaseUrl) {
		return legacyBaseUrl;
	}

	return DEFAULT_QWEN_BASE_URL;
}
