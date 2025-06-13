import { error, fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import type { UserGrant } from '$lib/grants';
import { hasAllGrants, hasGrant } from '$lib/grants';
import { requireLogin } from '$lib/server/auth';
import {
	getUserApiKeys,
	saveApiKey,
	saveApiUrl,
	updateApiKeyScope,
} from '$lib/server/data/api-keys';

export const load: PageServerLoad = async ({ depends }) => {
	const user = requireLogin();

	// Check permissions
	if (
		!hasAllGrants(user.grants as UserGrant[], [
			'api-keys:create:personal',
			'api-keys:create:shared',
		])
	) {
		throw error(403, 'Insufficient permissions');
	}

	depends('app:api-keys');

	// Load all API keys for the current user
	const apiKeys = await getUserApiKeys(user.id);

	return {
		apiKeys,
		userGrants: user.grants,
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
		const scope = (formData.get('scope') as 'personal' | 'shared') || 'personal';

		if (!provider || !apiKeyValue) {
			return fail(400, {
				error: 'El proveedor y la clave API son requeridos',
			});
		}

		// Check permissions for shared keys
		if (
			scope === 'shared' &&
			!hasGrant(locals.user.grants as UserGrant[], 'api-keys:create:shared')
		) {
			return fail(403, {
				error: 'Sin permisos para crear claves API compartidas',
			});
		}

		// Check permissions for personal keys
		if (
			scope === 'personal' &&
			!hasGrant(locals.user.grants as UserGrant[], 'api-keys:create:personal')
		) {
			return fail(403, {
				error: 'Sin permisos para crear claves API personales',
			});
		}

		try {
			await saveApiKey({
				userId: locals.user.id,
				provider,
				apiKey: apiKeyValue,
				scope,
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
		const scope = (formData.get('scope') as 'personal' | 'shared') || 'personal';

		if (!provider || !apiUrl) {
			return fail(400, {
				error: 'El proveedor y la URL API son requeridos',
			});
		}

		// Check permissions for shared keys
		if (
			scope === 'shared' &&
			!hasGrant(locals.user.grants as UserGrant[], 'api-keys:create:shared')
		) {
			return fail(403, {
				error: 'Sin permisos para crear claves API compartidas',
			});
		}

		// Check permissions for personal keys
		if (
			scope === 'personal' &&
			!hasGrant(locals.user.grants as UserGrant[], 'api-keys:create:personal')
		) {
			return fail(403, {
				error: 'Sin permisos para crear claves API personales',
			});
		}

		try {
			await saveApiUrl({
				userId: locals.user.id,
				provider,
				apiUrl,
				scope,
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

	updateScope: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, 'No autorizado');
		}

		const formData = await request.formData();
		const provider = formData.get('provider') as string;
		const scope = formData.get('scope') as 'personal' | 'shared';

		if (!provider || !scope) {
			return fail(400, {
				error: 'El proveedor y el alcance son requeridos',
			});
		}

		// Check permissions for the target scope
		if (
			scope === 'shared' &&
			!hasGrant(locals.user.grants as UserGrant[], 'api-keys:create:shared')
		) {
			return fail(403, {
				error: 'Sin permisos para crear claves API compartidas',
			});
		}

		if (
			scope === 'personal' &&
			!hasGrant(locals.user.grants as UserGrant[], 'api-keys:create:personal')
		) {
			return fail(403, {
				error: 'Sin permisos para crear claves API personales',
			});
		}

		try {
			await updateApiKeyScope({
				userId: locals.user.id,
				provider,
				scope,
			});

			return {
				success: true,
				message: `Alcance actualizado a ${scope === 'shared' ? 'compartido' : 'personal'}`,
			};
		} catch (err) {
			console.error('Error updating API key scope:', err);

			// Handle specific validation errors
			if (err instanceof Error) {
				return fail(400, {
					error: err.message,
				});
			}

			return fail(500, {
				error: 'Error al actualizar el alcance',
			});
		}
	},
};
