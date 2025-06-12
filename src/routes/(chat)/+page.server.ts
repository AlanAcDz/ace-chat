import type { PageServerLoad } from './$types';
import { requireLogin } from '$lib/server/auth';

export const load = (() => {
	requireLogin();
}) satisfies PageServerLoad;
