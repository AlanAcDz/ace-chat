import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import { env } from '$env/dynamic/private';

// Use environment variable or default to a local 'uploads' directory
const UPLOAD_DIR = env.UPLOAD_DIR || 'uploads';

/**
 * Ensures the directory exists, creating it if necessary
 */
async function ensureDir(dirPath: string): Promise<void> {
	if (!existsSync(dirPath)) {
		await mkdir(dirPath, { recursive: true });
	}
}

/**
 * Saves a file to the storage system
 * @param file - The file to save
 * @param userId - The user ID
 * @param chatId - The chat ID
 * @returns The relative file path
 */
export async function saveFile(file: File, userId: string, chatId: string): Promise<string> {
	// Create the directory structure: uploads/userId/chatId/
	const userDir = join(UPLOAD_DIR, userId);
	const chatDir = join(userDir, chatId);

	await ensureDir(chatDir);

	// Generate a unique filename to avoid conflicts
	const timestamp = Date.now();
	const randomSuffix = Math.random().toString(36).substring(2, 8);
	const fileExtension = file.name.split('.').pop() || '';
	const uniqueFileName = `${timestamp}_${randomSuffix}.${fileExtension}`;

	const fullPath = join(chatDir, uniqueFileName);

	// Convert File to ArrayBuffer and save
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	await writeFile(fullPath, buffer);

	// Return relative path for storage in database
	return join(userId, chatId, uniqueFileName);
}

/**
 * Saves an avatar file for a user
 * @param file - The avatar file to save
 * @param userId - The user ID
 * @returns The relative file path for the avatar
 */
export async function saveAvatar(file: File, userId: string): Promise<string> {
	// Create the directory structure: uploads/avatars/userId/
	const avatarDir = join(UPLOAD_DIR, 'avatars');
	const userAvatarDir = join(avatarDir, userId);

	await ensureDir(userAvatarDir);

	// Generate filename with timestamp to allow updating
	const timestamp = Date.now();
	const fileExtension = file.name.split('.').pop() || 'jpg';
	const fileName = `avatar_${timestamp}.${fileExtension}`;

	const fullPath = join(userAvatarDir, fileName);

	// Convert File to ArrayBuffer and save
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	await writeFile(fullPath, buffer);

	// Return relative path for storage in database
	return join('avatars', userId, fileName);
}

/**
 * Gets the full file path from a relative path
 * @param relativePath - The relative path stored in the database
 * @returns The full file path
 */
export function getFullFilePath(relativePath: string): string {
	return join(UPLOAD_DIR, relativePath);
}

/**
 * Ensures the base upload directory exists
 */
export async function initializeStorage(): Promise<void> {
	await ensureDir(UPLOAD_DIR);
}
