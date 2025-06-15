<script lang="ts">
	import { Check, Copy, RefreshCcw } from '@lucide/svelte';

	import type { Attachment } from '$lib/server/db/schema';
	import type { UIMessage } from 'ai';
	import { Button } from '../ui/button';
	import Attachments from './attachments.svelte';

	interface Props {
		msg: UIMessage & {
			attachments?: Attachment[];
			hasAttachments?: boolean;
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
	<div class="w-full max-w-lg min-w-0 flex-1 rounded-lg bg-secondary/50 p-4">
		<!-- Message Text -->
		<div class="prose prose-sm max-w-none break-words dark:prose-invert">
			<p class="whitespace-pre-wrap">{msg.content}</p>
		</div>

		<!-- Attachments using the new unified component -->
		<Attachments
			messageId={msg.id}
			attachments={msg.attachments}
			experimentalAttachments={msg.experimental_attachments}
			hasAttachments={msg.hasAttachments} />
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
