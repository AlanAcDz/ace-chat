import type { PageServerLoad } from './$types';
import { requireLogin } from '$lib/server/auth';
import { getUserChat } from '$lib/server/data/chats';

export const load: PageServerLoad = async ({ params, depends }) => {
	const sessionUser = requireLogin();
	const chatId = params.chatId;

	const chatData = await getUserChat(chatId, sessionUser.id);

	depends('app:chat');

	return {
		chat: chatData,
	};
};
