import type { PageServerLoad } from './$types';
import { getSharedChat } from '$lib/server/data/chats';

export const load: PageServerLoad = async ({ params }) => {
	const sharePath = params.sharePath;
	const sharedChatData = await getSharedChat(sharePath);

	return {
		sharedChat: sharedChatData,
	};
};
