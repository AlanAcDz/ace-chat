<script lang="ts">
	import { Check, Copy, RefreshCcw } from '@lucide/svelte';

	import type { Attachment } from '$lib/server/db/schema';
	import type { UIMessage } from 'ai';
	import { formatFileSize, getFileIcon } from '$lib/utils';
	import { Button } from '../ui/button';

	interface Props {
		msg: UIMessage & {
			attachments?: Attachment[];
		};
		onRetry?: () => void;
	}

	let { msg, onRetry }: Props = $props();

	let isCopied = $state(false);

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

<div class="group/user-message flex flex-col items-end justify-end gap-2">
	<!-- Message Content -->
	<div class="w-full max-w-lg min-w-0 flex-1 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
		<!-- Message Text -->
		<div class="prose prose-sm max-w-none break-words dark:prose-invert">
			<p class="whitespace-pre-wrap">{msg.content}</p>
		</div>

		<!-- Attachments -->
		{#if msg.attachments && msg.attachments.length > 0}
			<div class="mt-4 flex flex-wrap gap-2">
				{#each msg.attachments as attachment (attachment.id)}
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
			</div>
		{/if}
		{#if msg.experimental_attachments && msg.experimental_attachments.length > 0}
			<div class="mt-4 flex flex-wrap gap-2">
				{#each msg.experimental_attachments as attachment (attachment.url)}
					{@const IconComponent = getFileIcon(attachment.contentType || '')}
					<div class="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-2">
						<IconComponent class="size-5 text-gray-600 dark:text-gray-400" />
						<div class="min-w-0 flex-1 text-start">
							<p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
								{attachment.name}
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
	<div
		class="flex items-center gap-2 opacity-0 transition-opacity group-hover/user-message:opacity-100">
		{#if onRetry}
			<Button size="icon" variant="ghost" onclick={onRetry}>
				<RefreshCcw />
			</Button>
		{/if}
		<Button size="icon" variant="ghost" onclick={copyMessage}>
			{#if isCopied}
				<Check class="text-green-600 dark:text-green-400" />
			{:else}
				<Copy />
			{/if}
		</Button>
	</div>
</div>
