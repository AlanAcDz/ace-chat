<script lang="ts">
	import { Check, Copy, Share } from '@lucide/svelte';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';

	import { m } from '$lib/paraglide/messages.js';
	import { Button } from '../ui/button';
	import * as Dialog from '../ui/dialog';

	interface Props {
		chatId: string;
	}

	let { chatId }: Props = $props();

	let isDialogOpen = $state(false);
	let isCopied = $state(false);
	let shareUrl = $state<string>('');

	const queryClient = useQueryClient();

	// Query to get the current share status
	const shareStatusQuery = createQuery({
		queryKey: ['chat-share-status', chatId],
		queryFn: async () => {
			const response = await fetch(`/api/chats/${chatId}/share-status`);
			if (!response.ok) {
				throw new Error('Error fetching share status');
			}
			return response.json();
		},
	});

	// Update shareUrl when query data changes
	$effect(() => {
		if ($shareStatusQuery.data?.shareUrl) {
			shareUrl = `${window.location.origin}${$shareStatusQuery.data.shareUrl}`;
		} else {
			shareUrl = '';
		}
	});

	// Share chat mutation
	const shareMutation = createMutation({
		mutationFn: async (chatId: string) => {
			const response = await fetch(`/api/chats/${chatId}/share`, {
				method: 'POST',
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || m.share_button_share_error());
			}

			return response.json();
		},
		onSuccess: (data) => {
			shareUrl = `${window.location.origin}${data.shareUrl}`;
			isDialogOpen = true;
			toast.success(m.share_button_share_success());
			queryClient.invalidateQueries({ queryKey: ['chat-share-status', chatId] });
		},
		onError: (error) => {
			console.error('Error sharing chat:', error);
			toast.error(m.share_button_share_error());
		},
	});

	// Unshare chat mutation
	const unshareMutation = createMutation({
		mutationFn: async (chatId: string) => {
			const response = await fetch(`/api/chats/${chatId}/share`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || m.share_button_unshare_error());
			}

			return response.json();
		},
		onSuccess: () => {
			shareUrl = '';
			isDialogOpen = false;
			toast.success(m.share_button_unshare_success());
			queryClient.invalidateQueries({ queryKey: ['chat-share-status', chatId] });
		},
		onError: (error) => {
			console.error('Error unsharing chat:', error);
			toast.error(m.share_button_unshare_error());
		},
	});

	function handleShare() {
		if (shareUrl) {
			// Already shared, show dialog
			isDialogOpen = true;
		} else {
			// Not shared yet, create share
			$shareMutation.mutate(chatId);
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(shareUrl);
			isCopied = true;
			setTimeout(() => {
				isCopied = false;
			}, 2000);
			toast.success(m.share_button_copy_success());
		} catch (error) {
			console.error('Failed to copy:', error);
			toast.error(m.share_button_copy_error());
		}
	}

	function handleUnshare() {
		$unshareMutation.mutate(chatId);
	}
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={handleShare}
	disabled={$shareMutation.isPending}
	title={m.share_button_title()}
	class="size-8">
	<Share class="size-4" />
</Button>

<Dialog.Root bind:open={isDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{m.share_dialog_title()}</Dialog.Title>
			<Dialog.Description>
				{m.share_dialog_description()}
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex items-stretch space-x-2">
			<div class="grid flex-1 gap-2">
				<label for="share-url" class="sr-only">{m.share_dialog_link_label()}</label>
				<input
					id="share-url"
					value={shareUrl}
					readonly
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50" />
			</div>
			<Button class="h-auto px-3" onclick={copyToClipboard}>
				<span class="sr-only">{m.share_dialog_copy_aria()}</span>
				{#if isCopied}
					<Check class="h-4 w-4" />
				{:else}
					<Copy class="h-4 w-4" />
				{/if}
			</Button>
		</div>
		<Dialog.Footer>
			<Button variant="destructive" onclick={handleUnshare} disabled={$unshareMutation.isPending}>
				{m.share_dialog_unshare()}
			</Button>
			<Dialog.Close>
				<Button type="button" variant="secondary">{m.share_dialog_close()}</Button>
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
