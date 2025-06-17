export const AI_MODELS = [
	{
		label: 'Gemini 2.0 Flash',
		provider: 'google',
		key: 'gemini-2.0-flash-exp',
		capabilities: ['text', 'tools', 'image'],
	},
	{
		label: 'Gemini 2.5 Flash',
		provider: 'google',
		key: 'gemini-2.5-flash-preview-04-17',
		capabilities: ['text', 'tools', 'thinking'],
	},
	{
		label: 'Gemini 2.5 Pro',
		provider: 'google',
		key: 'gemini-2.5-pro-preview-05-06',
		capabilities: ['text', 'tools', 'thinking'],
	},
	{
		label: 'Claude 3.5 Sonnet',
		provider: 'anthropic',
		key: 'claude-3-5-sonnet-20241022',
		capabilities: ['text'],
	},
	{
		label: 'Claude 3.7 Sonnet',
		provider: 'anthropic',
		key: 'claude-3-7-sonnet-20250219',
		capabilities: ['text', 'thinking'],
	},
	{
		label: 'Claude Sonnet 4',
		provider: 'anthropic',
		key: 'claude-4-sonnet',
		capabilities: ['text', 'thinking'],
	},
	{
		label: 'O3 Mini',
		provider: 'openai',
		key: 'o3-mini',
		capabilities: ['text', 'thinking'],
	},
	{
		label: 'O4 Mini',
		provider: 'openai',
		key: 'o4-mini',
		capabilities: ['text', 'thinking'],
	},
	{
		label: 'GPT-4o Mini',
		provider: 'openai',
		key: 'gpt-4o-mini',
		capabilities: ['text'],
	},
	// {
	// 	label: 'GPT Image 1',
	// 	provider: 'openai',
	// 	key: 'gpt-image-1',
	// 	capabilities: ['image'],
	// },
] as const;

export type AIModel = (typeof AI_MODELS)[number];

/**
 * Detect if the user message contains a request for image generation
 */
export function detectImageGenerationRequest(content: string): boolean {
	const imageGenerationKeywords = [
		// Spanish variations
		'genera una imagen',
		'generar imagen',
		'crea una imagen',
		'crear imagen',
		'dibuja',
		'dibujar',
		'haz una imagen',
		'hacer imagen',
		'produce una imagen',
		'producir imagen',
		'diseña',
		'diseñar',
		'ilustra',
		'ilustrar',
		// English variations
		'generate an image',
		'generate image',
		'create an image',
		'create image',
		'draw',
		'make an image',
		'make image',
		'produce an image',
		'produce image',
		'design',
		'illustrate',
		'sketch',
		'render',
		// Common phrases
		'imagen de',
		'image of',
		'picture of',
		'photo of',
		'foto de',
		'drawing of',
		'dibujo de',
	];

	const lowerContent = content.toLowerCase();

	return imageGenerationKeywords.some((keyword) => lowerContent.includes(keyword.toLowerCase()));
}
