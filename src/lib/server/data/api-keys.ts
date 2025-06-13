import { and, eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { apiKey } from '$lib/server/db/schema';
import { createId } from '$lib/server/utils';

export interface SaveApiKeyData {
	userId: string;
	provider: string;
	apiKey: string;
}

export interface SaveApiUrlData {
	userId: string;
	provider: string;
	apiUrl: string;
}

export interface ApiKeyResult {
	id: string;
	provider: string;
	encryptedKey?: string | null;
	url?: string | null;
	scope: string;
	createdAt: Date;
	hasApiKey?: boolean; // Indicates if there's an API key without revealing the value
}

/**
 * Get all API keys for a user
 */
export async function getUserApiKeys(userId: string): Promise<Record<string, ApiKeyResult>> {
	const userApiKeys = await db.select().from(apiKey).where(eq(apiKey.userId, userId));

	// Group by provider for easy access
	const apiKeysByProvider: Record<string, ApiKeyResult> = {};

	for (const key of userApiKeys) {
		if (key.encryptedKey) {
			// For API keys, don't return the actual key value to avoid accidental overwrites
			apiKeysByProvider[key.provider] = {
				...key,
				encryptedKey: null, // Don't send the actual key to the client
				hasApiKey: true, // Flag to indicate a key exists
			};
		} else {
			// For URLs (like LM Studio, Ollama), we can safely show them
			apiKeysByProvider[key.provider] = {
				...key,
				hasApiKey: false,
			};
		}
	}

	return apiKeysByProvider;
}

/**
 * Get API key by user and provider
 */
export async function getApiKeyByProvider(userId: string, provider: string) {
	return await db.query.apiKey.findFirst({
		where: and(eq(apiKey.userId, userId), eq(apiKey.provider, provider)),
	});
}

/**
 * Save or update API key for a provider
 */
export async function saveApiKey(data: SaveApiKeyData) {
	const { userId, provider, apiKey: apiKeyValue } = data;

	// Validate provider
	const validProviders = ['openai', 'anthropic', 'google'];
	if (!validProviders.includes(provider)) {
		throw new Error('Proveedor inválido');
	}

	// Don't allow empty API keys
	if (!apiKeyValue.trim()) {
		throw new Error('La clave API no puede estar vacía');
	}

	// For now, store the API key directly (in production, should be encrypted)
	const encryptedKey = apiKeyValue;

	// Check if user already has an API key for this provider
	const existingKey = await getApiKeyByProvider(userId, provider);

	if (existingKey) {
		// Update existing key
		const [updatedKey] = await db
			.update(apiKey)
			.set({
				encryptedKey: encryptedKey,
			})
			.where(eq(apiKey.id, existingKey.id))
			.returning();

		return updatedKey;
	} else {
		// Create new key
		const [newKey] = await db
			.insert(apiKey)
			.values({
				id: createId('key'),
				userId,
				provider,
				encryptedKey: encryptedKey,
				scope: 'personal',
			})
			.returning();

		return newKey;
	}
}

/**
 * Save or update API URL for a provider
 */
export async function saveApiUrl(data: SaveApiUrlData) {
	const { userId, provider, apiUrl } = data;

	// Validate provider
	const validProviders = ['lmstudio', 'ollama'];
	if (!validProviders.includes(provider)) {
		throw new Error('Proveedor inválido');
	}

	// Validate URL format
	try {
		new URL(apiUrl);
	} catch {
		throw new Error('Formato de URL inválido');
	}

	// Check if user already has an API URL for this provider
	const existingKey = await getApiKeyByProvider(userId, provider);

	if (existingKey) {
		// Update existing URL
		const [updatedKey] = await db
			.update(apiKey)
			.set({
				url: apiUrl,
			})
			.where(eq(apiKey.id, existingKey.id))
			.returning();

		return updatedKey;
	} else {
		// Create new entry
		const [newKey] = await db
			.insert(apiKey)
			.values({
				id: createId('key'),
				userId,
				provider,
				url: apiUrl,
				scope: 'personal',
			})
			.returning();

		return newKey;
	}
}

/**
 * Delete API key by provider
 */
export async function deleteApiKey(userId: string, provider: string) {
	const [deletedKey] = await db
		.delete(apiKey)
		.where(and(eq(apiKey.userId, userId), eq(apiKey.provider, provider)))
		.returning();

	if (!deletedKey) {
		throw new Error('Clave API no encontrada');
	}

	return deletedKey;
}
