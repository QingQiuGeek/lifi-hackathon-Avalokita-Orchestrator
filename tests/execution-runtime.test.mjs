import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

async function loadExecutionRuntimeModule() {
	const sourcePath = path.resolve('./lib/executionRuntime.ts');
	const source = fs.readFileSync(sourcePath, 'utf8');
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.ES2022,
			target: ts.ScriptTarget.ES2022,
		},
		fileName: sourcePath,
	});

	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'execution-runtime-'));
	const outputPath = path.join(tempDir, 'executionRuntime.mjs');
	fs.writeFileSync(outputPath, outputText, 'utf8');
	return import(pathToFileURL(outputPath).href);
}

test('buildExecutionPreview requires amount before execution can proceed', async () => {
	const { buildExecutionPreview } = await loadExecutionRuntimeModule();

	const preview = buildExecutionPreview({
		plan: {
			intent: 'earn.deposit',
			asset: 'USDC',
			amount: null,
			sourceChain: 1,
			targetChain: 8453,
			minApy: 5,
			riskPreference: 'low',
			needsConfirmation: true,
			mode: 'recommend',
		},
		selectedVault: {
			address: '0xvault',
			chainId: 8453,
			name: 'RE7USDC',
			protocolName: 'morpho-v1',
			underlyingSymbol: 'USDC',
			underlyingTokenAddress: '0xusdc',
			apyTotal: 5.7,
			tvlUsd: 2051223,
			tags: ['stablecoin'],
			isTransactional: true,
			isRedeemable: true,
			dataSource: 'live',
		},
		quote: null,
	});

	assert.equal(preview.canExecute, false);
	assert.equal(preview.eligibility, 'blocked_missing_amount');
	assert.match(preview.blockingReason ?? '', /amount/i);
});

test('buildExecutionPreview treats zero amount as missing input instead of quote failure', async () => {
	const { buildExecutionPreview } = await loadExecutionRuntimeModule();

	const preview = buildExecutionPreview({
		plan: {
			intent: 'earn.deposit',
			asset: 'USDC',
			amount: 0,
			sourceChain: 8453,
			targetChain: 8453,
			minApy: 5,
			riskPreference: 'medium',
			needsConfirmation: true,
			mode: 'recommend',
		},
		selectedVault: {
			address: '0xvault',
			chainId: 8453,
			name: 'USDC',
			protocolName: 'yo-protocol',
			underlyingSymbol: 'USDC',
			underlyingTokenAddress: '0xusdc',
			apyTotal: 16.47,
			tvlUsd: 27681375,
			tags: ['stablecoin'],
			isTransactional: true,
			isRedeemable: true,
			dataSource: 'live',
		},
		quote: null,
	});

	assert.equal(preview.canExecute, false);
	assert.equal(preview.eligibility, 'blocked_missing_amount');
	assert.equal(preview.fromAmount, null);
	assert.match(preview.blockingReason ?? '', /amount/i);
});

test('buildExecutionPreview summarizes quote values for live execution', async () => {
	const { buildExecutionPreview } = await loadExecutionRuntimeModule();

	const preview = buildExecutionPreview({
		plan: {
			intent: 'earn.deposit',
			asset: 'USDC',
			amount: 500,
			sourceChain: 8453,
			targetChain: 8453,
			minApy: 5,
			riskPreference: 'low',
			needsConfirmation: true,
			mode: 'execute',
		},
		selectedVault: {
			address: '0xvault',
			chainId: 8453,
			name: 'RE7USDC',
			protocolName: 'morpho-v1',
			underlyingSymbol: 'USDC',
			underlyingTokenAddress: '0xusdc',
			apyTotal: 5.7,
			tvlUsd: 2051223,
			tags: ['stablecoin'],
			isTransactional: true,
			isRedeemable: true,
			dataSource: 'live',
		},
		quote: {
			action: {
				fromAmount: '500000000',
				fromToken: { address: '0xusdc', symbol: 'USDC' },
			},
			estimate: {
				approvalAddress: '0xapproval',
				toAmount: '498000000000000000000',
				toAmountMin: '497000000000000000000',
				executionDuration: 180,
				feeCosts: [{ amountUSD: '1.23' }],
				gasCosts: [{ amount: '1000', amountUSD: '0.12', token: { symbol: 'ETH' } }],
			},
			transactionRequest: {
				to: '0xrouter',
				data: '0x1234',
			},
			tool: 'composer',
		},
	});

	assert.equal(preview.canExecute, true);
	assert.equal(preview.eligibility, 'ready');
	assert.equal(preview.routeSource, 'live');
	assert.equal(preview.targetVault, 'RE7USDC');
	assert.equal(preview.fees, '$1.23');
});

