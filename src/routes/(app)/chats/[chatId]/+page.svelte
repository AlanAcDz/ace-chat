<script lang="ts">
	import { onMount } from 'svelte';
	import { AlertCircleIcon } from '@lucide/svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';
	import { invalidate } from '$app/navigation';
	import MessageInput from '$lib/components/chats/message-input.svelte';
	import UserMessage from '$lib/components/chats/user-message.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';

	let { data }: { data: PageData } = $props();
	let messagesContainer: HTMLElement;

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
		},
		onError: (error) => {
			console.error('Error sending message:', error);
			toast.error('Error al enviar el mensaje');
		},
	});

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	onMount(() => {
		scrollToBottom();
	});
</script>

<svelte:head>
	<title>{data.chat.title} | Ace Chat</title>
</svelte:head>

<!-- Messages Container -->
<main
	bind:this={messagesContainer}
	class="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-y-auto">
	{#each data.chat.messages as msg (msg.id)}
		{#if msg.role === 'user'}
			<UserMessage {msg} />
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
	onSubmit={(formData) => $addMessageMutation.mutate(formData)} />
