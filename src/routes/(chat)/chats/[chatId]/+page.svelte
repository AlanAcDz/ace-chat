<script lang="ts">
	import { onMount } from 'svelte';
	import { Chat } from '@ai-sdk/svelte';
	import { AlertCircleIcon, RefreshCcw } from '@lucide/svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { createIdGenerator } from 'ai';
	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';
	import type { UIMessage } from 'ai';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import AssistantMessage from '$lib/components/chats/assistant-message.svelte';
	import MessageInput from '$lib/components/chats/message-input.svelte';
	import UserMessage from '$lib/components/chats/user-message.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { getChatSettingsContext } from '$lib/contexts/chat-settings.svelte';
	import { m } from '$lib/paraglide/messages.js';

	// Extended type for messages that might have hasAttachments from database
	type ExtendedUIMessage = UIMessage & { hasAttachments?: boolean };

	let { data }: { data: PageData } = $props();
	let messagesContainer: HTMLElement;

	// Get chat settings from context
	const chatSettings = getChatSettingsContext();

	let isAutoScrolling = $state(false);
	let scrollInterval: ReturnType<typeof setInterval> | null = $state(null);

	const chat = $derived(
		new Chat({
			id: data.chat.id,
			initialMessages: data.chat.messages.map((message) => ({
				...message,
				reasoning: message.reasoning || undefined,
			})),
			sendExtraMessageFields: true,
			api: `/api/chats/${data.chat.id}`,
			generateId: createIdGenerator({
				prefix: 'msg',
				size: 16,
			}),
			onResponse: () => {
				startAutoScrolling();
			},
			onFinish: () => {
				stopAutoScrolling();
				// Final scroll to ensure we're at the bottom
				scrollToBottom();
			},
			onError: (error) => {
				console.error('Error sending message:', error);
				toast.error(m.chat_error_send_message());
				stopAutoScrolling();
			},
		})
	);

	// Title generation mutation
	const generateTitleMutation = createMutation({
		mutationFn: async (chatId: string) => {
			const response = await fetch(`/api/chats/${chatId}/title`, {
				method: 'POST',
			});

			if (!response.ok) {
				throw new Error(m.chat_error_generate_title());
			}

			return response.json();
		},
		onSuccess: () => {
			// Invalidate all chats queries to refresh the sidebar (including search variants)
			data.queryClient.invalidateQueries({ queryKey: ['chats'] });
		},
		onError: (error) => {
			console.error('Error generating title:', error);
			// Don't show error toast as title generation is not critical
		},
	});

	// Retry message mutation
	const retryMessageMutation = createMutation({
		mutationFn: async (messageIndex: number) => {
			const response = await fetch(`/api/chats/${data.chat.id}/messages`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ messageIndex }),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || 'Error retrying message');
			}

			return response.json();
		},
		onSuccess: () => {
			data.queryClient.invalidateQueries({ queryKey: ['chats'] });
			// Trigger AI response generation after successful deletion
			getAIResponse();
		},
		onError: (error) => {
			console.error('Error retrying message:', error);
			toast.error(m.message_edit_retry_error());
		},
	});

	// Edit message mutation
	const editMessageMutation = createMutation({
		mutationFn: async ({ messageIndex, content }: { messageIndex: number; content: string }) => {
			const response = await fetch(`/api/chats/${data.chat.id}/messages`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ messageIndex, content }),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || 'Error editing message');
			}

			return response.json();
		},
		onSuccess: () => {
			data.queryClient.invalidateQueries({ queryKey: ['chats'] });
			// Trigger AI response generation after successful edit
			getAIResponse();
		},
		onError: (error) => {
			console.error('Error editing message:', error);
			toast.error(m.message_edit_error());
		},
	});

	function scrollToBottom(behavior: 'auto' | 'smooth' = 'auto') {
		if (messagesContainer) {
			window.scrollTo({
				top: messagesContainer.scrollHeight,
				behavior,
			});
		}
	}

	function startAutoScrolling() {
		if (isAutoScrolling) return; // Prevent multiple intervals

		isAutoScrolling = true;

		// Scroll immediately
		scrollToBottom('smooth');

		// Set up continuous scrolling during streaming
		scrollInterval = setInterval(() => {
			if (isAutoScrolling) {
				scrollToBottom('smooth');
			}
		}, 100); // Scroll every 100ms during streaming
	}

	function stopAutoScrolling() {
		isAutoScrolling = false;

		if (scrollInterval) {
			clearInterval(scrollInterval);
			scrollInterval = null;
		}
	}

	function handleRetry(messageIndex: number) {
		// Update the messages state to remove messages from the selected index onwards
		const messagesToKeep = chat.messages.slice(0, messageIndex);
		chat.messages = messagesToKeep;

		// Delete messages from the database using message position
		$retryMessageMutation.mutate(messageIndex);
	}

	function handleEdit(messageIndex: number, content: string) {
		// Update the message content locally first
		const updatedMessages = [...chat.messages];
		updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], content };

		// Remove messages after the edited one
		const messagesToKeep = updatedMessages.slice(0, messageIndex + 1);
		chat.messages = messagesToKeep;

		// Update the message in the database and delete subsequent messages
		$editMessageMutation.mutate({ messageIndex, content });
	}

	function getAIResponse() {
		chat.reload({
			body: {
				model: chatSettings.selectedModel,
				isSearchEnabled: chatSettings.isSearchEnabled,
			},
		});

		// Generate title if this is a new chat (title is "New chat")
		if (data.chat.title === 'Nuevo chat') {
			$generateTitleMutation.mutate(data.chat.id);
		}
	}

	function handleSubmit(data: { model: string; isSearchEnabled: boolean; files: FileList }) {
		chat.handleSubmit(undefined, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
			experimental_attachments: data.files,
			body: {
				model: data.model,
				isSearchEnabled: data.isSearchEnabled,
			},
		});

		// Scroll down after user submits message
		setTimeout(() => scrollToBottom('auto'), 100);
	}

	onMount(() => {
		if (data.isNewChat) {
			getAIResponse();
			// Clean up the URL, so it doesn't trigger again on refresh
			const url = new URL(page.url);
			url.searchParams.delete('new');
			replaceState(url, '');
		}

		// Cleanup interval on component unmount
		return () => {
			stopAutoScrolling();
		};
	});

	afterNavigate(() => {
		setTimeout(() => scrollToBottom('auto'), 100);
	});
