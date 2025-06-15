import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { m } from '$lib/paraglide/messages.js';
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
		return json({ error: m.api_error_chat_not_found() }, { status: 404 });
	}
};
