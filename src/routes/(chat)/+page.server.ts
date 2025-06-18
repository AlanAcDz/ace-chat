import type { PageServerLoad } from './$types';
import { requireLogin } from '$lib/server/auth';
import { getAvailableProviders } from '$lib/server/data/api-keys';

export const load = (async () => {
	const user = requireLogin();

	// Check if user has any available API keys (personal or shared)
	const availableProviders = await getAvailableProviders(user.id);
	const hasApiKeys = availableProviders.length > 0;

	return {
		hasApiKeys,
	};
}) satisfies PageServerLoad;
