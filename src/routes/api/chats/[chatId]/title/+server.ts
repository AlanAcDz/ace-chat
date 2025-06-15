import { error, json } from '@sveltejs/kit';
import { generateText } from 'ai';
import { and, asc, eq } from 'drizzle-orm';

import { AI_MODELS } from '$lib/ai/models';
import { m } from '$lib/paraglide/messages.js';
import { createAIModelInstance } from '$lib/server/ai/messages';
import { requireLogin } from '$lib/server/auth';
import { updateChatTitle } from '$lib/server/data/chats';
import { db } from '$lib/server/db';
import { chat, message } from '$lib/server/db/schema';

export async function POST({ params }: { params: { chatId: string } }) {
	try {
		const sessionUser = requireLogin();
		const chatId = params.chatId;

		if (!chatId) {
			return error(400, m.api_error_chat_id_required());
		}

		// Get the chat and its first user message
		const chatData = await db.query.chat.findFirst({
			where: and(eq(chat.id, chatId), eq(chat.userId, sessionUser.id)),
			with: {
				messages: {
					where: and(eq(message.role, 'user')),
					orderBy: [asc(message.createdAt)],
					limit: 1,
				},
			},
		});

		if (!chatData) {
			return error(404, m.api_error_chat_not_found());
		}

		if (!chatData.messages || chatData.messages.length === 0) {
			return error(400, m.api_error_no_user_message());
		}

		const firstUserMessage = chatData.messages[0];

		// Use a cheap model for title generation (prefer Gemini Flash or GPT-4o Mini)
		const titleModel =
			AI_MODELS.find((m) => m.key === 'gemini-2.0-flash-exp') ||
			AI_MODELS.find((m) => m.key === 'gpt-4o-mini') ||
			AI_MODELS[0];

		// Create AI model instance
		const aiModel = await createAIModelInstance(titleModel.key, sessionUser.id, false);

		// Generate title using AI
		const { text: generatedTitle } = await generateText({
			model: aiModel,
			messages: [
				{
					role: 'system',
					content: m.api_title_generation_prompt(),
				},
				{
					role: 'user',
					content: firstUserMessage.content,
				},
			],
			maxTokens: 50,
			temperature: 0.3,
		});

		// Clean and limit the title
		const cleanTitle = generatedTitle
			.trim()
			.replace(/^["']|["']$/g, '') // Remove quotes
			.replace(/[.!?]+$/, '') // Remove ending punctuation
			.substring(0, 100); // Limit length

		// Update the chat title in the database
		const updatedChat = await updateChatTitle(chatId, sessionUser.id, cleanTitle);

		return json({
			success: true,
			title: updatedChat.title,
		});
	} catch (e) {
		console.error('Error generating chat title:', e);
		return error(500, m.api_error_generating_title());
	}
}
