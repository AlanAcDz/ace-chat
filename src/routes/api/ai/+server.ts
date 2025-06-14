import { json } from '@sveltejs/kit';
import { createOpenAI } from '@ai-sdk/openai';
import { createIdGenerator, streamText } from 'ai';
import { z } from 'zod';

import type { RequestHandler } from './$types';
import { AI_MODELS } from '$lib/ai/models';
import {
	createAIModelInstance,
	saveUserMessageIfNeeded,
	transformMessagesWithAttachments,
} from '$lib/server/ai/messages';
import { requireLogin } from '$lib/server/auth';
import { saveMessage } from '$lib/server/data/messages';

// Zod schema for request validation
const aiRequestSchema = z.object({
	id: z.string().min(1, 'Chat ID is required'),
	messages: z
		.array(
			z.object({
				id: z.string().optional(),
				chatId: z.string().optional(),
				parentId: z.string().nullable().optional(),
				role: z.enum(['system', 'user', 'assistant']),
				content: z.string(),
				model: z.string().optional(),
				isStreaming: z.boolean().optional(),
				hasWebSearch: z.boolean().optional(),
				createdAt: z.string().optional(),
				attachments: z.array(z.any()).optional(),
				experimental_attachments: z.array(z.any()).optional(),
				parts: z.array(z.any()).optional(),
			})
		)
		.min(1, 'At least one message is required'),
	model: z.string().min(1, 'Model is required'),
	isSearchEnabled: z.boolean().default(false),
});

type AiRequest = z.infer<typeof aiRequestSchema>;

export const POST: RequestHandler = async ({ request }) => {
	const sessionUser = requireLogin();

	// Parse and validate request body
	let body: AiRequest;
	try {
		const rawBody = await request.json();
		body = aiRequestSchema.parse(rawBody);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return json(
				{
					error: 'Invalid request data',
					details: error.issues.map((issue) => ({
						path: issue.path.join('.'),
						message: issue.message,
					})),
				},
				{ status: 400 }
			);
		}
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const { id, messages, model: modelKey, isSearchEnabled } = body;

	try {
		// Save the last user message to the database before calling AI (only if not already saved)
		await saveUserMessageIfNeeded(messages, id, sessionUser.id, modelKey, isSearchEnabled);

		// Create the appropriate AI model instance
		const aiModel = await createAIModelInstance(modelKey, sessionUser.id, isSearchEnabled);

		const transformedMessages = await transformMessagesWithAttachments(messages);

		// Get OpenAI tools if search is enabled for OpenAI models
		const modelConfig = AI_MODELS.find((m) => m.key === modelKey);
		const needsOpenAISearch = isSearchEnabled && modelConfig?.provider === 'openai';

		let openAISearchTools = null;
		if (needsOpenAISearch) {
			const { getUserApiKey } = await import('$lib/server/data/api-keys');
			const userApiKey = await getUserApiKey(sessionUser.id, 'openai');

			if (userApiKey?.encryptedKey) {
				const openai = createOpenAI({
					apiKey: userApiKey.encryptedKey,
				});
				openAISearchTools = {
					web_search_preview: openai.tools.webSearchPreview({
						searchContextSize: 'high',
					}),
				};
			}
		}

		const result = streamText({
			model: aiModel,
			messages: transformedMessages,
			experimental_generateMessageId: createIdGenerator({
				prefix: 'msg',
				size: 16,
			}),
			...(openAISearchTools && {
				tools: openAISearchTools,
				toolChoice: { type: 'tool', toolName: 'web_search_preview' },
			}),
			async onFinish({ text }) {
				await saveMessage({
					chatId: id,
					role: 'assistant',
					content: text,
					model: modelKey,
				});
			},
		});

		result.consumeStream();

		return result.toDataStreamResponse();
	} catch (error) {
		console.error('AI request error:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			{ status: 500 }
		);
	}
};
