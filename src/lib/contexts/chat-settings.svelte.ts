import { getContext, setContext } from 'svelte';

import type { AIModel } from '$lib/ai/models';
import { AI_MODELS } from '$lib/ai/models';

interface ChatSettings {
	selectedModel: AIModel['key'];
	isSearchEnabled: boolean;
}

class ChatSettingsContext {
	selectedModel = $state<AIModel['key']>(AI_MODELS[0].key);
	isSearchEnabled = $state<boolean>(false);

	constructor() {
		// Load from localStorage if available
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('chat-settings');
			if (saved) {
				try {
					const parsed = JSON.parse(saved) as ChatSettings;
					this.selectedModel = parsed.selectedModel || AI_MODELS[0].key;
					this.isSearchEnabled = parsed.isSearchEnabled || false;
				} catch {
					// Ignore parsing errors, use defaults
				}
			}

			// Save to localStorage whenever settings change
			$effect(() => {
				const settings: ChatSettings = {
					selectedModel: this.selectedModel,
					isSearchEnabled: this.isSearchEnabled,
				};
				localStorage.setItem('chat-settings', JSON.stringify(settings));
			});
		}
	}

	setModel = (model: AIModel['key']) => {
		this.selectedModel = model;
	};

	toggleSearch = () => {
		this.isSearchEnabled = !this.isSearchEnabled;
	};

	setSearch = (enabled: boolean) => {
		this.isSearchEnabled = enabled;
	};

	// Reset search after creating a new chat (optional behavior)
	resetSearchAfterChat = () => {
		this.isSearchEnabled = false;
	};
}

const CHAT_SETTINGS_KEY = 'chat-settings';

export function setChatSettingsContext() {
	const context = new ChatSettingsContext();
	setContext(CHAT_SETTINGS_KEY, context);
	return context;
}

export function getChatSettingsContext(): ChatSettingsContext {
	const context = getContext<ChatSettingsContext>(CHAT_SETTINGS_KEY);
	if (!context) {
		throw new Error(
			'ChatSettingsContext not found. Make sure to call setChatSettingsContext() in a parent component.'
		);
	}
	return context;
}
