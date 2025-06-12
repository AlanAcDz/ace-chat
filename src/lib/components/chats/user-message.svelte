<script lang="ts">
	import { File, FileText, Image } from '@lucide/svelte';

	import type { Attachment, Message } from '$lib/server/db/schema';

	interface Props {
		msg: Message & {
			attachments: Attachment[];
		};
	}

	let { msg }: Props = $props();

	function getFileIcon(fileType: string) {
		if (fileType.startsWith('image/')) {
			return Image;
		} else if (fileType.includes('pdf') || fileType.includes('text')) {
			return FileText;
		}
		return File;
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
</script>

<div class="flex justify-end">
	<!-- Message Content -->
	<div class="w-full max-w-lg min-w-0 flex-1 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
		<!-- Message Text -->
		<div class="prose prose-sm dark:prose-invert mt-1 max-w-none break-words">
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
	</div>
</div>
