const SUPPORTED_CHAIN_LABELS: Record<number, string> = {
	1: 'Ethereum',
	8453: 'Base',
	42161: 'Arbitrum',
};

export function isWalletContextQuestion(message: string): boolean {
	const lowered = message.toLowerCase();
	return [
		'wallet address',
		'my address',
		'connected wallet',
		'which wallet',
		'what wallet',
	].some((pattern) => lowered.includes(pattern));
}

export function buildWalletContextResponse(input: {
	userAddress: string;
	walletChainId: number;
}): string {
	const chainLabel =
		SUPPORTED_CHAIN_LABELS[input.walletChainId] ??
		`Chain ${input.walletChainId}`;

	return [
		'## Wallet Context',
		`Connected wallet: ${input.userAddress}`,
		`Current chain: ${chainLabel} (${input.walletChainId})`,
		'This wallet address is also used for portfolio lookup and execution quote generation.',
	].join('\n\n');
}
