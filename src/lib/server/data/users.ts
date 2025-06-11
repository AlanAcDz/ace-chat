import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';

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