test('buildExecutionPreview marks missing quote as blocked quote failure when amount is present', async () => {
	const { buildExecutionPreview } = await loadExecutionRuntimeModule();

	const preview = buildExecutionPreview({
		plan: {
			intent: 'earn.deposit',
			asset: 'USDC',
			amount: 500,
			sourceChain: 8453,
			targetChain: 8453,
			minApy: 5,
			riskPreference: 'low',
			needsConfirmation: true,
			mode: 'execute',
		},
		selectedVault: {
			address: '0xvault',
			chainId: 42161,
			name: 'RE7USDC',
			protocolName: 'morpho-v1',
			underlyingSymbol: 'USDC',
			underlyingTokenAddress: '0xusdc',
			apyTotal: 5.7,
			tvlUsd: 2051223,
			tags: ['stablecoin'],
			isTransactional: true,
			isRedeemable: true,
			dataSource: 'live',
		},
		quote: null,
	});

	assert.equal(preview.canExecute, false);
	assert.equal(preview.eligibility, 'blocked_quote_failure');
	assert.match(preview.blockingReason ?? '', /quote/i);
});

test('buildExecutionPreview blocks same-asset cross-chain execution in v1', async () => {
	const { buildExecutionPreview } = await loadExecutionRuntimeModule();

	const preview = buildExecutionPreview({
		plan: {
			intent: 'earn.deposit',
			asset: 'USDC',
			amount: 25,
			sourceChain: 8453,
			targetChain: 42161,
			minApy: 4,
			riskPreference: 'low',
			needsConfirmation: true,
			mode: 'execute',
		},
		selectedVault: {
			address: '0xvault',
			chainId: 42161,
			name: 'GTUSDC',
			protocolName: 'morpho-v1',
			underlyingSymbol: 'USDC',
			underlyingTokenAddress: '0xusdc',
			apyTotal: 4.2,
			tvlUsd: 123000000,
			tags: ['stablecoin'],
			isTransactional: true,
			isRedeemable: true,
			dataSource: 'live',
		},
		quote: {
			action: {
				fromToken: { address: '0xfrom', symbol: 'USDC' },
				fromAmount: '25000000',
			},
			estimate: {
				approvalAddress: '0xapproval',
				toAmount: '24000000000000000000',
				toAmountMin: '23900000000000000000',
				executionDuration: 60,
				feeCosts: [{ amountUSD: '0.45' }],
				gasCosts: [{ amountUSD: '0.11', amount: '100', token: { symbol: 'ETH' } }],
			},
			transactionRequest: {
				to: '0xrouter',
				data: '0x1234',
			},
			tool: 'composer',
		},
	});

	assert.equal(preview.canExecute, false);
	assert.equal(preview.eligibility, 'blocked_quote_failure');
	assert.match(preview.blockingReason ?? '', /cross-chain/i);
});

test('buildExecutionPreview blocks execution when approval target is missing', async () => {
	const { buildExecutionPreview } = await loadExecutionRuntimeModule();

	const preview = buildExecutionPreview({
		plan: {
			intent: 'earn.deposit',
			asset: 'USDC',
			amount: 5,
			sourceChain: 8453,
			targetChain: 8453,
			minApy: 4,
			riskPreference: 'low',
			needsConfirmation: true,
			mode: 'execute',
		},
		selectedVault: {
			address: '0xvault',
			chainId: 8453,
			name: 'STEAKUSDC',
			protocolName: 'morpho-v1',
			underlyingSymbol: 'USDC',
			underlyingTokenAddress: '0xusdc',
			apyTotal: 3.83,
			tvlUsd: 482000000,
			tags: ['stablecoin'],
			isTransactional: true,
			isRedeemable: true,
			dataSource: 'live',
		},
		quote: {
			action: {
				fromToken: { address: '0xfrom', symbol: 'USDC' },
				fromAmount: '5000000',
			},
			estimate: {
				toAmount: '4800000000000000000',
				toAmountMin: '4780000000000000000',
				executionDuration: 0,
				feeCosts: [{ amountUSD: '0.01' }],
				gasCosts: [{ amountUSD: '0.02', amount: '200', token: { symbol: 'ETH' } }],
			},
			transactionRequest: {
				to: '0xrouter',
				data: '0x1234',
			},
			tool: 'composer',
		},
	});

	assert.equal(preview.canExecute, false);
	assert.equal(preview.eligibility, 'blocked_missing_approval_target');
	assert.match(preview.blockingReason ?? '', /approval/i);
});
