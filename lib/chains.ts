// 链支持配置（与客户端 wagmi 配置分离）
export const SUPPORTED_CHAINS = {
	1: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
	8453: { name: 'Base', symbol: 'ETH', decimals: 18 },
	42161: { name: 'Arbitrum', symbol: 'ETH', decimals: 18 },
	137: { name: 'Polygon', symbol: 'MATIC', decimals: 18 },
	10: { name: 'Optimism', symbol: 'ETH', decimals: 18 },
};

export const STABLECOIN_TOKENS = {
	USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
	USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
	DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
};
