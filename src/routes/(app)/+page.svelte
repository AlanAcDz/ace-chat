<script lang="ts">
	import { createMutation } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';
	import MessageInput from '$lib/components/chats/message-input.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Skeleton } from '$lib/components/ui/skeleton';

	let { data }: { data: PageData } = $props();

	// Create mutation for creating new chats
	const createChatMutation = createMutation({
		mutationFn: async (formData: FormData) => {
			const response = await fetch('/api/chats', {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || 'Error al crear el chat');
			}

			return response.json();
		},
		onError: (error) => {
			console.error('Error creating chat:', error);
			toast.error('Error al crear el chat');
		},
	});

	async function handleSubmit(formData: FormData) {
		$createChatMutation.mutate(formData);
	}
</script>

<!-- Header Section -->
<div class="mb-8 flex flex-1 flex-col items-center justify-center text-center">
	{#await data.user}
		<div class="mb-6">
			<Skeleton class="mx-auto mb-2 h-12 w-96" />
			<Skeleton class="mx-auto h-8 w-64" />
		</div>
	{:then user}
		<h1 class="mb-6 text-4xl font-semibold text-gray-800 md:text-5xl dark:text-gray-200">
			¿Cómo puedo ayudarte, {user.name || user.username}?
		</h1>
	{/await}
	<!-- Error State -->
	{#if $createChatMutation.isError}
		<Alert variant="destructive" class="mx-auto mb-4 max-w-3xl">
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>
				{$createChatMutation.error?.message || 'Error desconocido'}
			</AlertDescription>
		</Alert>
	{:else}
		<!-- Sample Questions (placeholder for future implementation) -->
		<div class="grid max-w-2xl grid-cols-1 gap-3 md:grid-cols-2">
			<div
				class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
				¿Cómo funciona la IA?
			</div>
			<div
				class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
				¿Son reales los agujeros negros?
			</div>
			<div
				class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
				¿Cuántas Rs hay en la palabra "fresa"?
			</div>
			<div
				class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
				¿Cuál es el significado de la vida?
			</div>
		</div>
	{/if}
</div>

<MessageInput onSubmit={handleSubmit} isSubmitting={$createChatMutation.isPending} />
