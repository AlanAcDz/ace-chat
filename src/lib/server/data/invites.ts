import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { userInvite, user as userTable } from '$lib/server/db/schema';
import { createId } from '$lib/server/utils';

export interface CreateInviteData {
	invitedBy: string;
	username: string;
	grants: string[];
}

/**
 * Get all user invites with inviter information
 */
export async function getAllInvites() {
	return await db.query.userInvite.findMany({
		with: {
			invitedBy: {
				columns: {
					username: true,
					name: true,
				},
			},
		},
		orderBy: (invites, { desc }) => [desc(invites.createdAt)],
	});
}

/**
 * Get invite by username
 */
export async function getInviteByUsername(username: string) {
	return await db.query.userInvite.findFirst({
		where: eq(userInvite.username, username),
		with: {
			invitedBy: {
				columns: {
					username: true,
					name: true,
				},
			},
		},
	});
}

/**
 * Check if username is available (not taken by user or existing invite)
 */
export async function isUsernameAvailableForInvite(username: string): Promise<boolean> {
	// Check if username exists in users table
	const existingUser = await db.query.user.findFirst({
		where: eq(userTable.username, username),
		columns: { id: true },
	});

	if (existingUser) {
		return false;
	}

	// Check if invite already exists for this username
	const existingInvite = await db.query.userInvite.findFirst({
		where: eq(userInvite.username, username),
		columns: { id: true },
	});

	return !existingInvite;
}

/**
 * Create a new user invite
 */
export async function createInvite(data: CreateInviteData) {
	// Check username availability
	const isAvailable = await isUsernameAvailableForInvite(data.username);
	if (!isAvailable) {
		throw new Error('Username already exists or invite already exists for this username');
	}

	const inviteId = createId('inv');

	try {
		const [invite] = await db
			.insert(userInvite)
			.values({
				id: inviteId,
				invitedBy: data.invitedBy,
				username: data.username,
				grants: data.grants,
			})
			.returning();

		return invite;
	} catch (error) {
		console.error('Error creating invite:', error);
		throw new Error('Failed to create invite');
	}
}

/**
 * Delete an invite by ID
 */
export async function deleteInvite(inviteId: string) {
	const [deletedInvite] = await db
		.delete(userInvite)
		.where(eq(userInvite.id, inviteId))
		.returning();

	if (!deletedInvite) {
		throw new Error('Invite not found');
	}

	return deletedInvite;
}

/**
 * Delete invite by username (used after successful user registration)
 */
export async function deleteInviteByUsername(username: string) {
	const [deletedInvite] = await db
		.delete(userInvite)
		.where(eq(userInvite.username, username))
		.returning();

	return deletedInvite;
}
