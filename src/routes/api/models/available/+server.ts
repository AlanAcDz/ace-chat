import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

import type { LocalModel } from '$lib/server/ai/local-models';
import { AI_MODELS } from '$lib/ai/models';
import { fetchLMStudioModels, fetchOllamaModels } from '$lib/server/ai/local-models';
import { requireLogin } from '$lib/server/auth';
import { getApiKeyByProvider, getAvailableProviders } from '$lib/server/data/api-keys';

export const GET: RequestHandler = async () => {
	try {
		const user = requireLogin();
		const availableProviders = await getAvailableProviders(user.id);

		// Check if OpenRouter is available as a fallback
		const hasOpenRouter = availableProviders.includes('openrouter');

		// Filter static models to only include those with available providers
		// If OpenRouter is available, it can provide models for any provider
		const availableStaticModels = AI_MODELS.filter((model) => {
			// If we have a direct provider key, include the model
			if (availableProviders.includes(model.provider)) {
				return true;
			}
			// If we have OpenRouter, it can provide access to OpenAI, Anthropic, and Google models
			if (hasOpenRouter && ['openai', 'anthropic', 'google'].includes(model.provider)) {
				return true;
			}
			return false;
		});

		// Fetch dynamic models from local providers
		const localModels: LocalModel[] = [];

		// Check for LM Studio
		if (availableProviders.includes('lmstudio')) {
			const lmstudioConfig = await getApiKeyByProvider(user.id, 'lmstudio');
			if (lmstudioConfig?.url) {
				const lmstudioModels = await fetchLMStudioModels(lmstudioConfig.url);
				localModels.push(...lmstudioModels);
			}
		}

		// Check for Ollama
		if (availableProviders.includes('ollama')) {
			const ollamaConfig = await getApiKeyByProvider(user.id, 'ollama');
			if (ollamaConfig?.url) {
				const ollamaModels = await fetchOllamaModels(ollamaConfig.url);
				localModels.push(...ollamaModels);
			}
		}

		return json({
			models: availableStaticModels,
			localModels: localModels,
		});
	} catch (error) {
		console.error('Error getting available models:', error);
		return json({ error: 'Failed to get available models' }, { status: 500 });
	}
};
