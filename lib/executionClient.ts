import { getPublicClient, getWalletClient } from '@wagmi/core';
import type { Address, Hex } from 'viem';
import { wagmiConfig } from './wagmi.config';
import type { ExecutionPreview } from './executionRuntime';

export type ClientExecutionState = {
	status:
		| 'idle'
		| 'awaiting_wallet'
		| 'submitted'
		| 'confirmed'
		| 'failed';
	txHashes: string[];
	explorerLinks: string[];
	error?: string;
	completedAt?: string;
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

type QuoteTransactionRequest = {
	to?: string;
	data?: string;
	value?: string;
	gasLimit?: string;
	gasPrice?: string;
};

export async function executePreviewTransaction(input: {
	preview: ExecutionPreview;
	switchChainAsync?: ((args: { chainId: number }) => Promise<unknown>) | undefined;
	onStateChange: (state: ClientExecutionState) => void;
}) {
	const chainId = input.preview.fromChain as (typeof wagmiConfig.chains)[number]['id'];

	if (!input.preview.quote || typeof input.preview.quote !== 'object') {
		throw new Error('Execution preview does not contain a live transaction request.');
	}

	input.onStateChange({
		status: 'awaiting_wallet',
		txHashes: [],
		explorerLinks: [],
	});

	if (input.switchChainAsync) {
		await input.switchChainAsync({ chainId: input.preview.fromChain });
	}

	const walletClient = await getWalletClient(wagmiConfig, {
		chainId,
	});

	if (!walletClient || !walletClient.account) {
		throw new Error('Wallet client is unavailable. Reconnect your wallet and try again.');
	}

	const request = (input.preview.quote as { transactionRequest?: QuoteTransactionRequest })
		.transactionRequest;
	if (!request?.to || !request?.data) {
		throw new Error('LI.FI quote is missing transactionRequest data.');
	}

	const hash = await walletClient.sendTransaction({
		account: walletClient.account,
		to: request.to as Address,
		data: request.data as Hex,
		value: request.value ? BigInt(request.value) : BigInt(0),
		gas: request.gasLimit ? BigInt(request.gasLimit) : undefined,
		gasPrice: request.gasPrice ? BigInt(request.gasPrice) : undefined,
	});

	const txHashes = [hash];
	const explorerLinks = txHashes.map(
		(txHash) => `${explorerBaseUrl(input.preview.fromChain)}${txHash}`,
	);

	input.onStateChange({
		status: 'submitted',
		txHashes,
		explorerLinks,
	});

	const publicClient = getPublicClient(wagmiConfig, {
		chainId,
	});

	if (!publicClient) {
		throw new Error('Public client is unavailable for receipt tracking.');
	}

	const receipt = await publicClient.waitForTransactionReceipt({ hash });
	const succeeded = receipt.status === 'success';

	input.onStateChange({
		status: succeeded ? 'confirmed' : 'failed',
		txHashes,
		explorerLinks,
		completedAt: new Date().toISOString(),
		error: succeeded ? undefined : 'Transaction reverted on chain.',
	});

	return {
		hash,
		receipt,
	};
}
