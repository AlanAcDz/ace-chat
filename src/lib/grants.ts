export const USER_GRANTS = {
	// User Management
	'users:view': {
		description: 'Can view the list of all users in the system.',
	},
	'users:create': {
		description: 'Can create new users.',
	},
	'users:delete': {
		description: 'Can delete existing users.',
	},
	'users:update': {
		description: "Can update other users' information and grants.",
	},

	// Chat Behavior & Settings
	'settings:update:system-prompt': {
		description: 'Can modify their personal default system prompt.',
	},
	'api-keys:create:personal': {
		description: 'Can add and use their own personal API keys.',
	},
	'api-keys:create:shared': {
		description: 'Can add shared API keys that are available to all users.',
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