</script>

<svelte:head>
	<title>{data.chat.title} | Ace Chat</title>
</svelte:head>

<!-- Messages Container -->
<main
	bind:this={messagesContainer}
	class="mx-auto mb-8 flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto">
	{#each chat.messages as msg, index (msg.id)}
		{#if msg.role === 'user'}
			<UserMessage
				msg={{
					...msg,
					hasAttachments:
						(msg as ExtendedUIMessage).hasAttachments ||
						(msg.experimental_attachments && msg.experimental_attachments.length > 0),
				}}
				onEdit={(content) => handleEdit(index, content)} />
		{:else if msg.role === 'assistant'}
			<AssistantMessage
				msg={{ model: chatSettings.selectedModel, ...msg }}
				chatId={data.chat.id}
				onRetry={() => handleRetry(index)} />
		{/if}
	{/each}
</main>

<!-- Error State -->
{#if chat.error}
	<Alert variant="destructive" class="mx-auto mb-4 max-w-3xl" role="alert" aria-live="assertive">
		<AlertCircleIcon />
		<AlertTitle>{m.chat_error_title()}</AlertTitle>
		<AlertDescription>
			{chat.error.message || m.chat_error_unknown()}
			<Button
				variant="ghost"
				onclick={() =>
					chat.reload({
						body: {
							model: chatSettings.selectedModel,
							isSearchEnabled: chatSettings.isSearchEnabled,
						},
					})}>
				<RefreshCcw class="h-4 w-4" />
				{m.chat_error_retry()}
			</Button>
		</AlertDescription>
	</Alert>
{/if}

<MessageInput
	isSubmitting={chat.status === 'streaming'}
	bind:message={chat.input}
	isSearchEnabled={chatSettings.isSearchEnabled}
	selectedModel={chatSettings.selectedModel}
	onSubmit={handleSubmit}
	onModelChange={chatSettings.setModel}
	onSearchToggle={chatSettings.toggleSearch} />
