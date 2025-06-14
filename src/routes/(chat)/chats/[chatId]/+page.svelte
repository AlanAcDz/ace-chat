<script lang="ts">
	import { onMount } from 'svelte';
	import { Chat } from '@ai-sdk/svelte';
	import { AlertCircleIcon } from '@lucide/svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { createIdGenerator } from 'ai';
	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';
	import { afterNavigate, invalidate, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { AI_MODELS } from '$lib/ai/models';
	import AssistantMessage from '$lib/components/chats/assistant-message.svelte';
	import MessageInput from '$lib/components/chats/message-input.svelte';
	import UserMessage from '$lib/components/chats/user-message.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';

	let { data }: { data: PageData } = $props();
	let messagesContainer: HTMLElement;

	let isSearchEnabled = $state(false);
	let selectedModel = $state(AI_MODELS[0].key);

	const chat = $derived(
		new Chat({
			id: data.chat.id,
			initialMessages: data.chat.messages,
			sendExtraMessageFields: true,
			api: '/api/ai',
			generateId: createIdGenerator({
				prefix: 'msg',
				size: 16,
			}),
			onError: (error) => {
				console.error('Error sending message:', error);
				toast.error('Error al enviar el mensaje');
			},
		})
	);

	// Create mutation for adding messages to existing chat
	const addMessageMutation = createMutation({
		mutationFn: async (formData: FormData) => {
			const response = await fetch(`/api/chats/${data.chat.id}`, {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || 'Error al enviar el mensaje');
			}

			return response.json();
		},
		onSuccess: () => {
			data.queryClient.invalidateQueries({ queryKey: ['chats', ''] });
			invalidate('app:chat');
			getAIResponse();
		},
		onError: (error) => {
			console.error('Error sending message:', error);
			toast.error('Error al enviar el mensaje');
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

	function getAIResponse() {
		chat.reload({
			body: {
				model: selectedModel,
				isSearchEnabled: isSearchEnabled,
			},
		});
	}

	onMount(() => {
		if (data.isNewChat) {
			getAIResponse();
			// Clean up the URL, so it doesn't trigger again on refresh
			const url = new URL(page.url);
			url.searchParams.delete('new');
			replaceState(url, '');
		}
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
	class="mx-auto mb-8 flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-y-auto">
	{#each chat.messages as msg (msg.id)}
		{#if msg.role === 'user'}
			<UserMessage {msg} />
		{:else if msg.role === 'assistant'}
			<AssistantMessage msg={{ model: selectedModel, ...msg }} />
		{/if}
	{/each}
</main>

<!-- Error State -->
{#if $addMessageMutation.isError}
	<Alert variant="destructive" class="mx-auto mb-4 max-w-3xl" role="alert" aria-live="assertive">
		<AlertCircleIcon />
		<AlertTitle>Error</AlertTitle>
		<AlertDescription>
			{$addMessageMutation.error?.message || 'Error desconocido'}
		</AlertDescription>
	</Alert>
{/if}

<MessageInput
	isSubmitting={$addMessageMutation.isPending}
	bind:message={chat.input}
	bind:isSearchEnabled
	bind:selectedModel
	onSubmit={(data) =>
		chat.handleSubmit(undefined, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
			experimental_attachments: data.files,
			body: {
				model: data.model,
				isSearchEnabled: data.isSearchEnabled,
			},
		})} />
