export const AI_MODELS = [
	{
		label: 'Gemini 2.0 Flash',
		provider: 'google',
		key: 'gemini-2.0-flash-exp',
		capabilities: ['text', 'image'],
	},
	{
		label: 'Gemini 2.5 Flash',
		provider: 'google',
		key: 'gemini-2.5-flash-preview-04-17',
		capabilities: ['text', 'thinking', 'tools'],
	},
	{
		label: 'Gemini 2.5 Pro',
		provider: 'google',
		key: 'gemini-2.5-pro-preview-05-06',
		capabilities: ['text', 'thinking', 'tools'],
	},
	{
		label: 'Claude 3.5 Sonnet',
		provider: 'anthropic',
		key: 'claude-3-5-sonnet-20241022',
		capabilities: ['text', 'tools'],
	},
	{
		label: 'Claude 3.7 Sonnet',
		provider: 'anthropic',
		key: 'claude-3-7-sonnet-20250219',
		capabilities: ['text', 'tools', 'thinking'],
	},
	{
		label: 'Claude 4 Sonnet',
		provider: 'anthropic',
		key: 'claude-4-sonnet-20250514',
		capabilities: ['text', 'tools', 'thinking'],
	},
	{
		label: 'O3 Mini',
		provider: 'openai',
		key: 'o3-mini',
		capabilities: ['text', 'thinking', 'tools'],
	},
	{
		label: 'O4 Mini',
		provider: 'openai',
		key: 'o4-mini',
		capabilities: ['text', 'thinking', 'tools'],
	},
	{
		label: 'GPT-4o Mini',
		provider: 'openai',
		key: 'gpt-4o-mini',
		capabilities: ['text', 'tools'],
	},
	{
		label: 'GPT Image 1',
		provider: 'openai',
		key: 'gpt-image-1',
		capabilities: ['image'],
	},
] as const;

export type AIModel = (typeof AI_MODELS)[number];
