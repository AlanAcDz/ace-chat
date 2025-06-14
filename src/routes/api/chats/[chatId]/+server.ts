import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { requireLogin } from '$lib/server/auth';
import { deleteChat } from '$lib/server/data/chats';

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const sessionUser = requireLogin();
		const chatId = params.chatId;

		if (!chatId) {
			return error(400, 'ID de chat requerido');
		}

		await deleteChat(chatId, sessionUser.id);

		return json({ success: true });
	} catch (e) {
		console.error('Error deleting chat:', e);
		return error(500, 'Error al eliminar el chat');
	}
};
