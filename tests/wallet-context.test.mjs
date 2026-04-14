import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

async function loadWalletContextModule() {
	const sourcePath = path.resolve('./lib/walletContext.ts');
	const source = fs.readFileSync(sourcePath, 'utf8');
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.ES2022,
			target: ts.ScriptTarget.ES2022,
		},
		fileName: sourcePath,
	});

	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-context-'));
	const outputPath = path.join(tempDir, 'walletContext.mjs');
	fs.writeFileSync(outputPath, outputText, 'utf8');
	return import(pathToFileURL(outputPath).href);
}

test('wallet context helpers detect address questions and format a deterministic response', async () => {
	const { isWalletContextQuestion, buildWalletContextResponse } =
		await loadWalletContextModule();

	assert.equal(isWalletContextQuestion('what is my wallet address?'), true);
	assert.equal(isWalletContextQuestion('find best vault on base'), false);

	const response = buildWalletContextResponse({
		userAddress: '0x1111111111111111111111111111111111111111',
		walletChainId: 8453,
	});

	assert.match(response, /Connected wallet: 0x1111111111111111111111111111111111111111/);
	assert.match(response, /Current chain: Base \(8453\)/);
});
