import type { ChatGroups } from '$lib/server/data/chats';

export async function load({ parent, fetch, data }) {
	const { queryClient } = await parent();

	await queryClient.prefetchQuery({
		queryKey: ['chats', ''],
		queryFn: async () => {
			const response = await fetch('/api/chats');
			if (!response.ok) {
				throw new Error('Error al cargar los chats');
			}

			return response.json() as Promise<ChatGroups>;
		},
	});

	return data;
}
