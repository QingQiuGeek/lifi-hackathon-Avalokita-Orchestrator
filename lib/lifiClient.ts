const EARN_API_BASE_URL = 'https://earn.li.fi/v1/earn';
const LIFI_QUOTE_API_BASE_URL = 'https://li.quest/v1/quote';

export type LifiClientSuccess<T> = {
	success: true;
	status: number;
	data: T;
};

export type LifiClientFailure = {
	success: false;
	status: number | null;
	error: string;
	payload?: unknown;
};

export type LifiClientResult<T> = LifiClientSuccess<T> | LifiClientFailure;

type FetchLike = typeof fetch;

async function parseJsonResponse(response: Response): Promise<unknown> {
	const contentType = response.headers.get('content-type') || '';
	if (!contentType.includes('application/json')) {
		return response.text();
	}

	return response.json();
}

function toErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Unknown error';
}

async function requestJson<T>(
	fetchImpl: FetchLike,
	url: string,
	init?: RequestInit,
): Promise<LifiClientResult<T>> {
	try {
		const response = await fetchImpl(url, {
			cache: 'no-store',
			...init,
		});
		const payload = await parseJsonResponse(response);

		if (!response.ok) {
			return {
				success: false,
				status: response.status,
				error:
					typeof payload === 'string'
						? payload
						: `LI.FI request failed with status ${response.status}.`,
				payload,
			};
		}

		return {
			success: true,
			status: response.status,
			data: payload as T,
		};
	} catch (error) {
		return {
			success: false,
			status: null,
			error: toErrorMessage(error),
		};
	}
}

export function createLifiClient(fetchImpl: FetchLike = fetch) {
	return {
		getVaults(params: Record<string, string | number | boolean | undefined>) {
			const searchParams = new URLSearchParams();
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined && value !== null) {
					searchParams.set(key, String(value));
				}
			}

			return requestJson<{ data?: unknown; total?: unknown }>(
				fetchImpl,
				`${EARN_API_BASE_URL}/vaults?${searchParams.toString()}`,
			);
		},
		getVaultByChainAndAddress(input: { chainId: number; address: string }) {
			return requestJson<unknown>(
				fetchImpl,
				`${EARN_API_BASE_URL}/vaults/${input.chainId}/${input.address}`,
			);
		},
		getChains() {
			return requestJson<unknown[]>(fetchImpl, `${EARN_API_BASE_URL}/chains`);
		},
		getProtocols() {
			return requestJson<unknown[]>(fetchImpl, `${EARN_API_BASE_URL}/protocols`);
		},
		getPortfolioPositions(input: { userAddress: string }) {
			return requestJson<{ positions?: unknown }>(
				fetchImpl,
				`${EARN_API_BASE_URL}/portfolio/${input.userAddress}/positions`,
			);
		},
		getQuote(params: Record<string, string | number | boolean | undefined>) {
			const searchParams = new URLSearchParams();
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined && value !== null) {
					searchParams.set(key, String(value));
				}
			}

			return requestJson<Record<string, unknown>>(
				fetchImpl,
				`${LIFI_QUOTE_API_BASE_URL}?${searchParams.toString()}`,
			);
		},
	};
}
