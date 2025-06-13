import { error, fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import { requireLogin } from '$lib/server/auth';
import { getUserApiKeys, saveApiKey, saveApiUrl } from '$lib/server/data/api-keys';

export const load: PageServerLoad = async ({ depends }) => {
	const user = requireLogin();

	depends('app:api-keys');

	// Load all API keys for the current user
	const apiKeys = await getUserApiKeys(user.id);

	return {
		apiKeys,
	};
};

export const actions: Actions = {
	saveApiKey: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, 'No autorizado');
		}

		const formData = await request.formData();
		const provider = formData.get('provider') as string;
		const apiKeyValue = formData.get('apiKey') as string;

		if (!provider || !apiKeyValue) {
			return fail(400, {
				error: 'El proveedor y la clave API son requeridos',
			});
		}

		try {
			await saveApiKey({
				userId: locals.user.id,
				provider,
				apiKey: apiKeyValue,
			});

			return {
				success: true,
				message: 'Clave API guardada exitosamente',
			};
		} catch (err) {
			console.error('Error saving API key:', err);

			// Handle specific validation errors
			if (err instanceof Error) {
				return fail(400, {
					error: err.message,
				});
			}

			return fail(500, {
				error: 'Error al guardar la clave API',
			});
		}
	},

	saveApiUrl: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, 'No autorizado');
		}

		const formData = await request.formData();
		const provider = formData.get('provider') as string;
		const apiUrl = formData.get('apiUrl') as string;

		if (!provider || !apiUrl) {
			return fail(400, {
				error: 'El proveedor y la URL API son requeridos',
			});
		}

		try {
			await saveApiUrl({
				userId: locals.user.id,
				provider,
				apiUrl,
			});

			return {
				success: true,
				message: 'URL API guardada exitosamente',
			};
		} catch (err) {
			console.error('Error saving API URL:', err);

			// Handle specific validation errors
			if (err instanceof Error) {
				return fail(400, {
					error: err.message,
				});
			}

			return fail(500, {
				error: 'Error al guardar la URL API',
			});
		}
	},
};
