/**
 * AI SDK Client 工厂函数
 * 支持多个模型提供商，根据配置动态初始化
 */

import { LanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import type { AgentModelConfig, SupportedModel } from './agentConfig';

/**
 * 根据配置获取对应的语言模型实例
 */
export function getModelFromConfig(config: AgentModelConfig): LanguageModel {
	const { provider, model } = config;

	const apiKeys: Record<SupportedModel, string | undefined> = {
		deepseek: process.env.DEEPSEEK_API_KEY,
		zhipu: process.env.ZHIPU_API_KEY,
		openai: process.env.OPENAI_API_KEY,
		anthropic: process.env.ANTHROPIC_API_KEY,
	};

	const apiKey = apiKeys[provider];
	if (!apiKey) {
		throw new Error(
			`Missing API key for provider ${provider}. Set ${config.apiKeyEnv} in .env`,
		);
	}

	switch (provider) {
		case 'openai':
			return openai(model as any);
		case 'anthropic':
			return anthropic(model as any);
		default:
			// Fallback for deepseek and zhipu - use openai as default
			console.warn(`${provider} not available, falling back to OpenAI`);
			return openai('gpt-4-turbo' as any);
	}
}

/**
 * 创建带有 fallback 的模型链
 * 如果主模型失败，自动切换到备用模型
 */
export function createModelWithFallback(
	primaryConfig: AgentModelConfig,
	fallbackConfig?: AgentModelConfig,
): LanguageModel {
	try {
		return getModelFromConfig(primaryConfig);
	} catch (error) {
		if (fallbackConfig) {
			console.warn(
				`Failed to initialize ${primaryConfig.provider}, falling back to ${fallbackConfig.provider}`,
			);
			return getModelFromConfig(fallbackConfig);
		}
		throw error;
	}
}
