import { tool } from 'ai';
import { z } from 'zod';
import {
	buildDepositQuote,
	getPortfolioPositions,
	getVaultDetails,
	searchVaults,
	selectRecommendedVault,
} from '@/lib/lifiDomain';

export const listVaultsTool = tool({
	description:
		'List live LI.FI earn vaults on a target chain, optionally filtered by token and APY.',
	parameters: z.object({
		chainId: z.number().describe('The chain ID (1=Ethereum, 8453=Base, 42161=Arbitrum)'),
		token: z.string().optional().describe('Underlying token symbol, e.g. USDC'),
		minApy: z.number().optional().describe('Minimum target APY'),
		limit: z.number().optional().describe('Maximum number of results to return'),
	}),
	execute: async ({ chainId, token, minApy, limit = 10 }) => {
		const result = await searchVaults({
			chainId,
			limit: Math.max(limit, 10),
		});

		if (!result.success) {
			return {
				success: false,
				error: result.error,
			};
		}

		const filtered = result.vaults.filter((vault) =>
			token ? vault.underlyingSymbol === token.toUpperCase() : true,
		);
		const ranked = selectRecommendedVault({
			vaults: filtered,
			minApy: minApy ?? null,
			riskPreference: 'medium',
		});
		const list = [ranked.selectedVault, ...ranked.alternatives]
			.filter((vault): vault is NonNullable<typeof vault> => Boolean(vault))
			.slice(0, limit)
			.map((vault) => ({
				address: vault.address,
				name: vault.name,
				protocol: vault.protocolName,
				apy: vault.apyTotal.toFixed(2),
				tvl: vault.tvlUsd,
				underlyingTokens: [vault.underlyingSymbol],
				tags: vault.tags,
				openForDeposits: vault.isTransactional,
			}));

		return {
			success: true,
			count: list.length,
			vaults: list,
		};
	},
});

export const getVaultDetailTool = tool({
	description: 'Get live details for a vault from the current LI.FI earn dataset.',
	parameters: z.object({
		vaultAddress: z.string().describe('The vault contract address'),
		chainId: z.number().describe('The chain ID where the vault is deployed'),
	}),
	execute: async ({ vaultAddress, chainId }) => {
		const vault = await getVaultDetails({
			chainId,
			address: vaultAddress,
		});

		if (!vault) {
			return {
				success: false,
				error: 'Vault detail not found in the current live vault dataset.',
			};
		}

		return {
			success: true,
			vault: {
				address: vault.address,
				name: vault.name,
				protocol: vault.protocolName,
				apy: vault.apyTotal.toFixed(2),
				tvl: vault.tvlUsd,
				underlyingTokens: [vault.underlyingSymbol],
				assetAddress: vault.underlyingTokenAddress,
				descriptions: {},
				auditLinks: [],
			},
		};
	},
});

export const getPortfolioTool = tool({
	description:
		"Get the user's LI.FI earn portfolio positions and balances for a target chain.",
	parameters: z.object({
		userAddress: z.string().describe("The user's wallet address"),
		chainId: z.number().describe('The chain ID to filter to'),
	}),
	execute: async ({ userAddress, chainId }) => {
		const portfolio = await getPortfolioPositions({ userAddress });
		if (!portfolio.success) {
			return {
				success: false,
				error: portfolio.error,
			};
		}

		return {
			success: true,
			portfolio: {
				positions: portfolio.positions.filter(
					(position) => position.chainId === chainId,
				),
				totalDeposited: '0',
				totalYield: '0',
				totalApy: '0',
			},
		};
	},
});

export const buildComposerQuoteTool = tool({
	description:
		'Build a live LI.FI Composer quote for depositing USDC into a vault.',
	parameters: z.object({
		fromChain: z.number().describe('Source chain ID'),
		toChain: z.number().describe('Destination chain ID'),
		fromToken: z.string().describe('Source token symbol or address'),
		toToken: z.string().describe('Vault address to deposit into'),
		amount: z.string().describe('Amount in base units (USDC decimals)'),
		fromAddress: z.string().describe('User wallet address'),
	}),
	execute: async ({ fromChain, toChain, toToken, amount, fromAddress }) => {
		const amountValue = Number(amount) / 1_000_000;
		if (!Number.isFinite(amountValue) || amountValue <= 0) {
			return {
				success: false,
				error: 'Quote amount must be a positive USDC amount in base units.',
			};
		}

		const quote = await buildDepositQuote({
			sourceChainId: fromChain,
			targetChainId: toChain,
			amount: amountValue,
			fromAddress,
			targetVaultAddress: toToken,
		});

		if (!quote.success) {
			return {
				success: false,
				error: quote.error,
			};
		}

		return {
			success: true,
			quote: {
				transactionRequest: quote.quote.transactionRequest,
				estimate: quote.quote.estimate,
				tool: quote.quote.tool || 'composer',
				transactionId: quote.quote.transactionId,
			},
		};
	},
});

export const estimateYieldTool = tool({
	description:
		'Estimate the yield earned over a period of time on a vault deposit.',
	parameters: z.object({
		principalAmount: z.number().describe('Principal amount in USD'),
		apyPercent: z.number().describe('Annual Percentage Yield, e.g. 4.2'),
		days: z.number().describe('Number of days to calculate yield for'),
	}),
	execute: async ({ principalAmount, apyPercent, days }) => {
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
	},
});

export const calculateBridgeFeeTool = tool({
	description: 'Estimate the bridge fee for a cross-chain transaction.',
	parameters: z.object({
		fromChain: z.number().describe('Source chain ID'),
		toChain: z.number().describe('Destination chain ID'),
		amount: z.string().describe('Amount in base units'),
	}),
	execute: async ({ fromChain, toChain, amount }) => {
		const amountNum = Number(amount);
		const fee = Math.max(amountNum * 0.005, 2e6);

		return {
			success: true,
			fee: {
				feeAmount: String(Math.floor(fee)),
				feePercent: '0.5',
				fromChain,
				toChain,
			},
		};
	},
});

export const agentTools = {
	listVaults: listVaultsTool,
	getVaultDetail: getVaultDetailTool,
	getPortfolio: getPortfolioTool,
	buildComposerQuote: buildComposerQuoteTool,
	estimateYield: estimateYieldTool,
	calculateBridgeFee: calculateBridgeFeeTool,
};
