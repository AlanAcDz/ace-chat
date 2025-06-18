import { fail, redirect } from '@sveltejs/kit';
import { verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import type { Actions, PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';
import * as auth from '$lib/server/auth';
import { getUserCount } from '$lib/server/data/users';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { loginSchema } from './schema';

export const load = (async () => {
	auth.requirePublic();

	// Check if this is the first user (no users exist)
	const userCount = await getUserCount();
	if (userCount === 0) {
		return redirect(302, '/signup');
	}

	return {
		form: await superValidate(zod(loginSchema)),
	};
}) satisfies PageServerLoad;

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(loginSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { username, password } = form.data;

		const results = await db.select().from(table.user).where(eq(table.user.username, username));
		const existingUser = results.at(0);

		if (!existingUser) {
			return fail(400, {
				form: {
					...form,
					message: m.server_auth_invalid_credentials(),
				},
			});
		}

		const validPassword = await verify(existingUser.passwordHash, password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1,
		});

		if (!validPassword) {
			return fail(400, {
				form: {
					...form,
					message: m.server_auth_invalid_credentials(),
				},
			});
		}

		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, existingUser.id);
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

		return redirect(302, '/');
	},
};
