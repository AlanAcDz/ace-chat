<script lang="ts">
	import { code } from '@cartamd/plugin-code';
	import { Check, ChevronRight, Copy, GitBranch, RefreshCcw } from '@lucide/svelte';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { Carta, Markdown } from 'carta-md';
	import DOMPurify from 'isomorphic-dompurify';
	import { mode } from 'mode-watcher';
	import { toast } from 'svelte-sonner';

	import type { Attachment } from '$lib/server/db/schema';
	import type { Message } from 'ai';
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';
	import { Button } from '../ui/button';
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

	interface Props {
		msg: Message & {
			attachments?: Attachment[];
			model: string;
			reasoning?: string;
			sources?: { title: string; url: string }[];
		};
		chatId: string;
		onRetry?: () => void;
		isSharedView?: boolean;
	}

	let { msg, chatId, onRetry, isSharedView = false }: Props = $props();

	let isCopied = $state(false);
	let reasoningOpen = $state(false);
	let sourcesOpen = $state(false);

	const queryClient = useQueryClient();

	// Branch chat mutation
	const branchMutation = createMutation({
		mutationFn: async (messageId: string) => {
			const response = await fetch(`/api/chats/${chatId}/branch`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ messageId }),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(errorText || m.assistant_message_branch_error());
			}

			return response.json();
		},
		onSuccess: ({ newChatId }) => {
			toast.success(m.assistant_message_branch_success());
			queryClient.invalidateQueries({ queryKey: ['chats'] });
			goto(`/chats/${newChatId}`);
		},
		onError: (error) => {
			console.error('Error branching chat:', error);
			toast.error(m.assistant_message_branch_error());
		},
	});

	function handleBranch() {
		$branchMutation.mutate(msg.id);
	}

	// Get image attachments from database
	let imageAttachments = $derived(
		msg.attachments?.filter((attachment) => attachment.fileType.startsWith('image/')) || []
	);
	let imageParts = $derived(
		msg.parts
			?.filter((part) => part.type === 'file' && part.mimeType.startsWith('image/') && part.data)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.map((part: any) => part.data) || []
	);

	// Extract sources from both database and message parts
	let allSources = $derived(() => {
		const sourcesFromDb = msg.sources || [];
		const sourcesFromParts: { title: string; url: string }[] = [];

		if (msg.parts) {
			for (const part of msg.parts) {
				if (part.type === 'source' && 'source' in part && part.source?.sourceType === 'url') {
					sourcesFromParts.push({
						title: part.source.title || '',
						url: part.source.url || '',
					});
				}
			}
		}

		return [...sourcesFromDb, ...sourcesFromParts];
	});

	const carta = $derived(
		new Carta({
			sanitizer: DOMPurify.sanitize,
			extensions: [
				code({
					theme: mode.current === 'dark' ? 'catppuccin-frappe' : 'catppuccin-latte',
				}),
			],
			shikiOptions: {
				themes: ['catppuccin-frappe', 'catppuccin-latte'],
			},
		})
	);

	async function copyMessage() {
		try {
			await navigator.clipboard.writeText(msg.content);
			isCopied = true;
			setTimeout(() => {
				isCopied = false;
			}, 2000);
		} catch (error) {
			console.error('Failed to copy message:', error);
		}
	}
</script>

<div class="group/assistant-message flex flex-col items-start justify-start px-2">
	<!-- Reasoning Section (if available) -->
	{#if msg.reasoning}
		<Collapsible bind:open={reasoningOpen} class="w-full">
			<CollapsibleTrigger class="flex items-center gap-1 text-xs">
				<ChevronRight
					class="h-4 w-4 transition-transform duration-200 {reasoningOpen ? 'rotate-90' : ''}" />
				<span>{m.assistant_message_reasoning()}</span>
			</CollapsibleTrigger>
			<CollapsibleContent class="mt-2 max-w-xl rounded-lg bg-secondary/50 px-4 py-px">
				<div class="prose prose-sm dark:prose-invert">
					{#key msg.reasoning + mode.current}
						<Markdown {carta} value={msg.reasoning} />
					{/key}
				</div>
			</CollapsibleContent>
		</Collapsible>
	{/if}

	<!-- Main Message Content -->
	{#key msg.content + mode.current}
		<div class="prose dark:prose-invert">
			<Markdown {carta} value={msg.content} />
		</div>
	{/key}
	{#if msg.role === 'assistant' && msg.content === ''}
		<span class="animate-pulse">▍</span>
	{/if}

	<!-- Display images from parts (generated images) -->
	{#if imageParts.length > 0}
		<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each imageParts as imageData, index (index)}
				<div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
					<img
						src={imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`}
						alt={m.assistant_message_generated_image({ index: index + 1 })}
						class="h-auto w-full object-cover"
						loading="lazy" />
				</div>
			{/each}
		</div>
	{/if}

	<!-- Display images from attachments (database) -->
	{#if imageAttachments.length > 0}
		<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each imageAttachments as attachment (attachment.id)}
				<div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
					<img
						src="/api/files/{attachment.filePath}"
						alt={attachment.fileName}
						class="h-auto w-full object-cover"
						loading="lazy" />
					<div class="bg-gray-50 p-2 dark:bg-gray-800">
						<p class="text-xs text-gray-600 dark:text-gray-400">{attachment.fileName}</p>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Sources Section (if available) -->
	{#if allSources().length > 0}
		<Collapsible bind:open={sourcesOpen} class="mb-4 w-full">
			<CollapsibleTrigger class="flex items-center gap-1 text-xs">
				<ChevronRight
					class="h-4 w-4 transition-transform duration-200 {sourcesOpen ? 'rotate-90' : ''}" />
				<span>{m.assistant_message_sources()} ({allSources().length})</span>
			</CollapsibleTrigger>
			<CollapsibleContent class="mt-2 space-y-2">
				{#each allSources() as source, index (index)}
					<div class="max-w-sm rounded-lg bg-secondary/50 p-2">
						<a
							href={source.url}
							target="_blank"
							rel="noopener noreferrer"
							class="block text-xs font-medium">
							{source.title || source.url}
						</a>
					</div>
				{/each}
			</CollapsibleContent>
		</Collapsible>
	{/if}

	<!-- Action Buttons -->
	<div
		class="flex items-center gap-2 opacity-0 transition-opacity group-hover/assistant-message:opacity-100">
		{#if onRetry}
			<Button size="icon" variant="ghost" onclick={onRetry}>
				<RefreshCcw />
			</Button>
		{/if}
		{#if !isSharedView}
			<Button
				size="icon"
				variant="ghost"
				onclick={handleBranch}
				disabled={$branchMutation.isPending}
				title={m.assistant_message_branch_tooltip()}>
				<GitBranch />
			</Button>
		{/if}
		<Button size="icon" variant="ghost" onclick={copyMessage}>
			{#if isCopied}
				<Check class="text-primary" />
			{:else}
				<Copy />
			{/if}
		</Button>
		<span class="text-xs text-gray-500 dark:text-gray-400">{msg.model}</span>
	</div>
</div>
