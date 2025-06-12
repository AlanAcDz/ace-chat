import { error, json, redirect } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { requireLogin } from '$lib/server/auth';
import { createChat, getUserChats, groupChatsByDate } from '$lib/server/data/chats';

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

export const POST: RequestHandler = async ({ request }) => {
	let newChatId: string;
	try {
		const sessionUser = requireLogin();
		const formData = await request.formData();

		const messageContent = formData.get('message') as string;
		const model = formData.get('model') as string;
		const isSearchEnabled = formData.get('isSearchEnabled') === 'true';
		const files = formData.getAll('files') as File[];

		if (!messageContent?.trim()) {
			return error(400, 'El mensaje no puede estar vacío');
		}

		newChatId = await createChat({
			userId: sessionUser.id,
			messageContent,
			model,
			isSearchEnabled,
			files,
		});
	} catch (e) {
		console.error('Error creating chat:', e);
		return error(500, 'Error al crear el chat');
	}

	// Redirect to the new chat page
	redirect(302, `/chats/${newChatId}`);
};
