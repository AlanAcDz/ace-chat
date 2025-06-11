import type { LayoutServerLoad } from './$types';
import { requireLogin } from '$lib/server/auth';
import { getFullUser } from '$lib/server/data/users';

export const load = (async () => {
	const sessionUser = requireLogin();

	return {
		user: getFullUser(sessionUser.id),
	};
}) satisfies LayoutServerLoad;
