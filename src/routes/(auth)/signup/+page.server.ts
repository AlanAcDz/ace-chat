import { fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import type { Actions, PageServerLoad } from './$types';
import { getGrantKeys } from '$lib/grants';
import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { createId } from '$lib/server/utils';
import { registerSchema } from './schema';

export const load = (async () => {
	auth.requirePublic();

	return {
		form: await superValidate(zod(registerSchema)),
	};
}) satisfies PageServerLoad;

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(registerSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { username, password } = form.data;

		// Check if user already exists
		const existingUser = await db
			.select()
			.from(table.user)
			.where(eq(table.user.username, username));
		if (existingUser.length > 0) {
			return fail(400, {
				form: {
					...form,
					message: 'Este nombre de usuario ya está en uso',
				},
			});
		}

		const userId = createId('usr');
		const passwordHash = await hash(password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1,
		});

		try {
			// todo: only first user gets all grants
			await db.insert(table.user).values({
				id: userId,
				username,
				passwordHash,
				grants: getGrantKeys(),
			});

			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, userId);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
		} catch (error) {
			console.error('Error creating user:', error);
			return fail(500, {
				form: {
					...form,
					message: 'Ha ocurrido un error al crear la cuenta',
				},
			});
		}
		return redirect(302, '/');
	},
};
