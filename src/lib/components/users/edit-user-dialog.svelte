<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';

	import type { User } from '$lib/server/db/schema';
	import { applyAction, deserialize } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
	} from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { USER_GRANTS } from '$lib/grants';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		open: boolean;
		user: Omit<User, 'passwordHash'> | null;
		onOpenChange: (open: boolean) => void;
	}

	let { open = $bindable(), user, onOpenChange }: Props = $props();

	// Transform USER_GRANTS into the format needed for the component
	const availableGrants = Object.entries(USER_GRANTS).map(([key, value]) => ({
		key,
		name: key.replace(/:/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
		description: value.description(),
	}));

	let isSubmitting = $state(false);
	let selectedGrants = $state<string[]>([]);
	let systemPrompt = $state('');

	// Check if system prompt grant is selected
	const showSystemPromptTextarea = $derived(
		!selectedGrants.includes('settings:update:system-prompt')
	);

	// Update selected grants and system prompt when user changes
	$effect(() => {
		if (user) {
			selectedGrants = [...user.grants];
			systemPrompt = user.defaultSystemPrompt || '';
		} else {
			selectedGrants = [];
			systemPrompt = '';
		}
	});

	// Handle form submission
	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!user) return;

		isSubmitting = true;

		const form = new FormData();
		form.append('id', user.id);
		selectedGrants.forEach((grant) => {
			form.append('grants', grant);
		});

		// Only include system prompt if the grant is not selected
		if (!selectedGrants.includes('settings:update:system-prompt')) {
			form.append('systemPrompt', systemPrompt);
		}

		const response = await fetch('?/updateUser', {
			method: 'POST',
			body: form,
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success') {
			toast.success(m.edit_user_dialog_update_success());
			await invalidate('app:users');
			onOpenChange(false);
		} else if (result.type === 'failure') {
			if (result.data?.errors?._form) {
				toast.error(result.data.errors._form[0]);
			}
		} else {
			toast.error(m.edit_user_dialog_update_error());
		}

		applyAction(result);
		isSubmitting = false;
	}

	// Handle dialog close
	function handleClose() {
		if (!isSubmitting) {
			onOpenChange(false);
		}
	}

	// Handle grant selection
	function handleGrantChange(grant: string, checked: boolean) {
		if (checked) {
			selectedGrants = [...selectedGrants, grant];
		} else {
			selectedGrants = selectedGrants.filter((g) => g !== grant);
		}
	}
</script>

<Dialog {open} onOpenChange={handleClose}>
	<DialogContent class="max-h-[80vh] max-w-md overflow-y-auto">
		<DialogHeader>
			<DialogTitle>{m.edit_user_dialog_title()}</DialogTitle>
			<DialogDescription>
				{#if user}
					{m.edit_user_dialog_description({
						name: user.name || user.username,
						username: user.username,
					})}
				{/if}
			</DialogDescription>
		</DialogHeader>

		{#if user}
			<form onsubmit={handleSubmit} class="space-y-4">
				<!-- Grants Selection -->
				<div class="space-y-3">
					<Label>{m.edit_user_dialog_permissions_label()}</Label>
					<div class="space-y-2">
						{#each availableGrants as grant (grant.key)}
							<div class="flex items-center space-x-2">
								<Checkbox
									id={grant.key}
									checked={selectedGrants.includes(grant.key)}
									onCheckedChange={(checked) => handleGrantChange(grant.key, checked)}
									disabled={isSubmitting} />
								<Label
									for={grant.key}
									class="flex flex-col items-start gap-0.5 text-left text-sm font-normal">
									<span class="font-medium">{grant.name}</span>
									<span class="block text-xs text-gray-500">{grant.description}</span>
								</Label>
							</div>
						{/each}
					</div>
					{#if selectedGrants.length === 0}
						<p class="text-sm text-gray-500">{m.edit_user_dialog_no_permissions()}</p>
					{/if}
				</div>

				<!-- System Prompt Section -->
				{#if showSystemPromptTextarea}
					<div class="space-y-2">
						<Label for="systemPrompt">{m.edit_user_dialog_system_prompt_label()}</Label>
						<Textarea
							id="systemPrompt"
							bind:value={systemPrompt}
							placeholder={m.edit_user_dialog_system_prompt_placeholder()}
							rows={4}
							disabled={isSubmitting}
							class="resize-none" />
						<p class="text-xs text-gray-500">
							{m.edit_user_dialog_system_prompt_description()}
						</p>
					</div>
				{/if}

				<DialogFooter>
					<Button type="button" variant="outline" onclick={handleClose} disabled={isSubmitting}>
						{m.edit_user_dialog_cancel()}
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{#if isSubmitting}
							{m.edit_user_dialog_saving()}
						{:else}
							{m.edit_user_dialog_save()}
						{/if}
					</Button>
				</DialogFooter>
			</form>
		{/if}
	</DialogContent>
</Dialog>
