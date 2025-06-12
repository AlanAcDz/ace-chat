import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';

import type { RequestHandler } from './$types';
import { requireLogin } from '$lib/server/auth';
import { addMessageToChat } from '$lib/server/data/chats';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const sessionUser = requireLogin();
		const chatId = params.chatId;
		const formData = await request.formData();

		const messageContent = formData.get('message') as string;
		const model = formData.get('model') as string;
		const isSearchEnabled = formData.get('isSearchEnabled') === 'true';
		const files = formData.getAll('files') as File[];

		if (!messageContent?.trim()) {
			return error(400, 'El mensaje no puede estar vacío');
		}

		// Verify the chat exists and belongs to the user
		const chatExists = await db.query.chat.findFirst({
			where: and(eq(schema.chat.id, chatId), eq(schema.chat.userId, sessionUser.id)),
			columns: { id: true },
		});

		if (!chatExists) {
			return error(404, 'Chat no encontrado');
		}

		const newMessageId = await addMessageToChat({
			chatId,
			userId: sessionUser.id,
			messageContent,
			model,
			isSearchEnabled,
			files,
		});

		return json({ messageId: newMessageId });
	} catch (e) {
		console.error('Error adding message:', e);
		return error(500, 'Error al enviar el mensaje');
	}
};
