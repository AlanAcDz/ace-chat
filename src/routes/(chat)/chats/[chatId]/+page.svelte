<script lang="ts">
	import { onMount } from 'svelte';
	import { Chat } from '@ai-sdk/svelte';
	import { AlertCircleIcon } from '@lucide/svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { createIdGenerator } from 'ai';
	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { AI_MODELS } from '$lib/ai/models';
	import AssistantMessage from '$lib/components/chats/assistant-message.svelte';
	import MessageInput from '$lib/components/chats/message-input.svelte';
	import UserMessage from '$lib/components/chats/user-message.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';

	let { data }: { data: PageData } = $props();
	let messagesContainer: HTMLElement;

	let isSearchEnabled = $state(page.url.searchParams.get('search') === 'true');
	let selectedModel = $state(AI_MODELS[0].key);
	let isAutoScrolling = $state(false);
	let scrollInterval: ReturnType<typeof setInterval> | null = $state(null);

	const chat = $derived(
		new Chat({
			id: data.chat.id,
			initialMessages: data.chat.messages,
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
				toast.error('Error al enviar el mensaje');
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
				throw new Error('Error al generar el título');
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

	function scrollToBottom() {
		if (messagesContainer) {
			window.scrollTo({
				top: messagesContainer.scrollHeight,
				behavior: 'auto',
			});
		}
	}

	function startAutoScrolling() {
		if (isAutoScrolling) return; // Prevent multiple intervals

		isAutoScrolling = true;

		// Scroll immediately
		scrollToBottom();

		// Set up continuous scrolling during streaming
		scrollInterval = setInterval(() => {
			if (messagesContainer && isAutoScrolling) {
				window.scrollTo({
					top: messagesContainer.scrollHeight,
					behavior: 'smooth',
				});
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

	function getAIResponse() {
		chat.reload({
			body: {
				model: selectedModel,
				isSearchEnabled: isSearchEnabled,
			},
		});

		// Generate title if this is a new chat (title is "Nuevo chat")
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
		setTimeout(() => scrollToBottom(), 100);
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
		scrollToBottom();
	});
</script>

<svelte:head>
	<title>{data.chat.title} | Ace Chat</title>
</svelte:head>

<!-- Messages Container -->
<main
	bind:this={messagesContainer}
	class="mx-auto mb-8 flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto">
	{#each chat.messages as msg (msg.id)}
		{#if msg.role === 'user'}
			<UserMessage {msg} />
		{:else if msg.role === 'assistant'}
			<AssistantMessage msg={{ model: selectedModel, ...msg }} />
		{/if}
	{/each}
</main>

<!-- Error State -->
{#if chat.error}
	<Alert variant="destructive" class="mx-auto mb-4 max-w-3xl" role="alert" aria-live="assertive">
		<AlertCircleIcon />
		<AlertTitle>Error</AlertTitle>
		<AlertDescription>
			{chat.error.message || 'Error desconocido'}
		</AlertDescription>
	</Alert>
{/if}

<MessageInput
	isSubmitting={chat.status === 'streaming'}
	bind:message={chat.input}
	bind:isSearchEnabled
	bind:selectedModel
	onSubmit={handleSubmit} />
