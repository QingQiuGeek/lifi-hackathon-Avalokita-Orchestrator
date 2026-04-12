import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

async function loadAgentRuntimeModule() {
	const sourcePath = path.resolve('./lib/agentRuntime.ts');
	const source = fs.readFileSync(sourcePath, 'utf8');
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.ES2022,
			target: ts.ScriptTarget.ES2022,
		},
		fileName: sourcePath,
	});

	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-'));
	const outputPath = path.join(tempDir, 'agentRuntime.mjs');
	fs.writeFileSync(outputPath, outputText, 'utf8');
	return import(pathToFileURL(outputPath).href);
}

test('normalizeAgentRequest rejects requests when wallet address is missing', async () => {
	const { normalizeAgentRequest } = await loadAgentRuntimeModule();

	const result = normalizeAgentRequest({
		message: '帮我找收益最高的 vault',
	});

	assert.equal(result.ok, false);
	assert.match(result.error, /userAddress/i);
});

test('normalizeAgentRequest rejects empty messages', async () => {
	const { normalizeAgentRequest } = await loadAgentRuntimeModule();

	const result = normalizeAgentRequest({
		message: '   ',
		userAddress: '0x1111111111111111111111111111111111111111',
	});

	assert.equal(result.ok, false);
	assert.match(result.error, /message/i);
});

test('getQwenBaseUrl prefers explicit QWEN_BASE_URL and otherwise uses the official default', async () => {
	const { getQwenBaseUrl, DEFAULT_QWEN_BASE_URL } =
		await loadAgentRuntimeModule();

	assert.equal(
		getQwenBaseUrl({
			QWEN_BASE_URL: 'https://custom.example.com/v1',
			BASE_URL: 'https://fallback.example.com/v1',
		}),
		'https://custom.example.com/v1',
	);

	assert.equal(
		getQwenBaseUrl({
			QWEN_BASE_URL: '',
			BASE_URL: '',
		}),
		DEFAULT_QWEN_BASE_URL,
	);
});
