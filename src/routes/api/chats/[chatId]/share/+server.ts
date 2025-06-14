import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import type { RequestHandler } from './$types';
import { requireLogin } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { chat } from '$lib/server/db/schema';

export const POST: RequestHandler = async ({ params }) => {
	const sessionUser = requireLogin();
	const chatId = params.chatId;

	// Verify the chat exists and belongs to the user
	const chatData = await db.query.chat.findFirst({
		where: and(eq(chat.id, chatId), eq(chat.userId, sessionUser.id)),
		columns: { id: true, sharePath: true },
	});

	if (!chatData) {
		return json({ error: 'Chat no encontrado' }, { status: 404 });
	}

	// If chat already has a sharePath, return it
	if (chatData.sharePath) {
		return json({
			sharePath: chatData.sharePath,
			shareUrl: `/share/${chatData.sharePath}`,
		});
	}

	// Generate a new unique sharePath
	let sharePath: string;
	let attempts = 0;
	const maxAttempts = 10;

	do {
		sharePath = nanoid(12); // Generate a 12-character ID
		attempts++;

		// Check if this sharePath already exists
		const existingShare = await db.query.chat.findFirst({
			where: eq(chat.sharePath, sharePath),
			columns: { id: true },
		});

		if (!existingShare) {
			break;
		}

		if (attempts >= maxAttempts) {
			return json({ error: 'Error al generar enlace único' }, { status: 500 });
		}
	} while (attempts < maxAttempts);

	// Update the chat with the new sharePath
	await db
		.update(chat)
		.set({ sharePath, updatedAt: new Date() })
		.where(and(eq(chat.id, chatId), eq(chat.userId, sessionUser.id)));

	return json({
		sharePath,
		shareUrl: `/share/${sharePath}`,
	});
};

export const DELETE: RequestHandler = async ({ params }) => {
	const sessionUser = requireLogin();
	const chatId = params.chatId;

	// Verify the chat exists and belongs to the user
	const chatData = await db.query.chat.findFirst({
		where: and(eq(chat.id, chatId), eq(chat.userId, sessionUser.id)),
		columns: { id: true },
	});

	if (!chatData) {
		return json({ error: 'Chat no encontrado' }, { status: 404 });
	}

	// Remove the sharePath
	await db
		.update(chat)
		.set({ sharePath: null, updatedAt: new Date() })
		.where(and(eq(chat.id, chatId), eq(chat.userId, sessionUser.id)));

	return json({ success: true });
};
