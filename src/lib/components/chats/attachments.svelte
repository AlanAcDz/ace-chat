<script lang="ts">
	import type { Attachment } from '$lib/server/db/schema';
	import type { UIMessage } from 'ai';
	import { formatFileSize, getFileIcon } from '$lib/utils';
	import AttachmentsLoader from './attachments-loader.svelte';

	interface Props {
		messageId: string;
		attachments?: Attachment[];
		experimentalAttachments?: UIMessage['experimental_attachments'];
		hasAttachments?: boolean;
	}

	let { messageId, attachments, experimentalAttachments, hasAttachments }: Props = $props();

	// Show regular attachments if they exist
	const showRegularAttachments = $derived(attachments && attachments.length > 0);

	// Show loader if we have experimental attachments or if the message is marked as having attachments but no regular attachments yet
	const showLoader = $derived(
		!showRegularAttachments &&
			((experimentalAttachments && experimentalAttachments.length > 0) || hasAttachments)
	);
</script>

{#if showRegularAttachments && attachments}
	<!-- Regular attachments from database -->
	<div class="mt-4 flex flex-wrap gap-2">
		{#each attachments as attachment (attachment.id)}
			{@const IconComponent = getFileIcon(attachment.fileType)}
			<button
				onclick={() => window.open(`/api/files/${attachment.filePath}`, '_blank')}
				class="flex cursor-pointer items-center gap-2 rounded-md border border-primary bg-secondary/80 p-2 transition-colors hover:bg-secondary">
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
{:else if showLoader}
	<!-- Loader handles experimental attachments as loading state and polling -->
	<AttachmentsLoader {messageId} {experimentalAttachments} />
{/if}
