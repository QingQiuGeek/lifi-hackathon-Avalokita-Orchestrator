import { getPublicClient, getWalletClient } from '@wagmi/core';
import { erc20Abi, type Address, type Hex } from 'viem';
import {
	buildApproveRequest,
	runExecutionPreflight,
	type ExecutionPreflightResult,
} from './executionHelpers';
import type { ExecutionPreview } from './executionRuntime';
import { wagmiConfig } from './wagmi.config';

export type ClientExecutionState = {
	status:
		| 'idle'
		| 'preflighting'
		| 'awaiting_wallet_approval'
		| 'approving'
		| 'approved'
		| 'awaiting_wallet_execution'
		| 'submitting'
		| 'submitted'
		| 'confirmed'
		| 'failed';
	txHashes: string[];
	explorerLinks: string[];
	approvalTxHash?: string;
	executionTxHash?: string;
	errorCode?: string;
	error?: string;
	completedAt?: string;
	preflight?: ExecutionPreflightResult;
};

type QuoteTransactionRequest = {
	to?: string;
	data?: string;
	value?: string;
	gasLimit?: string;
	gasPrice?: string;
};

function explorerBaseUrl(chainId: number): string {
	switch (chainId) {
		case 1:
			return 'https://etherscan.io/tx/';
		case 42161:
			return 'https://arbiscan.io/tx/';
		case 8453:
		default:
			return 'https://basescan.org/tx/';
	}
}

function toExplorerLink(chainId: number, hash: string) {
	return `${explorerBaseUrl(chainId)}${hash}`;
}

function toHashes(state: {
	approvalTxHash?: string;
	executionTxHash?: string;
	chainId: number;
}) {
	const hashes = [state.approvalTxHash, state.executionTxHash].filter(
		(value): value is string => Boolean(value),
	);
	return {
		txHashes: hashes,
		explorerLinks: hashes.map((hash) => toExplorerLink(state.chainId, hash)),
	};
}

function mapExecutionError(error: unknown) {
	const message =
		error instanceof Error ? error.message : 'Execution failed unexpectedly.';
	const lower = message.toLowerCase();

	if (lower.includes('user rejected') || lower.includes('user denied')) {
		return {
			errorCode: 'user_rejected',
			error: 'Wallet signature was rejected by the user.',
		};
	}

	if (lower.includes('simulation') || lower.includes('gas required exceeds')) {
		return {
			errorCode: 'wallet_simulation_failed',
			error:
				'The wallet simulation predicts this transaction will fail, so it was not broadcast.',
		};
	}

	if (lower.includes('wallet client is unavailable')) {
		return {
			errorCode: 'wallet_unavailable',
			error: message,
		};
	}

	return {
		errorCode: 'execution_failed',
		error: message,
	};
}

function requestFromPreview(preview: ExecutionPreview): QuoteTransactionRequest | null {
	if (!preview.quote || typeof preview.quote !== 'object') {
		return null;
	}

	return preview.quote.transactionRequest ?? null;
}

