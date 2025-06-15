import { error, fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import type { UserGrant } from '$lib/grants';
import { hasAllGrants, hasGrant } from '$lib/grants';
import { m } from '$lib/paraglide/messages.js';
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
			throw error(401, m.server_error_unauthorized());
		}

		const formData = await request.formData();
		const provider = formData.get('provider') as string;
		const apiKeyValue = formData.get('apiKey') as string;
		const scope = (formData.get('scope') as 'personal' | 'shared') || 'personal';

		if (!provider || !apiKeyValue) {
			return fail(400, {
				error: m.server_error_provider_key_required(),
			});
		}

		// Check permissions for shared keys
		if (
			scope === 'shared' &&
			!hasGrant(locals.user.grants as UserGrant[], 'api-keys:create:shared')
		) {
			return fail(403, {
				error: m.server_error_no_permission_shared_keys(),
			});
		}

		// Check permissions for personal keys
		if (
			scope === 'personal' &&
			!hasGrant(locals.user.grants as UserGrant[], 'api-keys:create:personal')
		) {
			return fail(403, {
				error: m.server_error_no_permission_personal_keys(),
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
				message: m.server_api_key_save_success(),
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
				error: m.server_error_saving_api_key(),
			});
		}
	},

	saveApiUrl: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, m.server_error_unauthorized());
		}

		const formData = await request.formData();
		const provider = formData.get('provider') as string;
		const apiUrl = formData.get('apiUrl') as string;
		const scope = (formData.get('scope') as 'personal' | 'shared') || 'personal';

		if (!provider || !apiUrl) {
			return fail(400, {
				error: m.server_error_provider_url_required(),
			});
		}

		// Check permissions for shared keys
		if (
			scope === 'shared' &&
			!hasGrant(locals.user.grants as UserGrant[], 'api-keys:create:shared')
		) {
			return fail(403, {
				error: m.server_error_no_permission_shared_keys(),
			});
		}

		// Check permissions for personal keys
		if (
			scope === 'personal' &&
			!hasGrant(locals.user.grants as UserGrant[], 'api-keys:create:personal')
		) {
			return fail(403, {
				error: m.server_error_no_permission_personal_keys(),
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
				message: m.server_api_url_save_success(),
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
				error: m.server_error_saving_api_url(),
			});
		}
	},

	updateScope: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, m.server_error_unauthorized());
		}

		const formData = await request.formData();
		const provider = formData.get('provider') as string;
		const scope = formData.get('scope') as 'personal' | 'shared';

		if (!provider || !scope) {
			return fail(400, {
				error: m.server_error_provider_scope_required(),
			});
		}

		// Check permissions for the target scope
		if (
			scope === 'shared' &&
			!hasGrant(locals.user.grants as UserGrant[], 'api-keys:create:shared')
		) {
			return fail(403, {
				error: m.server_error_no_permission_shared_keys(),
			});
		}

		if (
			scope === 'personal' &&
			!hasGrant(locals.user.grants as UserGrant[], 'api-keys:create:personal')
		) {
			return fail(403, {
				error: m.server_error_no_permission_personal_keys(),
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
				message:
					scope === 'shared'
						? m.server_scope_updated_to_shared()
						: m.server_scope_updated_to_personal(),
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
				error: m.server_error_updating_scope(),
			});
		}
	},
};
