import { asc, eq } from 'drizzle-orm';

import type { NewMessage } from '../db/schema';
import { db } from '../db';
import { message } from '../db/schema';

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
	const [savedMessage] = await db.insert(message).values(newMessage).returning();
	return savedMessage;
}
