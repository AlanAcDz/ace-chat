import { eq } from 'drizzle-orm';

import type { UserGrant } from '$lib/grants';
import { hasGrant } from '$lib/grants';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { saveAvatar } from '$lib/server/storage';

/**
 * Get all users (excluding sensitive fields like password hash)
 */
export async function getAllUsers() {
	return await db.query.user.findMany({
		columns: {
			id: true,
			username: true,
			name: true,
			avatarUrl: true,
			grants: true,
			language: true,
			defaultSystemPrompt: true,
			createdAt: true,
			updatedAt: true,
		},
		orderBy: (users, { desc }) => [desc(users.createdAt)],
	});
}

/**
 * Get user count (for checking if first user)
 */
export async function getUserCount(): Promise<number> {
	const users = await db.select().from(userTable);
	return users.length;
}

/**
 * Delete a user by ID
 */
export async function deleteUser(userId: string) {
	const [deletedUser] = await db.delete(userTable).where(eq(userTable.id, userId)).returning({
		id: userTable.id,
		username: userTable.username,
	});

	if (!deletedUser) {
		throw new Error('User not found');
	}

	return deletedUser;
}

/**
 * Get a complete user object by ID (excluding sensitive fields like password hash)
 * Throws an error if user is not found
 */
export async function getFullUser(userId: string) {
	const [user] = await db
		.select({
			id: userTable.id,
			username: userTable.username,
			name: userTable.name,
			avatarUrl: userTable.avatarUrl,
			grants: userTable.grants,
			language: userTable.language,
			defaultSystemPrompt: userTable.defaultSystemPrompt,
			createdAt: userTable.createdAt,
			updatedAt: userTable.updatedAt,
		})
		.from(userTable)
		.where(eq(userTable.id, userId))
		.limit(1);

	if (!user) {
		throw new Error('Usuario no encontrado');
	}

	return user;
}

/**
 * Check if a username is available (not taken by another user)
 * @param username - The username to check
 * @param excludeUserId - User ID to exclude from the check (for current user updates)
 * @returns true if username is available, false if taken
 */
export async function isUsernameAvailable(
	username: string,
	excludeUserId?: string
): Promise<boolean> {
	const whereConditions = [eq(userTable.username, username)];

	// If we're updating an existing user, exclude their current record
	if (excludeUserId) {
		whereConditions.push(eq(userTable.id, excludeUserId));
	}

	const [existingUser] = await db
		.select({ id: userTable.id })
		.from(userTable)
		.where(
			excludeUserId
				? // For updates: username exists AND it's not the current user
					eq(userTable.username, username)
				: // For new users: username exists
					eq(userTable.username, username)
		);

	// If excludeUserId is provided, we need to check if the found user is NOT the excluded user
	if (excludeUserId && existingUser) {
		return existingUser.id === excludeUserId;
	}

	// Username is available if no existing user was found
	return !existingUser;
}

/**
 * Update user avatar with uploaded file
 * @param userId - The user ID
 * @param avatarFile - The uploaded avatar file
 * @returns The new avatar URL
 */
export async function updateUserAvatar(userId: string, avatarFile: File): Promise<string> {
	// Validate file type
	if (!avatarFile.type.startsWith('image/')) {
		throw new Error('El archivo debe ser una imagen');
	}

	// Validate file size (max 5MB)
	if (avatarFile.size > 5 * 1024 * 1024) {
		throw new Error('La imagen no puede ser mayor a 5MB');
	}

	try {
		// Save the avatar file
		const avatarPath = await saveAvatar(avatarFile, userId);
		const avatarUrl = `/api/avatars/${avatarPath}`;

		// Update user's avatar URL in database
		await db
			.update(userTable)
			.set({
				avatarUrl,
				updatedAt: new Date(),
			})
			.where(eq(userTable.id, userId));

		return avatarUrl;
	} catch (error) {
		console.error('Error saving avatar:', error);
		throw new Error('Error al subir el avatar');
	}
}

export interface UpdateUserProfileData {
	username?: string;
	name?: string;
	defaultSystemPrompt?: string;
}

/**
 * Update user profile information
 * @param userId - The user ID
 * @param profileData - The profile data to update
 * @param avatarFile - Optional avatar file to upload
 * @returns Updated user data
 */
export async function updateUserProfile(
	userId: string,
	profileData: UpdateUserProfileData,
	avatarFile?: File | null
) {
	// Get current user data
	const currentUser = await getFullUser(userId);

	// Check username availability if username is being changed
	if (profileData.username && profileData.username !== currentUser.username) {
		const isAvailable = await isUsernameAvailable(profileData.username, userId);
		if (!isAvailable) {
			throw new Error('Este nombre de usuario ya está en uso');
		}
	}

	// Prepare update data
	const updateData: Partial<typeof userTable.$inferInsert> = {
		updatedAt: new Date(),
	};

	// Update username if provided
	if (profileData.username) {
		updateData.username = profileData.username;
	}

	// Update name if provided (can be empty string to clear)
	if (profileData.name !== undefined) {
		updateData.name = profileData.name || null;
	}

	// Update default system prompt if user has permission and value is provided
	if (profileData.defaultSystemPrompt !== undefined) {
		if (hasGrant(currentUser.grants as UserGrant[], 'settings:update:system-prompt')) {
			updateData.defaultSystemPrompt = profileData.defaultSystemPrompt || null;
		}
	}

	// Handle avatar upload if provided
	if (avatarFile && avatarFile.size > 0) {
		const avatarUrl = await updateUserAvatar(userId, avatarFile);
		updateData.avatarUrl = avatarUrl;
	}

	// Update user in database
	await db.update(userTable).set(updateData).where(eq(userTable.id, userId));

	// Return updated user data
	return await getFullUser(userId);
}

/**
 * Update user grants and optionally system prompt
 */
export async function updateUserGrants(
	userId: string,
	grants: string[],
	systemPrompt?: string | null
) {
	const updateData: Partial<typeof userTable.$inferInsert> = {
		grants,
		updatedAt: new Date(),
	};

	// Only update system prompt if provided
	if (systemPrompt !== undefined) {
		updateData.defaultSystemPrompt = systemPrompt || null;
	}

	const [updatedUser] = await db
		.update(userTable)
		.set(updateData)
		.where(eq(userTable.id, userId))
		.returning({
			id: userTable.id,
			username: userTable.username,
			grants: userTable.grants,
			defaultSystemPrompt: userTable.defaultSystemPrompt,
		});

	if (!updatedUser) {
		throw new Error('User not found');
	}

	return updatedUser;
}
