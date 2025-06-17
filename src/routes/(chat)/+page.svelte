<script lang="ts">
	import { AlertCircleIcon } from '@lucide/svelte';
	import { createMutation } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import MessageInput from '$lib/components/chats/message-input.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { getChatSettingsContext } from '$lib/contexts/chat-settings.svelte';
	import { m } from '$lib/paraglide/messages.js';

	interface MessageData {
		message: string;
		model: string;
		isSearchEnabled: boolean;
		files: FileList;
	}

	let { data }: { data: PageData } = $props();

	// Get chat settings from context
	const chatSettings = getChatSettingsContext();

	// Create mutation for creating new chats
	const createChatMutation = createMutation({
		mutationFn: async (formData: FormData) => {
			const response = await fetch('/api/chats', {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || m.chat_error_create_api());
			}

			return response.json();
		},
		onSuccess: ({ newChatId }) => {
			data.queryClient.invalidateQueries({ queryKey: ['chats'] });
			goto(`/chats/${newChatId}?new=true`);
		},
		onError: (error) => {
			console.error('Error creating chat:', error);
			toast.error(m.chat_error_create());
		},
	});

	async function handleSubmit(data: MessageData) {
		const formData = new FormData();
		formData.append('message', data.message);
		formData.append('model', data.model);
		formData.append('isSearchEnabled', String(data.isSearchEnabled));

		for (const file of data.files) {
			formData.append('files', file, file.name);
		}

		$createChatMutation.mutate(formData);

		// Reset search after creating chat (optional behavior)
		chatSettings.resetSearchAfterChat();
	}

	async function handleSampleQuestion(question: string) {
		const formData = new FormData();
		formData.append('message', question);
		formData.append('model', chatSettings.selectedModel);
		formData.append('isSearchEnabled', String(chatSettings.isSearchEnabled));

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
			{m.chat_welcome_message({ name: user.name?.split(' ')[0] || user.username })}
		</h1>
	{/await}
	<!-- Error State -->
	{#if $createChatMutation.isError}
		<Alert variant="destructive" class="mx-auto mb-4 max-w-3xl" role="alert" aria-live="assertive">
			<AlertCircleIcon />
			<AlertTitle>{m.chat_error_title()}</AlertTitle>
			<AlertDescription>
				{$createChatMutation.error?.message || m.chat_error_unknown()}
			</AlertDescription>
		</Alert>
	{:else}
		<!-- Sample Questions (placeholder for future implementation) -->
		<div class="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
			<Button
				variant="secondary"
				size="lg"
				onclick={() => handleSampleQuestion(m.chat_sample_questions_ai_how_works())}>
				{m.chat_sample_questions_ai_how_works()}
			</Button>
			<Button
				variant="secondary"
				size="lg"
				onclick={() => handleSampleQuestion(m.chat_sample_questions_black_holes_real())}>
				{m.chat_sample_questions_black_holes_real()}
			</Button>
			<Button
				variant="secondary"
				size="lg"
				onclick={() => handleSampleQuestion(m.chat_sample_questions_rs_in_strawberry())}>
				{m.chat_sample_questions_rs_in_strawberry()}
			</Button>
			<Button
				variant="secondary"
				size="lg"
				onclick={() => handleSampleQuestion(m.chat_sample_questions_meaning_of_life())}>
				{m.chat_sample_questions_meaning_of_life()}
			</Button>
		</div>
	{/if}
</div>

<MessageInput
	onSubmit={handleSubmit}
	isSubmitting={$createChatMutation.isPending}
	selectedModel={chatSettings.selectedModel}
	isSearchEnabled={chatSettings.isSearchEnabled}
	onModelChange={chatSettings.setModel}
	onSearchToggle={chatSettings.toggleSearch} />
