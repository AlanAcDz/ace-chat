<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';

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
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { USER_GRANTS } from '$lib/grants';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		open: boolean;
		onOpenChange: (open: boolean) => void;
	}

	let { open = $bindable(), onOpenChange }: Props = $props();

	// Transform USER_GRANTS into the format needed for the component
	const availableGrants = Object.entries(USER_GRANTS).map(([key, value]) => ({
		key,
		name: key.replace(/:/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
		description: value.description(),
	}));

	let isSubmitting = $state(false);
	let formData = $state({
		username: '',
		grants: [] as string[],
	});

	let errors = $state<Record<string, string[]>>({});

	// Handle form submission
	async function handleSubmit(event: Event) {
		event.preventDefault();
		isSubmitting = true;
		errors = {};

		// Basic validation
		if (!formData.username.trim()) {
			errors.username = [m.invite_dialog_username_required()];
			isSubmitting = false;
			return;
		}

		if (formData.username.length < 3) {
			errors.username = [m.invite_dialog_username_min_length()];
			isSubmitting = false;
			return;
		}

		const form = new FormData();
		form.append('username', formData.username);
		formData.grants.forEach((grant) => {
			form.append('grants', grant);
		});

		const response = await fetch('?/createInvite', {
			method: 'POST',
			body: form,
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success') {
			toast.success(m.invite_dialog_success());
			await invalidate('app:users');
			onOpenChange(false);
			resetForm();
		} else if (result.type === 'failure') {
			errors = result.data?.errors || {};
			if (result.data?.errors?._form) {
				toast.error(result.data.errors._form[0]);
			}
		} else {
			toast.error(m.invite_dialog_error());
		}

		applyAction(result);
		isSubmitting = false;
	}

	// Reset form
	function resetForm() {
		formData.username = '';
		formData.grants = [];
		errors = {};
	}

	// Handle dialog close
	function handleClose() {
		if (!isSubmitting) {
			onOpenChange(false);
			resetForm();
		}
	}

	// Handle grant selection
	function handleGrantChange(grant: string, checked: boolean) {
		if (checked) {
			formData.grants = [...formData.grants, grant];
		} else {
			formData.grants = formData.grants.filter((g) => g !== grant);
		}
	}
</script>

<Dialog {open} onOpenChange={handleClose}>
	<DialogContent class="max-w-md">
		<DialogHeader>
			<DialogTitle>{m.invite_dialog_title()}</DialogTitle>
			<DialogDescription>
				{m.invite_dialog_description()}
			</DialogDescription>
		</DialogHeader>

		<form onsubmit={handleSubmit} class="space-y-4">
			<!-- Username Input -->
			<div class="space-y-2">
				<Label for="username">{m.invite_dialog_username_label()}</Label>
				<Input
					id="username"
					type="text"
					bind:value={formData.username}
					placeholder={m.invite_dialog_username_placeholder()}
					class={errors.username ? 'border-red-500' : ''}
					disabled={isSubmitting}
					required />
				{#if errors.username}
					<p class="text-sm text-red-500">{errors.username[0]}</p>
				{/if}
			</div>

			<Separator />

			<!-- Grants Selection -->
			<div class="space-y-3">
				<Label>{m.invite_dialog_permissions_label()}</Label>
				<div class="space-y-2">
					{#each availableGrants as grant (grant.key)}
						<div class="flex items-center space-x-2">
							<Checkbox
								id={grant.key}
								checked={formData.grants.includes(grant.key)}
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
				{#if formData.grants.length === 0}
					<p class="text-sm text-gray-500">{m.invite_dialog_no_permissions_warning()}</p>
				{/if}
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onclick={handleClose} disabled={isSubmitting}>
					{m.invite_dialog_cancel()}
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}
						{m.invite_dialog_creating()}
					{:else}
						{m.invite_dialog_create()}
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
