import type { PageServerLoad } from './$types';
import { requireLogin } from '$lib/server/auth';

export const load = (async ({ parent }) => {
	requireLogin();
	const { user } = await parent();
	return { user };
}) satisfies PageServerLoad;
