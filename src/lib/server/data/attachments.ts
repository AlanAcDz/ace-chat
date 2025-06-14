import { and, count, desc, eq, inArray, sum } from 'drizzle-orm';

import type { NewAttachment } from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { attachment } from '$lib/server/db/schema';
import { deleteFile, saveFile } from '$lib/server/storage';

/**
 * Process generated files and save them as attachments
 */
export async function processGeneratedFiles(
	files: Array<{ mimeType: string; uint8Array?: Uint8Array; base64: string }>,
	chatId: string,
	messageId: string,
	userId: string
): Promise<void> {
	const fileObjects: File[] = [];

	for (const [index, file] of files.entries()) {
		try {
			// Determine file extension from MIME type
			const extension =
				file.mimeType === 'image/png'
					? '.png'
					: file.mimeType === 'image/jpeg'
						? '.jpg'
						: file.mimeType === 'image/webp'
							? '.webp'
							: file.mimeType === 'image/gif'
								? '.gif'
								: '.png';

			const fileName = `generated-image-${Date.now()}-${index + 1}${extension}`;

			// Create File object from the generated file data
			// GeneratedFile has either uint8Array or base64 property
			const fileData = file.uint8Array || new Uint8Array(Buffer.from(file.base64, 'base64'));
			const blob = new Blob([fileData], { type: file.mimeType });
			const fileObject = new File([blob], fileName, { type: file.mimeType });
			fileObjects.push(fileObject);
		} catch (error) {
			console.error(`Error processing generated file ${index + 1}:`, error);
		}
	}

	// Save files as attachments (fire-and-forget)
	if (fileObjects.length > 0) {
		processAttachments(chatId, messageId, userId, fileObjects);
	}
}

/**
 * Processes and saves chat message attachments in the background.
 * This function is designed to be called without `await` (fire-and-forget).
 * It handles its own errors to avoid crashing the main application thread.
 * @param chatId - The chat ID
 * @param userMessageId - The message ID to attach files to
 * @param userId - The user ID
 * @param files - Array of files to process
 */
export async function processAttachments(
	chatId: string,
	userMessageId: string,
	userId: string,
	files: File[]
): Promise<void> {
	try {
		const attachmentsToInsert: NewAttachment[] = [];

		// Save files and prepare attachment records
		for (const file of files) {
			try {
				const relativePath = await saveFile(file, userId, chatId);
				attachmentsToInsert.push({
					messageId: userMessageId,
					userId: userId,
					fileName: file.name,
					fileType: file.type,
					fileSize: file.size,
					filePath: relativePath,
				});
			} catch (fileError) {
				console.error(`Error saving file '${file.name}' for chat ${chatId}:`, fileError);
			}
		}

		if (attachmentsToInsert.length > 0) {
			await db.insert(attachment).values(attachmentsToInsert);
		}
	} catch (e) {
		console.error(`Error processing attachments in background for chat ${chatId}:`, e);
	}
}

/**
 * Get all attachments for a user, ordered by creation date (newest first)
 * @param userId - The user ID
 * @returns Promise resolving to array of attachments
 */
export async function getUserAttachments(userId: string) {
	return db.query.attachment.findMany({
		where: eq(attachment.userId, userId),
		orderBy: [desc(attachment.createdAt)],
	});
}

/**
 * Get a single attachment by ID and user ID (for security)
 * @param attachmentId - The attachment ID
 * @param userId - The user ID
 * @returns Promise resolving to attachment or null
 */
export async function getAttachment(attachmentId: string, userId: string) {
	return db.query.attachment.findFirst({
		where: and(eq(attachment.id, attachmentId), eq(attachment.userId, userId)),
	});
}

/**
 * Delete a single attachment (both database record and physical file)
 * @param attachmentId - The attachment ID
 * @param userId - The user ID for security verification
 * @returns Promise resolving to success boolean
 */
export async function deleteAttachment(attachmentId: string, userId: string): Promise<boolean> {
	try {
		// First, get the attachment to verify ownership and get file path
		const attachmentToDelete = await db.query.attachment.findFirst({
			where: and(eq(attachment.id, attachmentId), eq(attachment.userId, userId)),
			columns: { id: true, filePath: true },
		});

		if (!attachmentToDelete) {
			throw new Error('Archivo no encontrado o sin permisos');
		}

		// Delete from database first
		await db.delete(attachment).where(eq(attachment.id, attachmentId));

		// Delete physical file (fire-and-forget to not block response)
		void deleteFile(attachmentToDelete.filePath);

		return true;
	} catch (error) {
		console.error('Error deleting attachment:', error);
		throw error;
	}
}

/**
 * Delete multiple attachments (both database records and physical files)
 * @param attachmentIds - Array of attachment IDs
 * @param userId - The user ID for security verification
 * @returns Promise resolving to number of deleted attachments
 */
export async function deleteMultipleAttachments(
	attachmentIds: string[],
	userId: string
): Promise<number> {
	try {
		// First, get all attachments to verify ownership and get file paths
		const attachmentsToDelete = await db.query.attachment.findMany({
			where: and(inArray(attachment.id, attachmentIds), eq(attachment.userId, userId)),
			columns: { id: true, filePath: true },
		});

		if (attachmentsToDelete.length !== attachmentIds.length) {
			throw new Error('Algunos archivos no fueron encontrados o sin permisos');
		}

		// Delete from database first
		await db
			.delete(attachment)
			.where(and(inArray(attachment.id, attachmentIds), eq(attachment.userId, userId)));

		// Delete physical files (fire-and-forget to not block response)
		for (const attachmentToDelete of attachmentsToDelete) {
			void deleteFile(attachmentToDelete.filePath);
		}

		return attachmentsToDelete.length;
	} catch (error) {
		console.error('Error deleting multiple attachments:', error);
		throw error;
	}
}

/**
 * Get attachment count for a user
 * @param userId - The user ID
 * @returns Promise resolving to attachment count
 */
export async function getAttachmentCount(userId: string): Promise<number> {
	const result = await db
		.select({ count: count() })
		.from(attachment)
		.where(eq(attachment.userId, userId));

	return result[0]?.count ?? 0;
}

/**
 * Get total file size for all user attachments
 * @param userId - The user ID
 * @returns Promise resolving to total size in bytes
 */
export async function getUserAttachmentsSize(userId: string): Promise<number> {
	const result = await db
		.select({
			totalSize: sum(attachment.fileSize),
		})
		.from(attachment)
		.where(eq(attachment.userId, userId));

	return Number(result[0]?.totalSize ?? 0);
}
