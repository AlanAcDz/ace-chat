import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';

import type { Actions, PageServerLoad } from './$types';
import type { UserGrant } from '$lib/grants';
import { hasGrant } from '$lib/grants';
import { requireLogin } from '$lib/server/auth';
import { createInvite, deleteInvite, getAllInvites } from '$lib/server/data/invites';
import { deleteUser, getAllUsers, updateUserGrants } from '$lib/server/data/users';

const createInviteSchema = z.object({
	username: z.string().min(3).max(50),
	grants: z.array(z.string()).default([]),
});

const deleteUserSchema = z.object({
	id: z.string(),
});

const deleteInviteSchema = z.object({
	id: z.string(),
});

const updateUserSchema = z.object({
	id: z.string(),
	grants: z.array(z.string()).default([]),
});

export const load: PageServerLoad = async ({ depends }) => {
	depends('app:users');

	const user = requireLogin();

	// Check permissions
	if (!hasGrant(user.grants as UserGrant[], 'users:view')) {
		throw error(403, 'Insufficient permissions');
	}

	// Return promises for both users and invites
	const usersPromise = getAllUsers();
	const invitesPromise = getAllInvites();

	return {
		users: usersPromise,
		invites: invitesPromise,
		canCreate: hasGrant(user.grants as UserGrant[], 'users:create'),
		canDelete: hasGrant(user.grants as UserGrant[], 'users:delete'),
		canUpdate: hasGrant(user.grants as UserGrant[], 'users:update'),
	};
};

export const actions: Actions = {
	createInvite: async (event) => {
		const sessionUser = requireLogin();

		if (!hasGrant(sessionUser.grants as UserGrant[], 'users:create')) {
			throw error(403, 'Insufficient permissions');
		}

		const formData = await event.request.formData();
		const data = {
			username: formData.get('username'),
			grants: formData.getAll('grants') as string[],
		};

		const validation = createInviteSchema.safeParse(data);
		if (!validation.success) {
			return fail(400, {
				errors: validation.error.flatten().fieldErrors,
			});
		}

		try {
			await createInvite({
				invitedBy: sessionUser.id,
				username: validation.data.username,
				grants: validation.data.grants,
			});

			return {
				success: true,
			};
		} catch (err) {
			console.error('Error creating invite:', err);
			return fail(500, {
				errors: { _form: ['Failed to create invite'] },
			});
		}
	},

	updateUser: async (event) => {
		const sessionUser = requireLogin();

		if (!hasGrant(sessionUser.grants as UserGrant[], 'users:update')) {
			throw error(403, 'Insufficient permissions');
		}

		const formData = await event.request.formData();
		const data = {
			id: formData.get('id'),
			grants: formData.getAll('grants') as string[],
		};

		const validation = updateUserSchema.safeParse(data);
		if (!validation.success) {
			return fail(400, {
				errors: validation.error.flatten().fieldErrors,
			});
		}

		// Prevent updating own grants
		if (validation.data.id === sessionUser.id) {
			return fail(400, {
				errors: { _form: ['Cannot update your own grants'] },
			});
		}

		try {
			await updateUserGrants(validation.data.id, validation.data.grants);

			return {
				success: true,
			};
		} catch (err) {
			console.error('Error updating user:', err);
			return fail(500, {
				errors: { _form: ['Failed to update user'] },
			});
		}
	},

	deleteUser: async (event) => {
		const sessionUser = requireLogin();

		if (!hasGrant(sessionUser.grants as UserGrant[], 'users:delete')) {
			throw error(403, 'Insufficient permissions');
		}

		const formData = await event.request.formData();
		const data = { id: formData.get('id') };

		const validation = deleteUserSchema.safeParse(data);
		if (!validation.success) {
			return fail(400, {
				errors: validation.error.flatten().fieldErrors,
			});
		}

		// Prevent self-deletion
		if (validation.data.id === sessionUser.id) {
			return fail(400, {
				errors: { _form: ['Cannot delete your own account'] },
			});
		}

		try {
			await deleteUser(validation.data.id);

			return {
				success: true,
			};
		} catch (err) {
			console.error('Error deleting user:', err);
			return fail(500, {
				errors: { _form: ['Failed to delete user'] },
			});
		}
	},

	deleteInvite: async (event) => {
		const sessionUser = requireLogin();

		if (!hasGrant(sessionUser.grants as UserGrant[], 'users:delete')) {
			throw error(403, 'Insufficient permissions');
		}

		const formData = await event.request.formData();
		const data = { id: formData.get('id') };

		const validation = deleteInviteSchema.safeParse(data);
		if (!validation.success) {
			return fail(400, {
				errors: validation.error.flatten().fieldErrors,
			});
		}

		try {
			await deleteInvite(validation.data.id);

			return {
				success: true,
			};
		} catch (err) {
			console.error('Error deleting invite:', err);
			return fail(500, {
				errors: { _form: ['Failed to delete invite'] },
			});
		}
	},
};
