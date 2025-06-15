import { fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import type { Actions, PageServerLoad } from './$types';
import { getGrantKeys } from '$lib/grants';
import { m } from '$lib/paraglide/messages.js';
import * as auth from '$lib/server/auth';
import { deleteInviteByUsername, getInviteByUsername } from '$lib/server/data/invites';
import { getUserCount } from '$lib/server/data/users';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { createId } from '$lib/server/utils';
import { registerSchema } from './schema';

export const load = (async ({ url }) => {
	auth.requirePublic();

	// Check if there's a username parameter (from invite link)
	const invitedUsername = url.searchParams.get('username');
	let invite = null;

	if (invitedUsername) {
		// Check if there's a valid invite for this username
		invite = await getInviteByUsername(invitedUsername);
	}

	// Check if this is the first user (no users exist)
	const userCount = await getUserCount();
	const isFirstUser = userCount === 0;

	return {
		form: await superValidate(zod(registerSchema)),
		invite,
		isFirstUser,
		requiresInvite: !isFirstUser && !invite,
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
					message: m.server_auth_username_taken(),
				},
			});
		}

		// Check if there's an invite for this username
		const invite = await getInviteByUsername(username);

		// Check if this is the first user (no users exist)
		const userCount = await getUserCount();
		const isFirstUser = userCount === 0;

		// Only allow signup without invite if this is the first user
		if (!invite && !isFirstUser) {
			return fail(400, {
				form: {
					...form,
					message: m.server_auth_signup_invite_only(),
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
			// Create user with grants from invite or default grants for first user
			let userGrants: string[] = [];

			if (invite) {
				// Use grants from the invite
				userGrants = invite.grants;
			} else if (isFirstUser) {
				// First user gets all grants
				userGrants = getGrantKeys();
			}
			// Note: This else case should never happen due to the check above

			await db.insert(table.user).values({
				id: userId,
				username,
				passwordHash,
				grants: userGrants,
			});

			// If user was created from an invite, delete the invite
			if (invite) {
				await deleteInviteByUsername(username);
			}

			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, userId);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
		} catch (error) {
			console.error('Error creating user:', error);
			return fail(500, {
				form: {
					...form,
					message: m.server_auth_signup_error(),
				},
			});
		}
		return redirect(302, '/');
	},
};
