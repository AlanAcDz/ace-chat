import { readFile } from 'fs/promises';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOllama } from 'ollama-ai-provider';
import { z } from 'zod';

import type { CoreMessage, LanguageModel } from 'ai';
import { AI_MODELS } from '$lib/ai/models';
import { checkLocalModelAvailability } from '$lib/server/ai/local-models';
import { getUserApiKey } from '$lib/server/data/api-keys';
import { addMessageToChat } from '$lib/server/data/chats';
import { getFullFilePath } from '$lib/server/storage';

// Zod schema for request validation
export const aiRequestSchema = z.object({
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

export type AiRequest = z.infer<typeof aiRequestSchema>;

// Type for message with attachments (matches the Zod schema)
interface MessageWithAttachments {
	id?: string; // AI SDK temporary ID
	role: 'system' | 'user' | 'assistant';
	content: string;
	chatId?: string; // Database messages have this, new messages don't
	attachments?: Array<{
		filePath: string;
		fileName: string;
		fileType: string;
	}>;
	experimental_attachments?: Array<
		| File
		| {
				name: string;
				contentType: string;
				url: string;
		  }
	>;
}

/**
 * Transform messages to include attachment content parts for AI SDK
 */
export async function transformMessagesWithAttachments(
	messages: MessageWithAttachments[]
): Promise<CoreMessage[]> {
	const transformedMessages: CoreMessage[] = [];

	for (const message of messages) {
		const hasExperimentalAttachments =
			message.experimental_attachments && message.experimental_attachments.length > 0;
		const hasSavedAttachments = message.attachments && message.attachments.length > 0;

		if (hasExperimentalAttachments || hasSavedAttachments) {
			// Transform message with attachments to content parts
			const contentParts: Array<
				| { type: 'text'; text: string }
				| { type: 'image'; image: Buffer }
				| { type: 'file'; mimeType: string; data: Buffer; filename: string }
			> = [
				{
					type: 'text',
					text: message.content,
				},
			];

			// Handle experimental_attachments (new File objects from client)
			if (hasExperimentalAttachments) {
				for (const file of message.experimental_attachments!) {
					try {
						if (file instanceof File) {
							const fileBuffer = Buffer.from(await file.arrayBuffer());

							// Determine if it's an image or file based on MIME type
							if (file.type.startsWith('image/')) {
								contentParts.push({
									type: 'image',
									image: fileBuffer,
								});
							} else {
								// Handle as file (PDF, etc.)
								contentParts.push({
									type: 'file',
									mimeType: file.type,
									data: fileBuffer,
									filename: file.name,
								});
							}
						} else if (
							file &&
							typeof file === 'object' &&
							file.name &&
							file.contentType &&
							file.url
						) {
							// Handle AI SDK experimental attachment format: { name, contentType, url }
							const response = await fetch(file.url);
							const arrayBuffer = await response.arrayBuffer();
							const fileBuffer = Buffer.from(arrayBuffer);

							// Determine if it's an image or file based on MIME type
							if (file.contentType.startsWith('image/')) {
								contentParts.push({
									type: 'image',
									image: fileBuffer,
								});
							} else {
								// Handle as file (PDF, etc.)
								contentParts.push({
									type: 'file',
									mimeType: file.contentType,
									data: fileBuffer,
									filename: file.name,
								});
							}
						}
					} catch (error) {
						console.error(`Error processing experimental attachment ${file?.name}:`, error);
						// Continue without this attachment
					}
				}
			}

			// Handle saved attachments (from database)
			if (hasSavedAttachments) {
				for (const attachment of message.attachments!) {
					try {
						const fullPath = getFullFilePath(attachment.filePath);
						const fileBuffer = await readFile(fullPath);

						// Determine if it's an image or file based on MIME type
						if (attachment.fileType.startsWith('image/')) {
							contentParts.push({
								type: 'image',
								image: fileBuffer,
							});
						} else {
							// Handle as file (PDF, etc.)
							contentParts.push({
								type: 'file',
								mimeType: attachment.fileType,
								data: fileBuffer,
								filename: attachment.fileName,
							});
						}
					} catch (error) {
						console.error(`Error reading saved attachment ${attachment.fileName}:`, error);
						// Continue without this attachment
					}
				}
			}

			// Handle different message roles with proper typing
			if (message.role === 'user') {
				transformedMessages.push({
					role: 'user',
					content: contentParts,
				});
			} else if (message.role === 'system') {
				// System messages typically don't have attachments, but just in case
				transformedMessages.push({
					role: 'system',
					content: message.content, // Keep as string for system messages
				});
			} else if (message.role === 'assistant') {
				// Assistant messages typically don't have attachments from user, keep as string
				transformedMessages.push({
					role: 'assistant',
					content: message.content,
				});
			}
		} else {
			// No attachments, keep as simple text message
			if (message.role === 'user') {
				transformedMessages.push({
					role: 'user',
					content: message.content,
				});
			} else if (message.role === 'system') {
				transformedMessages.push({
					role: 'system',
					content: message.content,
				});
			} else if (message.role === 'assistant') {
				transformedMessages.push({
					role: 'assistant',
					content: message.content,
				});
			}
		}
	}

	return transformedMessages;
}

/**
 * Save user message to database if it's a new message (not already saved)
 */
export async function saveUserMessageIfNeeded(
	messages: MessageWithAttachments[],
	chatId: string,
	userId: string,
	modelKey: string,
	isSearchEnabled: boolean
) {
	const lastMessage = messages[messages.length - 1];
	if (lastMessage && lastMessage.role === 'user' && !lastMessage.chatId) {
		// Extract files from experimental_attachments if they exist
		const files: File[] = [];
		if (
			lastMessage.experimental_attachments &&
			Array.isArray(lastMessage.experimental_attachments)
		) {
			for (const attachment of lastMessage.experimental_attachments) {
				if (attachment instanceof File) {
					files.push(attachment);
				} else if (attachment && typeof attachment === 'object') {
					// Handle AI SDK experimental attachment format: { name, contentType, url }
					if (attachment.name && attachment.contentType && attachment.url) {
						try {
							// Convert data URL or blob URL to File
							const response = await fetch(attachment.url);
							const blob = await response.blob();
							const file = new File([blob], attachment.name, { type: attachment.contentType });
							files.push(file);
						} catch (error) {
							console.error('Error converting attachment URL to File:', error);
						}
					}
				}
			}
		}

		await addMessageToChat({
			chatId,
			userId,
			messageContent: lastMessage.content,
			model: modelKey,
			isSearchEnabled,
			files,
			temporaryId: lastMessage.id,
		});
	}
}

/**
 * Create AI model instance based on provider and user API key
 */
export async function createAIModelInstance(
	modelKey: string,
	userId: string,
	isSearchEnabled: boolean = false
): Promise<LanguageModel> {
	// Find the model configuration
	const modelConfig = AI_MODELS.find((m) => m.key === modelKey);
	if (!modelConfig) {
		// Check if it's a local model (LM Studio or Ollama)
		const localModelInfo = await checkLocalModelAvailability(modelKey, userId);
		if (localModelInfo) {
			return createLocalModelInstance({
				provider: localModelInfo.provider,
				modelId: localModelInfo.modelId,
				baseUrl: localModelInfo.baseUrl,
			});
		}
		throw new Error('Invalid model');
	}

	// Get the provider from the model config
	const provider = modelConfig.provider;

	// Try to get the provider-specific API key first
	let userApiKey = await getUserApiKey(userId, provider);

	// If no provider-specific key, try to get OpenRouter key as fallback
	if (!userApiKey) {
		userApiKey = await getUserApiKey(userId, 'openrouter');
		if (userApiKey) {
			// Use OpenRouter for this model
			if (!userApiKey.encryptedKey) {
				throw new Error('OpenRouter API key not found');
			}
			const openrouter = createOpenRouter({
				apiKey: userApiKey.encryptedKey,
			});

			// Map provider to OpenRouter model format
			const openrouterModelKey =
				modelConfig.key === 'gemini-2.0-flash-exp'
					? `${provider}/${modelConfig.key}:free`
					: `${provider}/${modelConfig.key}`;
			return openrouter.chat(openrouterModelKey);
		}
		throw new Error(`API key for ${provider} not found`);
	}

	// Create the appropriate AI model instance based on provider
	if (provider === 'openai') {
		if (!userApiKey.encryptedKey) {
			throw new Error('OpenAI API key not found');
		}
		const openai = createOpenAI({
			apiKey: userApiKey.encryptedKey,
		});

		// For OpenAI models, web search is handled via tools in the streamText call
		// rather than model configuration, so we return the basic model
		return openai(modelConfig.key);
	} else if (provider === 'anthropic') {
		if (!userApiKey.encryptedKey) {
			throw new Error('Anthropic API key not found');
		}
		const anthropic = createAnthropic({
			apiKey: userApiKey.encryptedKey,
		});
		return anthropic(modelConfig.key);
	} else if (provider === 'google') {
		if (!userApiKey.encryptedKey) {
			throw new Error('Google API key not found');
		}
		const google = createGoogleGenerativeAI({
			apiKey: userApiKey.encryptedKey,
		});

		// Configure Google models with search grounding when enabled
		if (isSearchEnabled) {
			return google(modelConfig.key, {
				useSearchGrounding: true,
			});
		}

		return google(modelConfig.key);
	} else {
		throw new Error(`Unsupported provider: ${provider}`);
	}
}

/**
 * Create AI model instance for local providers (LM Studio or Ollama)
 */
function createLocalModelInstance(localModelInfo: {
	provider: 'lmstudio' | 'ollama';
	modelId: string;
	baseUrl: string;
}): LanguageModel {
	if (localModelInfo.provider === 'lmstudio') {
		// Normalize baseUrl - remove /v1 suffix if present, then add it
		const normalizedUrl = localModelInfo.baseUrl.replace(/\/v1\/?$/, '');
		const lmstudio = createOpenAICompatible({
			name: 'lmstudio',
			baseURL: `${normalizedUrl}/v1`,
		});
		return lmstudio(localModelInfo.modelId);
	} else if (localModelInfo.provider === 'ollama') {
		// Normalize baseUrl - remove /api suffix if present (Ollama uses base URL directly)
		const normalizedUrl = localModelInfo.baseUrl.replace(/\/api\/?$/, '');
		const ollama = createOllama({
			baseURL: normalizedUrl,
		});
		return ollama(localModelInfo.modelId);
	} else {
		throw new Error(`Unsupported local provider: ${localModelInfo.provider}`);
	}
}
