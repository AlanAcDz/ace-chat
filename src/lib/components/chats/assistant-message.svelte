<script lang="ts">
	import { Check, Copy, RefreshCcw } from '@lucide/svelte';

	import type { Message } from 'ai';
	import { Button } from '../ui/button';

	interface Props {
		msg: Message & {
			model: string;
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

<div class="group/assistant-message flex flex-col items-start justify-start gap-4">
	<p class="prose prose-sm whitespace-pre-wrap dark:prose-invert">{msg.content}</p>
	{#if msg.role === 'assistant' && msg.content === ''}
		<span class="animate-pulse">▍</span>
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
