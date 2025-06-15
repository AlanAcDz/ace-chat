import { error, json } from '@sveltejs/kit';
import { and, asc, eq, gte, inArray } from 'drizzle-orm';

import type { RequestHandler } from './$types';
import { m } from '$lib/paraglide/messages.js';
import { requireLogin } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { attachment, chat, message } from '$lib/server/db/schema';
import { deleteFile } from '$lib/server/storage';

export const DELETE: RequestHandler = async ({ params, request }) => {
	// Validate user authentication
	const user = requireLogin();

	const { chatId } = params;

	// Parse request body to get the messageIndex to delete from
	let deleteFromMessageIndex: number;
	try {
		const body = await request.json();
		deleteFromMessageIndex = body.messageIndex;

		if (typeof deleteFromMessageIndex !== 'number' || deleteFromMessageIndex < 0) {
			error(400, 'Valid message index is required');
		}
	} catch {
		error(400, m.api_error_invalid_json());
	}

	// Get the chat and verify ownership
	const existingChat = await db.query.chat.findFirst({
		where: and(eq(chat.id, chatId), eq(chat.userId, user.id)),
	});

	if (!existingChat) {
		error(404, m.api_error_chat_not_found());
	}

	// Get all messages in the chat (ordered by creation time)
	const allMessages = await db.query.message.findMany({
		where: eq(message.chatId, chatId),
		orderBy: [asc(message.createdAt)],
	});

	// Validate message index
	if (deleteFromMessageIndex >= allMessages.length) {
		error(404, 'Message index out of range');
	}

	// Get the target message by index
	const targetMessage = allMessages[deleteFromMessageIndex];

	// Get all messages that will be deleted (from target onwards)
	const messagesToDelete = allMessages.slice(deleteFromMessageIndex);
	const messageIdsToDelete = messagesToDelete.map((msg) => msg.id);

	// Get all attachments for messages that will be deleted
	const attachmentsToDelete = await db.query.attachment.findMany({
		where: and(eq(attachment.userId, user.id), inArray(attachment.messageId, messageIdsToDelete)),
		columns: {
			id: true,
			filePath: true,
			messageId: true,
		},
	});

	// Use a transaction to delete messages and update chat timestamp
	await db.transaction(async (tx) => {
		// Delete all messages from the target message onwards (including the target)
		// The database schema should handle cascading deletes for attachments
		await tx
			.delete(message)
			.where(and(eq(message.chatId, chatId), gte(message.createdAt, targetMessage.createdAt)));

		// Update chat's updatedAt timestamp
		await tx.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId));
	});

	// Delete attachment files from file system (fire-and-forget to not block response)
	if (attachmentsToDelete.length > 0) {
		for (const attachment of attachmentsToDelete) {
			void deleteFile(attachment.filePath);
		}
	}

	return json({
		success: true,
		message: 'Messages deleted successfully',
	});
};
