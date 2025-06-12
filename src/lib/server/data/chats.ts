import { isAfter, isToday, isYesterday, startOfDay, subDays } from 'date-fns';
import { and, desc, eq, ilike } from 'drizzle-orm';

import type { NewAttachment, NewMessage } from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { attachment, chat as chatTable, message, user } from '$lib/server/db/schema';
import { saveFile } from '$lib/server/storage';

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
}

export async function createChat({
	userId,
	messageContent,
	model,
	isSearchEnabled,
	files,
}: CreateChatParams) {
	// Get user's system prompt
	const userData = await db.query.user.findFirst({
		where: eq(user.id, userId),
		columns: {
			defaultSystemPrompt: true,
		},
	});

	const newChatId = await db.transaction(async (tx) => {
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
			role: 'user',
			content: messageContent,
			model: model,
			hasWebSearch: isSearchEnabled,
		});

		// Insert all messages
		const insertedMessages = await tx
			.insert(message)
			.values(messagesToInsert)
			.returning({ id: message.id, role: message.role });

		// Handle file attachments if any
		if (files && files.length > 0) {
			// Find the user message ID (not the system message)
			const userMessageId = insertedMessages.find((msg) => msg.role === 'user')?.id;

			if (userMessageId) {
				const attachmentsToInsert: NewAttachment[] = [];

				// Save files and prepare attachment records
				for (const file of files) {
					try {
						const relativePath = await saveFile(file, userId, newChat.id);
						attachmentsToInsert.push({
							messageId: userMessageId,
							userId: userId,
							fileName: file.name,
							fileType: file.type,
							fileSize: file.size,
							filePath: relativePath,
						});
					} catch (fileError) {
						console.error('Error saving file:', file.name, fileError);
						// Continue with other files, don't fail the entire operation
					}
				}

				if (attachmentsToInsert.length > 0) {
					await tx.insert(attachment).values(attachmentsToInsert);
				}
			}
		}

		return newChat.id;
	});

	return newChatId;
}
