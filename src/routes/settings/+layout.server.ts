import type { LayoutServerLoad } from './$types';
import { requireLogin } from '$lib/server/auth';
import { getFullUser } from '$lib/server/data/users';

export const load = (async ({ depends }) => {
	const sessionUser = requireLogin();

	depends('app:user');

	return {
		user: await getFullUser(sessionUser.id),
	};
}) satisfies LayoutServerLoad;
