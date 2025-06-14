import { error } from '@sveltejs/kit';
import { isAfter, isToday, isYesterday, startOfDay, subDays } from 'date-fns';
import { and, asc, desc, eq, ilike, not } from 'drizzle-orm';

import type { NewMessage } from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { chat, chat as chatTable, message, user } from '$lib/server/db/schema';
import { processAttachments } from './attachments';

/**
 * Get all chat threads for a user (only id and title)
 * Optionally filter by title search
 */
export async function getUserChats(userId: string, searchQuery?: string) {
	const conditions = [eq(chatTable.userId, userId)];

	// Add search condition if provided
	if (searchQuery && searchQuery.trim()) {
		conditions.push(ilike(chatTable.title, `%${searchQuery.trim()}%`));
	}

	const chats = await db
		.select({
			id: chatTable.id,
			title: chatTable.title,
			updatedAt: chatTable.updatedAt,
		})
		.from(chatTable)
		.where(and(...conditions))
		.orderBy(desc(chatTable.updatedAt));

	return chats;
}

/**
 * Get a chat by id for a user
 */
export async function getUserChat(chatId: string, userId: string) {
	const chatData = await db.query.chat.findFirst({
		where: and(eq(chat.id, chatId), eq(chat.userId, userId)),
		with: {
			messages: {
				with: {
					attachments: true,
				},
				where: not(eq(message.role, 'system')),
				orderBy: [asc(message.createdAt)],
			},
		},
	});

	if (!chatData) {
		error(404, 'Chat no encontrado');
	}

	return chatData;
}

/**
 * Group chats by date ranges using date-fns
 */
export function groupChatsByDate(chats: Awaited<ReturnType<typeof getUserChats>>) {
	const now = new Date();
	const sevenDaysAgo = startOfDay(subDays(now, 7));
	const thirtyDaysAgo = startOfDay(subDays(now, 30));

	const groups = {
		today: [] as Array<{ id: string; title: string }>,
		yesterday: [] as Array<{ id: string; title: string }>,
		last7Days: [] as Array<{ id: string; title: string }>,
		last30Days: [] as Array<{ id: string; title: string }>,
		older: [] as Array<{ id: string; title: string }>,
	};

	for (const chat of chats) {
		const chatDate = new Date(chat.updatedAt);
		const chatOnly = { id: chat.id, title: chat.title };

		if (isToday(chatDate)) {
			groups.today.push(chatOnly);
		} else if (isYesterday(chatDate)) {
			groups.yesterday.push(chatOnly);
		} else if (isAfter(chatDate, sevenDaysAgo)) {
			groups.last7Days.push(chatOnly);
		} else if (isAfter(chatDate, thirtyDaysAgo)) {
			groups.last30Days.push(chatOnly);
		} else {
			groups.older.push(chatOnly);
		}
	}

	return groups;
}

export type ChatGroups = Awaited<ReturnType<typeof groupChatsByDate>>;

interface CreateChatParams {
	userId: string;
	messageContent: string;
	model: string;
	isSearchEnabled: boolean;
	files: File[];
	temporaryId?: string; // AI SDK temporary ID
}

export async function createChat({
	userId,
	messageContent,
	model,
	isSearchEnabled,
	files,
	temporaryId,
}: CreateChatParams) {
	// Get user's system prompt
	const userData = await db.query.user.findFirst({
		where: eq(user.id, userId),
		columns: {
			defaultSystemPrompt: true,
		},
	});

	// The transaction is now much faster as it only deals with creating
	// the chat and message records in the database.
	const { newChatId, userMessageId } = await db.transaction(async (tx) => {
		// Create the new chat
		const [newChat] = await tx
			.insert(chatTable)
			.values({
				userId: userId,
				title: 'Nuevo chat',
			})
			.returning({ id: chatTable.id });

		const messagesToInsert: NewMessage[] = [];

		// Add system prompt as first message if it exists
		if (userData?.defaultSystemPrompt?.trim()) {
			messagesToInsert.push({
				chatId: newChat.id,
				role: 'system',
				content: userData.defaultSystemPrompt,
				model: model,
			});
		}

		// Add the user message
		messagesToInsert.push({
			chatId: newChat.id,
			temporaryId: temporaryId,
			role: 'user',
			content: messageContent,
			model: model,
			hasWebSearch: isSearchEnabled,
			hasAttachments: files.length > 0,
		});

		// Insert all messages
		const insertedMessages = await tx
			.insert(message)
			.values(messagesToInsert)
			.returning({ id: message.id, role: message.role });

		// Find the user message ID (not the system message)
		const userMessage = insertedMessages.find((msg) => msg.role === 'user');

		if (!userMessage?.id) {
			// This will cause the transaction to roll back.
			throw new Error('Failed to create user message.');
		}

		return { newChatId: newChat.id, userMessageId: userMessage.id };
	});

	// If there are files, process them in the background.
	// We do not `await` this call, allowing the request to complete immediately.
	if (files && files.length > 0) {
		void processAttachments(newChatId, userMessageId, userId, files);
	}

	return newChatId;
}

interface AddMessageToChatParams {
	chatId: string;
	userId: string;
	messageContent: string;
	model: string;
	isSearchEnabled: boolean;
	files: File[];
	temporaryId?: string; // AI SDK temporary ID
}

export async function addMessageToChat({
	chatId,
	userId,
	messageContent,
	model,
	isSearchEnabled,
	files,
	temporaryId,
}: AddMessageToChatParams) {
	// Insert the user message and update chat timestamp in a transaction
	const newMessageId = await db.transaction(async (tx) => {
		// Insert the user message
		const [newMessage] = await tx
			.insert(message)
			.values({
				chatId: chatId,
				temporaryId: temporaryId,
				role: 'user',
				content: messageContent,
				model: model,
				hasWebSearch: isSearchEnabled,
				hasAttachments: files.length > 0,
			})
			.returning({ id: message.id });

		// Update chat's updatedAt timestamp
		await tx.update(chatTable).set({ updatedAt: new Date() }).where(eq(chatTable.id, chatId));

		return newMessage.id;
	});

	// If there are files, process them in the background (fire-and-forget)
	if (files && files.length > 0) {
		void processAttachments(chatId, newMessageId, userId, files);
	}

	return newMessageId;
}

/**
 * Update chat title by id for a user
 */
export async function updateChatTitle(chatId: string, userId: string, title: string) {
	// Verify the chat exists and belongs to the user
	const chatExists = await db.query.chat.findFirst({
		where: and(eq(chatTable.id, chatId), eq(chatTable.userId, userId)),
		columns: { id: true },
	});

	if (!chatExists) {
		error(404, 'Chat no encontrado');
	}

	// Update the chat title
	const [updatedChat] = await db
		.update(chatTable)
		.set({
			title: title,
			updatedAt: new Date(),
		})
		.where(and(eq(chatTable.id, chatId), eq(chatTable.userId, userId)))
		.returning({ id: chatTable.id, title: chatTable.title });

	return updatedChat;
}

/**
 * Delete a chat by id for a user
 */
export async function deleteChat(chatId: string, userId: string) {
	// Verify the chat exists and belongs to the user
	const chatExists = await db.query.chat.findFirst({
		where: and(eq(chatTable.id, chatId), eq(chatTable.userId, userId)),
		columns: { id: true },
	});

	if (!chatExists) {
		error(404, 'Chat no encontrado');
	}

	// Delete the chat (cascade will handle messages and attachments)
	await db.delete(chatTable).where(and(eq(chatTable.id, chatId), eq(chatTable.userId, userId)));

	return { success: true };
}
