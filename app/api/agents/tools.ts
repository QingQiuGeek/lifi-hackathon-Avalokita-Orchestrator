/**
 * Agent 工具定义（Tool Calling）
 * 所有 Agent 都通过这些工具与 LI.FI API 交互
 */

import { tool } from 'ai';
import { z } from 'zod';

const LIFI_API_BASE = 'https://earn.li.fi';
const LIFI_COMPOSER_API = 'https://li.quest/v1/quote';

// ============ Earn Data Tools ============

export const listVaultsTool = tool({
	description:
		'List all available vaults on a specific chain, optionally filtered by token and APY',
	parameters: z.object({
		chainId: z.number().describe('The chain ID (1=Ethereum, 8453=Base, etc.)'),
		token: z
			.string()
			.optional()
			.describe('Filter by underlying token (USDC, DAI, etc.)'),
		minApy: z.number().optional().describe('Minimum APY threshold'),
		limit: z.number().optional().describe('Maximum number of results'),
	}),
	execute: async ({ chainId, token, minApy, limit = 10 }) => {
		try {
			const params = new URLSearchParams({
				chainId: chainId.toString(),
				...(token && { underlyingTokens: token }),
				limit: limit.toString(),
			});

			const response = await fetch(`${LIFI_API_BASE}/v1/earn/vaults?${params}`);
			if (!response.ok) throw new Error(`API error: ${response.status}`);

			const vaults = await response.json();

			// Filter by minApy if provided
			const filtered = minApy
				? vaults.filter((v: any) => parseFloat(v.apy) >= minApy)
				: vaults;

			return {
				success: true,
				count: filtered.length,
				vaults: filtered.slice(0, limit).map((v: any) => ({
					address: v.address,
					name: v.name,
					protocol: v.protocol,
					apy: parseFloat(v.apy).toFixed(2),
					tvl: v.tvl,
					underlyingTokens: v.underlyingTokens,
					tags: v.tags || [],
					openForDeposits: v.openForDeposits,
				})),
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	},
});

export const getVaultDetailTool = tool({
	description: 'Get detailed information about a specific vault',
	parameters: z.object({
		vaultAddress: z.string().describe('The vault contract address'),
		chainId: z.number().describe('The chain ID where the vault is deployed'),
	}),
	execute: async ({ vaultAddress, chainId }) => {
		try {
			const response = await fetch(
				`${LIFI_API_BASE}/v1/earn/vaults/${vaultAddress}?chainId=${chainId}`,
			);
			if (!response.ok) throw new Error(`API error: ${response.status}`);

			const vault = await response.json();
			return {
				success: true,
				vault: {
					address: vault.address,
					name: vault.name,
					protocol: vault.protocol,
					apy: parseFloat(vault.apy).toFixed(2),
					tvl: vault.tvl,
					underlyingTokens: vault.underlyingTokens,
					assetAddress: vault.assetAddress,
					descriptions: vault.descriptions || {},
					auditLinks: vault.auditLinks || [],
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	},
});

export const getPortfolioTool = tool({
	description:
		"Get the user's current portfolio on a specific chain (positions, balances, yields)",
	parameters: z.object({
		userAddress: z.string().describe("The user's wallet address"),
		chainId: z.number().describe('The chain ID to query'),
	}),
	execute: async ({ userAddress, chainId }) => {
		try {
			const response = await fetch(
				`${LIFI_API_BASE}/v1/earn/portfolio?userAddress=${userAddress}&chainId=${chainId}`,
			);
			if (!response.ok) throw new Error(`API error: ${response.status}`);

			const portfolio = await response.json();
			return {
				success: true,
				portfolio: {
					positions: portfolio.positions || [],
					totalDeposited: portfolio.totalDeposited || '0',
					totalYield: portfolio.totalYield || '0',
					totalApy: portfolio.totalApy || '0',
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	},
});

// ============ Composer Tools ============

export const buildComposerQuoteTool = tool({
	description:
		'Build a transaction quote using LI.FI Composer to execute a deposit or bridge operation',
	parameters: z.object({
		fromChain: z.number().describe('Source chain ID'),
		toChain: z.number().describe('Destination chain ID'),
		fromToken: z
			.string()
			.describe('Source token address or symbol (USDC, USDT, ETH, etc.)'),
		toToken: z.string().describe('Destination token address or symbol'),
		amount: z.string().describe('Amount in base units (wei for ERC20)'),
		fromAddress: z.string().describe('User wallet address'),
	}),
	execute: async ({
		fromChain,
		toChain,
		fromToken,
		toToken,
		amount,
		fromAddress,
	}) => {
		try {
			const params = new URLSearchParams({
				fromChain: fromChain.toString(),
				toChain: toChain.toString(),
				fromToken,
				toToken,
				fromAmount: amount,
				fromAddress,
			});

			const response = await fetch(`${LIFI_COMPOSER_API}?${params}`);
			if (!response.ok)
				throw new Error(`Composer API error: ${response.status}`);

			const quote = await response.json();
			return {
				success: true,
				quote: {
					transactionRequest: quote.transactionRequest,
					estimate: {
						toAmount: quote.estimate?.toAmount || '0',
						toAmountMin: quote.estimate?.toAmountMin || '0',
						executionDuration: quote.estimate?.executionDuration || 0,
						feeCosts: quote.estimate?.feeCosts || [],
					},
					tool: quote.tool || 'unknown',
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	},
});

// ============ Calculation Tools ============

export const estimateYieldTool = tool({
	description:
		'Estimate the yield earned over a period of time on a vault deposit',
	parameters: z.object({
		principalAmount: z
			.number()
			.describe('Principal amount in USD or native units'),
		apyPercent: z
			.number()
			.describe('Annual Percentage Yield (e.g., 4.2 for 4.2%)'),
		days: z.number().describe('Number of days to calculate yield for'),
	}),
	execute: async ({ principalAmount, apyPercent, days }) => {
		try {
			// Formula: Daily Yield = Principal * (APY / 365) / 100
			const dailyYieldPercent = apyPercent / 365;
			const dailyYield = principalAmount * (dailyYieldPercent / 100);
			const totalYield = dailyYield * days;
			const finalAmount = principalAmount + totalYield;

			return {
				success: true,
				yield: {
					principalAmount: principalAmount.toFixed(2),
					apyPercent: apyPercent.toFixed(2),
					days,
					dailyYield: dailyYield.toFixed(2),
					estimatedYield: totalYield.toFixed(2),
					finalAmount: finalAmount.toFixed(2),
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Calculation error',
			};
		}
	},
});

export const calculateBridgeFeeTool = tool({
	description: 'Estimate the bridge fee for a cross-chain transaction',
	parameters: z.object({
		fromChain: z.number().describe('Source chain ID'),
		toChain: z.number().describe('Destination chain ID'),
		amount: z.string().describe('Amount in base units'),
	}),
	execute: async ({ fromChain, toChain, amount }) => {
		try {
			// Simplified fee estimation (you'd normally call a fee estimation API)
			// Fee = 0.5% of amount + minimum fee of $2
			const amountNum = parseInt(amount);
			const fee = Math.max(amountNum * 0.005, 2e6); // 2 USDC minimum

			return {
				success: true,
				fee: {
					feeAmount: fee.toString(),
					feePercent: '0.5',
					fromChain,
					toChain,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Fee calculation error',
			};
		}
	},
});

// Tools array for export
export const agentTools = {
	listVaults: listVaultsTool,
	getVaultDetail: getVaultDetailTool,
	getPortfolio: getPortfolioTool,
	buildComposerQuote: buildComposerQuoteTool,
	estimateYield: estimateYieldTool,
	calculateBridgeFee: calculateBridgeFeeTool,
};
