import type { AnthropicProviderOptions } from '@ai-sdk/anthropic';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { error, json } from '@sveltejs/kit';
import { createOpenAI } from '@ai-sdk/openai';
import { createIdGenerator, streamText } from 'ai';
import { z } from 'zod';

import type { RequestHandler } from './$types';
import type { AiRequest } from '$lib/server/ai/messages';
import { AI_MODELS, detectImageGenerationRequest } from '$lib/ai/models';
import { m } from '$lib/paraglide/messages.js';
import { checkLocalModelAvailability } from '$lib/server/ai/local-models';
import {
	aiRequestSchema,
	createAIModelInstance,
	saveUserMessageIfNeeded,
	transformMessagesWithAttachments,
} from '$lib/server/ai/messages';
import { requireLogin } from '$lib/server/auth';
import { processGeneratedFiles } from '$lib/server/data/attachments';
import { deleteChat } from '$lib/server/data/chats';
import { saveMessage } from '$lib/server/data/messages';

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
					error: m.api_error_invalid_request_data(),
					details: error.issues.map((issue) => ({
						path: issue.path.join('.'),
						message: issue.message,
					})),
				},
				{ status: 400 }
			);
		}
		return json({ error: m.api_error_invalid_json() }, { status: 400 });
	}

	const { id, messages, model: modelKey, isSearchEnabled } = body;

	try {
		// Save the last user message to the database before calling AI (only if not already saved)
		await saveUserMessageIfNeeded(messages, id, sessionUser.id, modelKey, isSearchEnabled);

		// Create the appropriate AI model instance
		const aiModel = await createAIModelInstance(modelKey, sessionUser.id, isSearchEnabled);

		const transformedMessages = await transformMessagesWithAttachments(messages);

		// Get model configuration or check if it's a local model
		const modelConfig = AI_MODELS.find((model) => model.key === modelKey);

		if (!modelConfig) {
			// Check if it's a valid local model
			const localModelInfo = await checkLocalModelAvailability(modelKey, sessionUser.id);
			if (!localModelInfo?.available) {
				throw new Error(m.api_error_invalid_model());
			}
		}

		const needsOpenAISearch = isSearchEnabled && modelConfig?.provider === 'openai';
		const supportsImageGeneration =
			modelConfig?.capabilities.some((cap) => cap === 'image') || false;
		const supportsThinking = modelConfig?.capabilities.some((cap) => cap === 'thinking') || false;

		// Check if user is requesting image generation
		const lastUserMessage = messages.findLast((msg) => msg.role === 'user');
		const userWantsImageGeneration = lastUserMessage
			? detectImageGenerationRequest(lastUserMessage.content)
			: false;
		const shouldGenerateImage = supportsImageGeneration && userWantsImageGeneration;

		// Get OpenAI tools if search is enabled for OpenAI models
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
			messages: shouldGenerateImage
				? transformedMessages.filter((msg) => msg.role !== 'system')
				: transformedMessages,
			experimental_generateMessageId: createIdGenerator({
				prefix: 'msg',
				size: 16,
			}),
			providerOptions: {
				// Add Google image generation support only if user requests it (only for non-local models)
				...(modelConfig?.provider === 'google' && {
					google: {
						...(supportsThinking && {
							thinkingConfig: {
								includeThoughts: true,
								thinkingBudget: 2048,
							},
						}),
						responseModalities: shouldGenerateImage ? ['TEXT', 'IMAGE'] : ['TEXT'],
					} satisfies GoogleGenerativeAIProviderOptions,
				}),
				...(modelConfig?.provider === 'openai' && {
					openai: {
						...(supportsThinking && {
							reasoningEffort: 'low',
						}),
					} satisfies OpenAIResponsesProviderOptions,
				}),
				...(modelConfig?.provider === 'anthropic' && {
					anthropic: {
						...(supportsThinking && {
							thinking: { type: 'enabled', budgetTokens: 2048 },
						}),
					} satisfies AnthropicProviderOptions,
				}),
			},
			// Add OpenAI search tools
			...(openAISearchTools && {
				tools: openAISearchTools,
				toolChoice: { type: 'tool', toolName: 'web_search_preview' },
			}),
			onError: (error) => {
				console.error('AI request error:', error);
			},
			async onFinish({ text, files, reasoning, sources }) {
				const savedMessage = await saveMessage({
					chatId: id,
					role: 'assistant',
					content: text,
					model: modelKey,
					reasoning: reasoning || null,
					sources:
						sources
							?.filter((source) => source.sourceType === 'url')
							.map((source) => ({
								title: source.title || '',
								url: source.url || '',
							})) || null,
				});

				// Process and save generated files as attachments
				if (files && files.length > 0 && savedMessage) {
					await processGeneratedFiles(files, id, savedMessage.id, sessionUser.id);
				}
			},
		});

		result.consumeStream();

		return result.toDataStreamResponse({
			sendReasoning: true,
			sendSources: true,
		});
	} catch (error) {
		console.error('AI request error:', error);
		return json(
			{
				error: error instanceof Error ? error.message : m.api_error_internal_server(),
			},
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const sessionUser = requireLogin();
		const chatId = params.chatId;

		if (!chatId) {
			return error(400, m.api_error_chat_id_required());
		}

		await deleteChat(chatId, sessionUser.id);

		return json({ success: true });
	} catch (e) {
		console.error('Error deleting chat:', e);
		return error(500, m.api_error_deleting_chat());
	}
};
