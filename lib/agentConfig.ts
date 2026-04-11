/**
 * Per-Agent 模型配置
 * 每个 Agent 可以使用不同的模型（通过环境变量控制）
 */

export type SupportedModel =
	| 'deepseek'
	| 'zhipu'
	| 'openai'
	| 'anthropic'
	| 'qwen';

export interface AgentModelConfig {
	name: string;
	model: string;
	provider: SupportedModel;
	apiKeyEnv: string;
	temperature?: number;
	maxTokens?: number;
}

const DEFAULT_CONFIGS: Record<string, AgentModelConfig> = {
	main: {
		name: 'Main Agent (Intent Router)',
		model: 'gpt-4-turbo',
		provider: 'openai',
		apiKeyEnv: 'OPENAI_API_KEY',
		temperature: 0.7,
		maxTokens: 2000,
	},
	earning: {
		name: 'Earning Agent',
		model: 'claude-3-5-sonnet-20241022',
		provider: 'anthropic',
		apiKeyEnv: 'ANTHROPIC_API_KEY',
		temperature: 0.3,
		maxTokens: 2000,
	},
	bridge: {
		name: 'Bridge Agent',
		model: 'gpt-4-turbo',
		provider: 'openai',
		apiKeyEnv: 'OPENAI_API_KEY',
		temperature: 0.5,
		maxTokens: 1500,
	},
	risk: {
		name: 'Risk Agent',
		model: 'claude-3-5-sonnet-20241022',
		provider: 'anthropic',
		apiKeyEnv: 'ANTHROPIC_API_KEY',
		temperature: 0.3,
		maxTokens: 1500,
	},
	monitor: {
		name: 'Monitor Agent',
		model: 'gpt-4-turbo',
		provider: 'openai',
		apiKeyEnv: 'OPENAI_API_KEY',
		temperature: 0.5,
		maxTokens: 1000,
	},
};

/**
 * 获取指定 Agent 的模型配置
 * 支持通过环境变量覆盖默认配置
 */
export function getAgentConfig(
	agentName: keyof typeof DEFAULT_CONFIGS,
): AgentModelConfig {
	const envKey = `${agentName.toUpperCase()}_AGENT_MODEL`;
	const envModel = process.env[envKey];

	if (envModel) {
		// 如果环境变量指定了模型，解析它
		return parseModelString(envModel, agentName);
	}

	return DEFAULT_CONFIGS[agentName];
}

/**
 * 解析 "provider:model" 格式的模型字符串
 * 例如：deepseek:deepseek-chat 或直接 glm-4（会自动识别提供商）
 */
function parseModelString(
	modelString: string,
	agentName: string,
): AgentModelConfig {
	const base = DEFAULT_CONFIGS[agentName];

	if (modelString.includes(':')) {
		const [provider, model] = modelString.split(':');
		return {
			...base,
			model,
			provider: provider as SupportedModel,
		};
	}

	// 自动识别提供商
	let provider: SupportedModel = 'deepseek';
	if (modelString.startsWith('gpt-')) provider = 'openai';
	else if (modelString.includes('glm')) provider = 'zhipu';
	else if (modelString.startsWith('claude')) provider = 'anthropic';
	else if (modelString.startsWith('qwen')) provider = 'qwen';
	else if (modelString.startsWith('deepseek')) provider = 'deepseek';

	return {
		...base,
		model: modelString,
		provider,
	};
}

/**
 * 验证 API Key 是否存在
 */
export function validateApiKey(provider: SupportedModel): boolean {
	const keyMap: Record<SupportedModel, string> = {
		deepseek: 'DEEPSEEK_API_KEY',
		zhipu: 'ZHIPU_API_KEY',
		openai: 'OPENAI_API_KEY',
		anthropic: 'ANTHROPIC_API_KEY',
		qwen: 'QWEN_API_KEY',
	};

	return !!process.env[keyMap[provider]];
}
