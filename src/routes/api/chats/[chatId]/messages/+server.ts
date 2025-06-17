import { error, json } from '@sveltejs/kit';
import { and, asc, eq, gte, inArray } from 'drizzle-orm';

import type { RequestHandler } from './$types';
import { m } from '$lib/paraglide/messages.js';
import { requireLogin } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { attachment, chat, message } from '$lib/server/db/schema';
import { deleteFile } from '$lib/server/storage';

// Helper function to validate chat ownership
async function validateChatOwnership(chatId: string, userId: string) {
	const existingChat = await db.query.chat.findFirst({
		where: and(eq(chat.id, chatId), eq(chat.userId, userId)),
	});

	if (!existingChat) {
		error(404, m.api_error_chat_not_found());
	}

	return existingChat;
}

// Helper function to get all messages in a chat
async function getChatMessages(chatId: string) {
	return await db.query.message.findMany({
		where: eq(message.chatId, chatId),
		orderBy: [asc(message.createdAt)],
	});
}

// Helper function to get attachments that will be deleted
async function getAttachmentsToDelete(userId: string, messageIds: string[]) {
	if (messageIds.length === 0) return [];

	return await db.query.attachment.findMany({
		where: and(eq(attachment.userId, userId), inArray(attachment.messageId, messageIds)),
		columns: {
			id: true,
			filePath: true,
			messageId: true,
		},
	});
}

// Helper function to cleanup attachment files
function cleanupAttachmentFiles(attachments: { filePath: string }[]) {
	if (attachments.length > 0) {
		for (const attachment of attachments) {
			void deleteFile(attachment.filePath);
		}
	}
}

// Helper function to update chat timestamp
async function updateChatTimestamp(
	chatId: string,
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
) {
	await tx.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, chatId));
}

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
			error(400, m.message_edit_valid_index_required());
		}
	} catch {
		error(400, m.api_error_invalid_json());
	}

	// Validate chat ownership
	await validateChatOwnership(chatId, user.id);

	// Get all messages in the chat
	const allMessages = await getChatMessages(chatId);

	// Validate message index
	if (deleteFromMessageIndex >= allMessages.length) {
		error(404, m.message_edit_index_out_of_range());
	}

	// Get the target message by index
	const targetMessage = allMessages[deleteFromMessageIndex];

	// Get all messages that will be deleted (from target onwards)
	const messagesToDelete = allMessages.slice(deleteFromMessageIndex);
	const messageIdsToDelete = messagesToDelete.map((msg) => msg.id);

	// Get all attachments for messages that will be deleted
	const attachmentsToDelete = await getAttachmentsToDelete(user.id, messageIdsToDelete);

	// Use a transaction to delete messages and update chat timestamp
	await db.transaction(async (tx) => {
		// Delete all messages from the target message onwards (including the target)
		// The database schema should handle cascading deletes for attachments
		await tx
			.delete(message)
			.where(and(eq(message.chatId, chatId), gte(message.createdAt, targetMessage.createdAt)));

		// Update chat's updatedAt timestamp
		await updateChatTimestamp(chatId, tx);
	});

	// Delete attachment files from file system (fire-and-forget to not block response)
	cleanupAttachmentFiles(attachmentsToDelete);

	return json({
		success: true,
		message: m.message_edit_delete_success(),
	});
};

export const PUT: RequestHandler = async ({ params, request }) => {
	// Validate user authentication
	const user = requireLogin();
	const { chatId } = params;

	// Parse request body to get the messageId and new content
	let messageId: string;
	let tempMessageId: string | undefined;
	let newContent: string;
	try {
		const body = await request.json();
		messageId = body.messageId;
		tempMessageId = body.tempMessageId;
		newContent = body.content;

		if (typeof messageId !== 'string' || messageId.trim() === '') {
			error(400, 'Valid message ID is required');
		}

		if (typeof newContent !== 'string' || newContent.trim() === '') {
			error(400, m.message_edit_valid_content_required());
		}
	} catch {
		error(400, m.api_error_invalid_json());
	}

	// Validate chat ownership
	await validateChatOwnership(chatId, user.id);

	// Get all messages in the chat
	const allMessages = await getChatMessages(chatId);

	// Find the target message by ID (check both real ID and temp ID)
	const targetMessage = allMessages.find(
		(msg) => msg.id === messageId || msg.temporaryId === tempMessageId
	);

	if (!targetMessage) {
		error(404, 'Message not found');
	}

	// Verify it's a user message
	if (targetMessage.role !== 'user') {
		error(400, m.message_edit_user_messages_only());
	}

	// Get all messages that will be deleted (messages created after the target message)
	const messagesToDelete = allMessages.filter((msg) => msg.createdAt > targetMessage.createdAt);
	const messageIdsToDelete = messagesToDelete.map((msg) => msg.id);

	// Get all attachments for messages that will be deleted
	const attachmentsToDelete = await getAttachmentsToDelete(user.id, messageIdsToDelete);

	// Use a transaction to update the target message, delete subsequent messages, and update chat timestamp
	await db.transaction(async (tx) => {
		// Update the target message content
		await tx
			.update(message)
			.set({
				content: newContent.trim(),
			})
			.where(eq(message.id, targetMessage.id));

		// Delete all messages after the target message
		if (messagesToDelete.length > 0) {
			await tx
				.delete(message)
				.where(
					and(eq(message.chatId, chatId), gte(message.createdAt, messagesToDelete[0].createdAt))
				);
		}

		// Update chat's updatedAt timestamp
		await updateChatTimestamp(chatId, tx);
	});

	// Delete attachment files from file system (fire-and-forget to not block response)
	cleanupAttachmentFiles(attachmentsToDelete);

	return json({
		success: true,
		message: m.message_edit_update_success(),
	});
};
