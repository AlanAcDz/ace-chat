import { error, json } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';

import type { RequestHandler } from './$types';
import { requireLogin } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { attachment, chat, message } from '$lib/server/db/schema';

export const POST: RequestHandler = async ({ params, request }) => {
	// Validate user authentication
	const user = requireLogin();

	const { chatId } = params;

	// Parse request body to get the messageId to branch from
	let branchFromMessageId: string;
	try {
		const body = await request.json();
		branchFromMessageId = body.messageId;

		if (!branchFromMessageId) {
			error(400, 'Se requiere messageId');
		}
	} catch {
		error(400, 'Invalid JSON body');
	}

	// Get the original chat and verify ownership
	const originalChat = await db.query.chat.findFirst({
		where: and(eq(chat.id, chatId), eq(chat.userId, user.id)),
	});

	if (!originalChat) {
		error(404, 'Chat no encontrado');
	}

	// Get all messages in the chat (ordered by creation time)
	const allMessages = await db.query.message.findMany({
		where: eq(message.chatId, chatId),
		with: {
			attachments: true,
		},
		orderBy: [asc(message.createdAt)],
	});

	// Find the index of the message to branch from
	const branchMessageIndex = allMessages.findIndex((msg) => msg.id === branchFromMessageId);

	if (branchMessageIndex === -1) {
		error(404, 'Mensaje no encontrado');
	}

	// Get all messages up to and including the branch point
	const messagesToCopy = allMessages.slice(0, branchMessageIndex + 1);

	// Create the new branched chat and copy all messages/attachments in a transaction
	const newChatId = await db.transaction(async (tx) => {
		// Create the new chat with a modified title and mark it as branched
		const [newChat] = await tx
			.insert(chat)
			.values({
				userId: user.id,
				title: `Rama de ${originalChat.title}`,
				isBranched: true,
			})
			.returning({ id: chat.id });

		// Copy all messages to the new chat
		for (const originalMessage of messagesToCopy) {
			const [newMessage] = await tx
				.insert(message)
				.values({
					chatId: newChat.id,
					role: originalMessage.role,
					content: originalMessage.content,
					model: originalMessage.model,
					hasWebSearch: originalMessage.hasWebSearch,
					hasAttachments: originalMessage.hasAttachments,
					// Note: we don't copy temporaryId or parentId for branches
				})
				.returning({ id: message.id });

			// Copy all attachments for this message
			if (originalMessage.attachments && originalMessage.attachments.length > 0) {
				const attachmentValues = originalMessage.attachments.map((att) => ({
					messageId: newMessage.id,
					userId: user.id,
					fileName: att.fileName,
					fileType: att.fileType,
					fileSize: att.fileSize,
					filePath: att.filePath, // Same file path - files are shared
				}));

				await tx.insert(attachment).values(attachmentValues);
			}
		}

		return newChat.id;
	});

	return json({
		success: true,
		newChatId,
		message: 'Chat ramificado exitosamente',
	});
};
