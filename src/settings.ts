export interface OpenCodeSettings {
	apiProvider: 'openai' | 'anthropic' | 'custom' | 'local';
	apiKey: string;
	customApiUrl: string;
	systemPrompt: string;
	skillsDir: string;
	enableMcp: boolean;
	mcpServers: string;
	maxTokens: number;
	temperature: number;
	model: string;
}

export const DEFAULT_SETTINGS: OpenCodeSettings = {
	apiProvider: 'local',
	apiKey: '',
	customApiUrl: '',
	systemPrompt: 'You are OpenCode, an AI coding assistant integrated into Obsidian. You help users with their notes, code, and workflows. Be concise and helpful.',
	skillsDir: '.opencode/skills',
	enableMcp: false,
	mcpServers: '[]',
	maxTokens: 4096,
	temperature: 0.7,
	model: 'minimax-m2.5-free'
};
