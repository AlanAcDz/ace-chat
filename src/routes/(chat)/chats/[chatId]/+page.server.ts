import type { PageServerLoad } from './$types';
import { requireLogin } from '$lib/server/auth';
import { getUserChat } from '$lib/server/data/chats';

export const load: PageServerLoad = async ({ params, depends, url }) => {
	const sessionUser = requireLogin();
	const chatId = params.chatId;

	const chatData = await getUserChat(chatId, sessionUser.id);

	depends('app:chat');

	let isNewChat = false;
	const isNewUrl = url.searchParams.get('new') === 'true';
	const messages = chatData?.messages ?? [];
	const lastMessage = messages[messages.length - 1];

	if (isNewUrl && messages.length > 0 && messages.length <= 2 && lastMessage?.role === 'user') {
		isNewChat = true;
	}

	return {
		chat: chatData,
		isNewChat,
	};
};
