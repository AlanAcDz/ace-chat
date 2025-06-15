import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

import { AI_MODELS } from '$lib/ai/models';
import { requireLogin } from '$lib/server/auth';
import { getAvailableProviders } from '$lib/server/data/api-keys';

export const GET: RequestHandler = async () => {
	try {
		const user = requireLogin();
		const availableProviders = await getAvailableProviders(user.id);

		// Filter models to only include those with available providers
		const availableModels = AI_MODELS.filter((model) =>
			availableProviders.includes(model.provider)
		);

		return json({ models: availableModels });
	} catch (error) {
		console.error('Error getting available models:', error);
		return json({ error: 'Failed to get available models' }, { status: 500 });
	}
};
