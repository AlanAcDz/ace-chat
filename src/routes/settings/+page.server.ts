import type { Actions } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';

import type { PageServerLoad } from './$types';
import type { UserGrant } from '$lib/grants';
import { hasGrant } from '$lib/grants';
import { m } from '$lib/paraglide/messages.js';
import { requireLogin } from '$lib/server/auth';
import * as auth from '$lib/server/auth';
import { updateUserProfile } from '$lib/server/data/users';
import { profileSchema } from './schema';

export const load = (async ({ parent }) => {
	requireLogin();

	// Get full user data for the form
	const { user } = await parent();

	// Create form with current user data (excluding avatarUrl)
	const form = await superValidate(
		{
			username: user.username,
			name: user.name || '',
			defaultSystemPrompt: user.defaultSystemPrompt || '',
		},
		zod(profileSchema)
	);

	return {
		form,
		canUpdateSystemPrompt: hasGrant(user.grants as UserGrant[], 'settings:update:system-prompt'),
	};
}) satisfies PageServerLoad;

export const actions: Actions = {
	updateProfile: async (event) => {
		const sessionUser = requireLogin();
		const formData = await event.request.formData();

		// Handle avatar file upload
		const avatarFile = formData.get('avatar') as File | null;

		// Create a new FormData without the avatar file for supervalidate
		const validationData = new FormData();
		for (const [key, value] of formData.entries()) {
			if (key !== 'avatar') {
				validationData.append(key, value);
			}
		}

		const form = await superValidate(validationData, zod(profileSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { username, name, defaultSystemPrompt } = form.data;

		try {
			// Update user profile using the data layer function
			await updateUserProfile(
				sessionUser.id,
				{
					username,
					name,
					defaultSystemPrompt,
				},
				avatarFile
			);

			return {
				form: {
					...form,
					message: m.server_profile_update_success(),
				},
			};
		} catch (error) {
			console.error('Error updating profile:', error);

			// Handle specific error messages
			const errorMessage = error instanceof Error ? error.message : m.server_profile_update_error();

			return fail(400, {
				form: {
					...form,
					message: errorMessage,
				},
			});
		}
	},

	logout: async (event) => {
		if (!event.locals.session) {
			return fail(401);
		}
		await auth.invalidateSession(event.locals.session.id);
		auth.deleteSessionTokenCookie(event);
		return redirect(302, '/login');
	},
};
