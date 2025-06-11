import { isAfter, isToday, isYesterday, startOfDay, subDays } from 'date-fns';
import { and, desc, eq, ilike } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { chat as chatTable } from '$lib/server/db/schema';

/**
 * Get all chat threads for a user (only id and title)
 * Optionally filter by title search
 */
export async function getUserChats(userId: string, searchQuery?: string) {
	const conditions = [eq(chatTable.userId, userId)];

	// Add search condition if provided
	if (searchQuery && searchQuery.trim()) {
		conditions.push(ilike(chatTable.title, `%${searchQuery.trim()}%`));
	}

	const chats = await db
		.select({
			id: chatTable.id,
			title: chatTable.title,
			updatedAt: chatTable.updatedAt,
		})
		.from(chatTable)
		.where(and(...conditions))
		.orderBy(desc(chatTable.updatedAt));

	return chats;
}

/**
 * Group chats by date ranges using date-fns
 */
export function groupChatsByDate(chats: Awaited<ReturnType<typeof getUserChats>>) {
	const now = new Date();
	const sevenDaysAgo = startOfDay(subDays(now, 7));
	const thirtyDaysAgo = startOfDay(subDays(now, 30));

	const groups = {
		today: [] as Array<{ id: string; title: string }>,
		yesterday: [] as Array<{ id: string; title: string }>,
		last7Days: [] as Array<{ id: string; title: string }>,
		last30Days: [] as Array<{ id: string; title: string }>,
		older: [] as Array<{ id: string; title: string }>,
	};

	for (const chat of chats) {
		const chatDate = new Date(chat.updatedAt);
		const chatOnly = { id: chat.id, title: chat.title };

		if (isToday(chatDate)) {
			groups.today.push(chatOnly);
		} else if (isYesterday(chatDate)) {
			groups.yesterday.push(chatOnly);
		} else if (isAfter(chatDate, sevenDaysAgo)) {
			groups.last7Days.push(chatOnly);
		} else if (isAfter(chatDate, thirtyDaysAgo)) {
			groups.last30Days.push(chatOnly);
		} else {
			groups.older.push(chatOnly);
		}
	}

	return groups;
}

export type ChatGroups = Awaited<ReturnType<typeof groupChatsByDate>>;
