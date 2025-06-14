import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { requireLogin } from '$lib/server/auth';
import { getChatShareStatus } from '$lib/server/data/chats';

export const GET: RequestHandler = async ({ params }) => {
	const sessionUser = requireLogin();
	const chatId = params.chatId;

	try {
		const shareStatus = await getChatShareStatus(chatId, sessionUser.id);
		return json(shareStatus);
	} catch (err) {
		console.error('Error getting share status:', err);
		return json({ error: 'Chat no encontrado' }, { status: 404 });
	}
};