export async function executePreviewTransaction(input: {
	preview: ExecutionPreview;
	switchChainAsync?: ((args: { chainId: number }) => Promise<unknown>) | undefined;
	onStateChange: (state: ClientExecutionState) => void;
}) {
	const chainId = input.preview.fromChain as (typeof wagmiConfig.chains)[number]['id'];
	let preflight: ExecutionPreflightResult | undefined;
	let approvalTxHash: Hex | undefined;
	let executionTxHash: Hex | undefined;

	input.onStateChange({
		status: 'preflighting',
		txHashes: [],
		explorerLinks: [],
	});

	try {
		if (input.switchChainAsync) {
			await input.switchChainAsync({ chainId: input.preview.fromChain });
		}

		const walletClient = await getWalletClient(wagmiConfig, {
			chainId,
		});

		if (!walletClient || !walletClient.account) {
			throw new Error('Wallet client is unavailable. Reconnect your wallet and try again.');
		}

		const walletAddress = walletClient.account.address;
		const publicClient = getPublicClient(wagmiConfig, {
			chainId,
		});

		if (!publicClient) {
			throw new Error('Public client is unavailable for receipt tracking.');
		}

		const nativeBalance = await publicClient.getBalance({
			address: walletAddress,
		});

		const tokenAddress = input.preview.quote?.action?.fromToken?.address;
		const approvalAddress = input.preview.approvalAddress;
		let allowance = BigInt(0);

		if (tokenAddress && approvalAddress) {
			allowance = (await publicClient.readContract({
				address: tokenAddress as Address,
				abi: erc20Abi,
				functionName: 'allowance',
				args: [walletAddress, approvalAddress as Address],
			})) as bigint;
		}

		preflight = runExecutionPreflight({
			preview: {
				fromChain: input.preview.fromChain,
				toChain: input.preview.toChain,
				quote: input.preview.quote,
			},
			wallet: {
				address: walletAddress,
				chainId,
				nativeBalance,
				allowance,
			},
		});

		input.onStateChange({
			status: 'preflighting',
			...toHashes({ chainId }),
			preflight,
		});

		if (!preflight.ready) {
			const reasonMap: Record<NonNullable<ExecutionPreflightResult['reason']>, string> = {
				blocked_quote_failure:
					'Execution quote is incomplete or unsupported for this version.',
				blocked_wallet_context:
					'Wallet context is invalid. Reconnect and switch to the correct chain.',
				blocked_missing_approval_target:
					'LI.FI quote is missing the approval target required for USDC execution.',
				blocked_insufficient_gas:
					'Not enough native gas token is available to submit this transaction.',
			};
			throw new Error(reasonMap[preflight.reason ?? 'blocked_quote_failure']);
		}

		if (preflight.requiresApproval) {
			if (!tokenAddress || !preflight.approvalAddress || !preflight.amountBaseUnits) {
				throw new Error('Approval data is incomplete. Cannot request ERC20 approval.');
			}

			input.onStateChange({
				status: 'awaiting_wallet_approval',
				...toHashes({ approvalTxHash, chainId }),
				preflight,
			});

			const approveRequest = buildApproveRequest({
				tokenAddress,
				spender: preflight.approvalAddress,
				amount: preflight.amountBaseUnits,
			});
			approvalTxHash = await walletClient.sendTransaction({
				account: walletClient.account,
				to: approveRequest.to as Address,
				data: approveRequest.data as Hex,
				value: approveRequest.value,
			});

			input.onStateChange({
				status: 'approving',
				approvalTxHash,
				...toHashes({ approvalTxHash, chainId }),
				preflight,
			});

			const approvalReceipt = await publicClient.waitForTransactionReceipt({
				hash: approvalTxHash,
			});

			if (approvalReceipt.status !== 'success') {
				throw new Error('USDC approval reverted on chain.');
			}

			input.onStateChange({
				status: 'approved',
				approvalTxHash,
				...toHashes({ approvalTxHash, chainId }),
				preflight,
			});
		}

		const request = requestFromPreview(input.preview);
		if (!request?.to || !request?.data) {
			throw new Error('LI.FI quote is missing transactionRequest data.');
		}

		input.onStateChange({
			status: 'awaiting_wallet_execution',
			approvalTxHash,
			...toHashes({ approvalTxHash, chainId }),
			preflight,
		});

		input.onStateChange({
			status: 'submitting',
			approvalTxHash,
			...toHashes({ approvalTxHash, chainId }),
			preflight,
		});

		executionTxHash = await walletClient.sendTransaction({
			account: walletClient.account,
			to: request.to as Address,
			data: request.data as Hex,
			value: request.value ? BigInt(request.value) : BigInt(0),
			gas: request.gasLimit ? BigInt(request.gasLimit) : undefined,
			gasPrice: request.gasPrice ? BigInt(request.gasPrice) : undefined,
		});

		input.onStateChange({
			status: 'submitted',
			approvalTxHash,
			executionTxHash,
			...toHashes({ approvalTxHash, executionTxHash, chainId }),
			preflight,
		});

		const receipt = await publicClient.waitForTransactionReceipt({
			hash: executionTxHash,
		});
		const succeeded = receipt.status === 'success';

		input.onStateChange({
			status: succeeded ? 'confirmed' : 'failed',
			approvalTxHash,
			executionTxHash,
			...toHashes({ approvalTxHash, executionTxHash, chainId }),
			preflight,
			completedAt: new Date().toISOString(),
			errorCode: succeeded ? undefined : 'onchain_revert',
			error: succeeded ? undefined : 'Deposit transaction reverted on chain.',
		});

		return {
			hash: executionTxHash,
			approvalTxHash,
			receipt,
		};
	} catch (error) {
		input.onStateChange(
			buildFailedExecutionState({
				chainId,
				error,
				approvalTxHash,
				executionTxHash,
				preflight,
			}),
		);
		throw error;
	}
}

export function buildFailedExecutionState(input: {
	chainId: number;
	error: unknown;
	approvalTxHash?: string;
	executionTxHash?: string;
	preflight?: ExecutionPreflightResult;
}): ClientExecutionState {
	const normalized = mapExecutionError(input.error);
	return {
		status: 'failed',
		approvalTxHash: input.approvalTxHash,
		executionTxHash: input.executionTxHash,
		...toHashes({
			approvalTxHash: input.approvalTxHash,
			executionTxHash: input.executionTxHash,
			chainId: input.chainId,
		}),
		errorCode: normalized.errorCode,
		error: normalized.error,
		preflight: input.preflight,
		completedAt: new Date().toISOString(),
	};
}
