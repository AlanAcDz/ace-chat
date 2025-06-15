import { asc, eq } from 'drizzle-orm';

import type { NewMessage } from '../db/schema';
import { db } from '../db';
import { chat, message } from '../db/schema';

export async function getMessages(chatId: string) {
	return db.query.message.findMany({
		where: eq(message.chatId, chatId),
		orderBy: [asc(message.createdAt)],
		// The AI SDK needs role and content. Our schema matches this.
		columns: {
			role: true,
			content: true,
		},
	});
}

export async function saveMessage(newMessage: NewMessage) {
	// Use a transaction to save the message and update the chat timestamp
	const result = await db.transaction(async (tx) => {
		// Save the message
		const [savedMessage] = await tx.insert(message).values(newMessage).returning();

		// Update chat's updatedAt timestamp
		if (newMessage.chatId) {
			await tx.update(chat).set({ updatedAt: new Date() }).where(eq(chat.id, newMessage.chatId));
		}

		return savedMessage;
	});

	return result;
}
