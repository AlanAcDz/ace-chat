<script lang="ts">
	import { Check, Copy, Edit, Save, X } from '@lucide/svelte';

	import type { Attachment } from '$lib/server/db/schema';
	import type { UIMessage } from 'ai';
	import { m } from '$lib/paraglide/messages.js';
	import { Button } from '../ui/button';
	import Textarea from '../ui/textarea/textarea.svelte';
	import Attachments from './attachments.svelte';

	interface Props {
		msg: UIMessage & {
			attachments?: Attachment[];
			hasAttachments?: boolean;
		};
		onEdit?: (content: string) => void;
	}

	let { msg, onEdit }: Props = $props();

	let isCopied = $state(false);
	let isEditing = $state(false);
	let editContent = $state(msg.content);

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

	function startEdit() {
		editContent = msg.content;
		isEditing = true;
	}

	function cancelEdit() {
		editContent = msg.content;
		isEditing = false;
	}

	function saveEdit() {
		if (editContent.trim() !== '' && editContent !== msg.content) {
			onEdit?.(editContent.trim());
		}
		isEditing = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			cancelEdit();
		} else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			saveEdit();
		}
	}
</script>

<div class="group/user-message flex flex-col items-end justify-end gap-2">
	<!-- Message Content -->
	<div class="w-full max-w-lg min-w-0 flex-1 rounded-lg bg-secondary/50 p-4">
		{#if isEditing}
			<!-- Edit Mode -->
			<div class="flex flex-col gap-2">
				<Textarea
					bind:value={editContent}
					class="min-h-20 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					placeholder={m.message_edit_placeholder()}
					onkeydown={handleKeydown}
					autofocus />
				<div class="flex justify-end gap-2">
					<Button size="sm" variant="ghost" onclick={cancelEdit}>
						<X class="h-4 w-4" />
						{m.message_edit_cancel()}
					</Button>
					<Button size="sm" onclick={saveEdit} disabled={editContent.trim() === ''}>
						<Save class="h-4 w-4" />
						{m.message_edit_save()}
					</Button>
				</div>
			</div>
		{:else}
			<!-- View Mode -->
			<div class="prose max-w-none break-words dark:prose-invert">
				<p class="whitespace-pre-wrap">{msg.content}</p>
			</div>

			<!-- Attachments using the new unified component -->
			<Attachments
				messageId={msg.id}
				attachments={msg.attachments}
				experimentalAttachments={msg.experimental_attachments}
				hasAttachments={msg.hasAttachments} />
		{/if}
	</div>

	{#if !isEditing}
		<div
			class="flex items-center gap-2 opacity-0 transition-opacity group-hover/user-message:opacity-100">
			{#if onEdit}
				<Button size="icon" variant="ghost" onclick={startEdit}>
					<Edit />
				</Button>
			{/if}
			<Button size="icon" variant="ghost" onclick={copyMessage}>
				{#if isCopied}
					<Check class="text-primary" />
				{:else}
					<Copy />
				{/if}
			</Button>
		</div>
	{/if}
</div>
