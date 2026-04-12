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
	assert.match(preview.blockingReason ?? '', /amount/i);
});

test('buildExecutionPreview summarizes quote values for live execution', async () => {
	const { buildExecutionPreview } = await loadExecutionRuntimeModule();

	const preview = buildExecutionPreview({
		plan: {
			intent: 'earn.deposit',
			asset: 'USDC',
			amount: 500,
			sourceChain: 1,
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
			estimate: {
				toAmount: '498000000000000000000',
				toAmountMin: '497000000000000000000',
				executionDuration: 180,
				feeCosts: [{ amountUSD: '1.23' }],
			},
			tool: 'composer',
		},
	});

	assert.equal(preview.canExecute, true);
	assert.equal(preview.routeSource, 'live');
	assert.equal(preview.targetVault, 'RE7USDC');
	assert.equal(preview.fees, '$1.23');
});
