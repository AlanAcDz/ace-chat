<script lang="ts">
	import { code } from '@cartamd/plugin-code';
	import { Check, Copy, RefreshCcw } from '@lucide/svelte';
	import { Carta, Markdown } from 'carta-md';
	import DOMPurify from 'isomorphic-dompurify';

	import type { Attachment } from '$lib/server/db/schema';
	import type { Message } from 'ai';
	import { Button } from '../ui/button';

	import 'carta-md/default.css'; /* Default theme */
	import '@cartamd/plugin-code/default.css';

	interface Props {
		msg: Message & {
			attachments?: Attachment[];
			model: string;
		};
		onRetry?: () => void;
	}

	let { msg, onRetry }: Props = $props();

	let isCopied = $state(false);

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

	const carta = new Carta({
		sanitizer: DOMPurify.sanitize,
		extensions: [code()],
	});

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
	{#key msg.content}
		<div class="prose prose-sm dark:prose-invert">
			<Markdown {carta} value={msg.content} />
		</div>
	{/key}
	{#if msg.role === 'assistant' && msg.content === ''}
		<span class="animate-pulse">▍</span>
	{/if}

	<!-- Display images from parts (generated images) -->
	{#if imageParts.length > 0}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each imageParts as imageData, index (index)}
				<div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
					<img
						src={imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`}
						alt="Generated image {index + 1}"
						class="h-auto w-full object-cover"
						loading="lazy" />
				</div>
			{/each}
		</div>
	{/if}

	<!-- Display images from attachments (database) -->
	{#if imageAttachments.length > 0}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
	<div
		class="flex items-center gap-2 opacity-0 transition-opacity group-hover/assistant-message:opacity-100">
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
		<span class="text-xs text-gray-500 dark:text-gray-400">{msg.model}</span>
	</div>
</div>
