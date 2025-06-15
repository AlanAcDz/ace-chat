import { m } from '$lib/paraglide/messages.js';

export const USER_GRANTS = {
	// User Management
	'users:view': {
		description: () => m.grants_users_view_description(),
	},
	'users:create': {
		description: () => m.grants_users_create_description(),
	},
	'users:delete': {
		description: () => m.grants_users_delete_description(),
	},
	'users:update': {
		description: () => m.grants_users_update_description(),
	},

	// Chat Behavior & Settings
	'settings:update:system-prompt': {
		description: () => m.grants_settings_system_prompt_description(),
	},
	'api-keys:create:personal': {
		description: () => m.grants_api_keys_personal_description(),
	},
	'api-keys:create:shared': {
		description: () => m.grants_api_keys_shared_description(),
	},
} as const;

export type UserGrant = keyof typeof USER_GRANTS;

export function getGrantKeys(): UserGrant[] {
	return Object.keys(USER_GRANTS) as UserGrant[];
}

export function hasGrant(userGrants: readonly UserGrant[], grant: UserGrant): boolean {
	return userGrants.includes(grant);
}

export function hasAllGrants(
	userGrants: readonly UserGrant[],
	grants: readonly UserGrant[]
): boolean {
	return grants.every((grant) => userGrants.includes(grant));
}

export function hasAnyGrant(
	userGrants: readonly UserGrant[],
	grants: readonly UserGrant[]
): boolean {
	return grants.some((grant) => userGrants.includes(grant));
}
