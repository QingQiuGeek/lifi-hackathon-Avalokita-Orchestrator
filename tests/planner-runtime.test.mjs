import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

async function loadPlannerRuntimeModule() {
	const sourcePath = path.resolve('./lib/plannerRuntime.ts');
	const source = fs.readFileSync(sourcePath, 'utf8');
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.ES2022,
			target: ts.ScriptTarget.ES2022,
		},
		fileName: sourcePath,
	});

	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'planner-runtime-'));
	const outputPath = path.join(tempDir, 'plannerRuntime.mjs');
	fs.writeFileSync(outputPath, outputText, 'utf8');
	return import(pathToFileURL(outputPath).href);
}

test('resolveWalletChainId falls back to Base for unsupported chains', async () => {
	const { resolveWalletChainId } = await loadPlannerRuntimeModule();

	assert.equal(resolveWalletChainId(8453), 8453);
	assert.equal(resolveWalletChainId(42161), 42161);
	assert.equal(resolveWalletChainId(1), 1);
	assert.equal(resolveWalletChainId(10), 8453);
});

test('detectIntentFromMessage identifies earn deposit intent from natural language', async () => {
	const { detectIntentFromMessage } = await loadPlannerRuntimeModule();

	assert.deepEqual(
		detectIntentFromMessage('put my USDC into the safest vault above 5% APY on Arbitrum'),
		{
			intent: 'earn.deposit',
			actionMode: 'recommend',
		},
	);
});

test('buildPlannerFallback extracts amount, target chain, threshold, and risk preference', async () => {
	const { buildPlannerFallback } = await loadPlannerRuntimeModule();

	const plan = buildPlannerFallback({
		message: 'put 500 USDC into the safest vault above 5% APY on Arbitrum',
		walletChainId: 1,
	});

	assert.equal(plan.intent, 'earn.deposit');
	assert.equal(plan.asset, 'USDC');
	assert.equal(plan.amount, 500);
	assert.equal(plan.sourceChain, 1);
	assert.equal(plan.targetChain, 42161);
	assert.equal(plan.minApy, 5);
	assert.equal(plan.riskPreference, 'low');
	assert.equal(plan.mode, 'recommend');
	assert.equal(plan.needsConfirmation, true);
});

test('buildPlannerFallback treats execute/go ahead language as execute mode', async () => {
	const { buildPlannerFallback } = await loadPlannerRuntimeModule();

	const plan = buildPlannerFallback({
		message: 'go ahead and deposit 250 USDC on Base',
		walletChainId: 8453,
	});

	assert.equal(plan.mode, 'execute');
	assert.equal(plan.targetChain, 8453);
});

test('buildPlannerFallback preserves cross-chain source and target chains', async () => {
	const { buildPlannerFallback } = await loadPlannerRuntimeModule();

	const plan = buildPlannerFallback({
		message: 'move 100 USDC from Base into the best USDC vault on Arbitrum',
		walletChainId: 8453,
	});

	assert.equal(plan.intent, 'earn.deposit');
	assert.equal(plan.sourceChain, 8453);
	assert.equal(plan.targetChain, 42161);
});

test('extractPlannerPayload accepts valid JSON planner output and normalizes chains', async () => {
	const { extractPlannerPayload } = await loadPlannerRuntimeModule();

	const plan = extractPlannerPayload(
		'{"intent":"earn.deposit","asset":"USDC","amount":500,"sourceChain":10,"targetChain":42161,"minApy":5,"riskPreference":"low","needsConfirmation":true,"mode":"execute"}',
		8453,
	);

	assert.equal(plan.intent, 'earn.deposit');
	assert.equal(plan.sourceChain, 8453);
	assert.equal(plan.targetChain, 42161);
	assert.equal(plan.mode, 'execute');
});

test('extractPlannerPayload treats zero or negative amounts as missing', async () => {
	const { extractPlannerPayload } = await loadPlannerRuntimeModule();

	const zeroAmountPlan = extractPlannerPayload(
		'{"intent":"earn.deposit","asset":"USDC","amount":0,"sourceChain":8453,"targetChain":8453,"minApy":5,"riskPreference":"medium","needsConfirmation":true,"mode":"recommend"}',
		8453,
	);
	const negativeAmountPlan = extractPlannerPayload(
		'{"intent":"earn.deposit","asset":"USDC","amount":-10,"sourceChain":8453,"targetChain":8453,"minApy":5,"riskPreference":"medium","needsConfirmation":true,"mode":"recommend"}',
		8453,
	);

	assert.equal(zeroAmountPlan.amount, null);
	assert.equal(negativeAmountPlan.amount, null);
});
