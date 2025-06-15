<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';

	import type { Attachment } from '$lib/server/db/schema';
	import type { UIMessage } from 'ai';
	import { m } from '$lib/paraglide/messages.js';
	import { formatFileSize, getFileIcon } from '$lib/utils';

	interface Props {
		messageId: string;
		experimentalAttachments?: UIMessage['experimental_attachments'];
	}

	let { messageId, experimentalAttachments }: Props = $props();

	// Fetch actual attachments from database
	const attachmentsQuery = createQuery({
		queryKey: ['attachments', messageId],
		queryFn: async () => {
			const response = await fetch(`/api/attachments/${messageId}`);
			if (!response.ok) throw new Error('Failed to fetch attachments');
			return response.json() as Promise<Attachment[]>;
		},
		refetchInterval: (query) => {
			// If there are no attachments yet and we have experimental ones, keep polling
			const hasData = query.state.data && query.state.data.length > 0;
			const hasExperimental = experimentalAttachments && experimentalAttachments.length > 0;
			return !hasData && hasExperimental ? 1000 : false;
		},
		refetchIntervalInBackground: false,
	});

	// Determine what to show
	const hasActualAttachments = $derived(
		$attachmentsQuery.data && $attachmentsQuery.data.length > 0
	);
	const hasExperimentalAttachments = $derived(
		experimentalAttachments && experimentalAttachments.length > 0
	);
</script>

<div class="mt-4 flex flex-wrap gap-2">
	{#if hasActualAttachments && $attachmentsQuery.data}
		<!-- Show actual attachments once loaded -->
		{#each $attachmentsQuery.data as attachment (attachment.id)}
			{@const IconComponent = getFileIcon(attachment.fileType)}
			<button
				onclick={() => window.open(`/api/files/${attachment.filePath}`, '_blank')}
				class="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-2 transition-colors hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700">
				<IconComponent class="size-5 text-gray-600 dark:text-gray-400" />
				<div class="min-w-0 flex-1 text-start">
					<p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
						{attachment.fileName}
					</p>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						{formatFileSize(attachment.fileSize)}
					</p>
				</div>
			</button>
		{/each}
	{:else if hasExperimentalAttachments && experimentalAttachments}
		<!-- Show experimental attachments as loading state -->
		{#each experimentalAttachments as attachment (attachment.url)}
			{@const IconComponent = getFileIcon(attachment.contentType || '')}
			<div
				class="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-2 opacity-75">
				<IconComponent class="size-5 text-gray-600 dark:text-gray-400" />
				<div class="min-w-0 flex-1 text-start">
					<p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
						{attachment.name}
					</p>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						{m.attachments_loader_processing()}
					</p>
				</div>
				<!-- Processing indicator -->
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-300">
				</div>
			</div>
		{/each}
	{:else}
		<!-- Generic loading state when no experimental attachments -->
		<div
			class="flex animate-pulse items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-2">
			<div class="size-5 rounded bg-gray-300 dark:bg-gray-600"></div>
			<div class="min-w-0 flex-1 text-start">
				<div class="mb-1 h-4 rounded bg-gray-300 dark:bg-gray-600"></div>
				<div class="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
			</div>
		</div>
	{/if}

	{#if $attachmentsQuery.error}
		<!-- Error state -->
		<div
			class="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-red-700 dark:border-red-800 dark:bg-red-900/10 dark:text-red-400">
			<div class="size-5 text-red-500">⚠️</div>
			<div class="min-w-0 flex-1 text-start">
				<p class="text-sm font-medium">{m.attachments_loading_error()}</p>
				<p class="text-xs">{m.attachments_loading_error_retry()}</p>
			</div>
		</div>
	{/if}
</div>
