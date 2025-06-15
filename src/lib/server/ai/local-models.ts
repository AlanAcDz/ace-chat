import { getApiKeyByProvider } from '$lib/server/data/api-keys';

export interface LocalModel {
	id: string;
	label: string;
	provider: 'lmstudio' | 'ollama';
	key: string;
	capabilities: string[];
}

interface LMStudioModel {
	id: string;
	object: string;
	created: number;
	owned_by: string;
}

interface LMStudioResponse {
	data: LMStudioModel[];
}

interface OllamaModel {
	name: string;
	model: string;
	modified_at: string;
	size: number;
	digest: string;
	details: {
		parent_model: string;
		format: string;
		family: string;
		families: string[] | null;
		parameter_size: string;
		quantization_level: string;
	};
}

interface OllamaResponse {
	models: OllamaModel[];
}

/**
 * Fetch models from LM Studio
 */
export async function fetchLMStudioModels(baseUrl: string): Promise<LocalModel[]> {
	try {
		// Normalize baseUrl - remove /v1 suffix if present, then add it
		const normalizedUrl = baseUrl.replace(/\/v1\/?$/, '');
		const response = await fetch(`${normalizedUrl}/v1/models`, {
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			console.warn('Failed to fetch LM Studio models:', response.statusText);
			return [];
		}

		const data = (await response.json()) as LMStudioResponse;

		return (
			data.data?.map((model) => ({
				id: model.id,
				label: model.id,
				provider: 'lmstudio' as const,
				key: `lmstudio-${model.id}`,
				capabilities: ['text', 'tools'], // Default capabilities for LM Studio models
			})) || []
		);
	} catch (error) {
		console.warn('Error fetching LM Studio models:', error);
		return [];
	}
}

/**
 * Fetch models from Ollama
 */
export async function fetchOllamaModels(baseUrl: string): Promise<LocalModel[]> {
	try {
		// Normalize baseUrl - remove /api suffix if present, then add it
		const normalizedUrl = baseUrl.replace(/\/api\/?$/, '');
		const response = await fetch(`${normalizedUrl}/api/tags`, {
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			console.warn('Failed to fetch Ollama models:', response.statusText);
			return [];
		}

		const data = (await response.json()) as OllamaResponse;

		return (
			data.models?.map((model) => ({
				id: model.name,
				label: model.name,
				provider: 'ollama' as const,
				key: `ollama-${model.name}`,
				capabilities: ['text'], // Default capabilities for Ollama models
			})) || []
		);
	} catch (error) {
		console.warn('Error fetching Ollama models:', error);
		return [];
	}
}

/**
 * Check if a model key is available in LM Studio or Ollama and return the model info
 */
export async function checkLocalModelAvailability(modelKey: string, userId: string) {
	// Check if it's a local model key
	if (modelKey.startsWith('lmstudio-')) {
		const modelId = modelKey.replace('lmstudio-', '');
		const lmstudioConfig = await getApiKeyByProvider(userId, 'lmstudio');

		if (lmstudioConfig?.url) {
			const models = await fetchLMStudioModels(lmstudioConfig.url);
			const found = models.find((m) => m.id === modelId);

			if (found) {
				return {
					available: true,
					provider: 'lmstudio' as const,
					modelId,
					baseUrl: lmstudioConfig.url,
				};
			}
		}
	} else if (modelKey.startsWith('ollama-')) {
		const modelId = modelKey.replace('ollama-', '');
		const ollamaConfig = await getApiKeyByProvider(userId, 'ollama');

		if (ollamaConfig?.url) {
			const models = await fetchOllamaModels(ollamaConfig.url);
			const found = models.find((m) => m.id === modelId);

			if (found) {
				return {
					available: true,
					provider: 'ollama' as const,
					modelId,
					baseUrl: ollamaConfig.url,
				};
			}
		}
	}

	return null;
}
