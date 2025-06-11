import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { requireLogin } from '$lib/server/auth';
import { getUserChats, groupChatsByDate } from '$lib/server/data/chats';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const sessionUser = requireLogin();
		const searchQuery = url.searchParams.get('search');
		const chats = await getUserChats(sessionUser.id, searchQuery ?? undefined);
		const groupedChats = groupChatsByDate(chats);
		return json(groupedChats);
	} catch (e) {
		console.error('Error fetching chats:', e);
		return error(500, 'Error al cargar los chats');
	}
};
