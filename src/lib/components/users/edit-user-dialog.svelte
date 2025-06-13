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
	import { USER_GRANTS } from '$lib/grants';

	interface Props {
		open: boolean;
		user: Omit<User, 'passwordHash' | 'defaultSystemPrompt'> | null;
		onOpenChange: (open: boolean) => void;
	}

	let { open = $bindable(), user, onOpenChange }: Props = $props();

	// Transform USER_GRANTS into the format needed for the component
	const availableGrants = Object.entries(USER_GRANTS).map(([key, value]) => ({
		key,
		name: key.replace(/:/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
		description: value.description,
	}));

	let isSubmitting = $state(false);
	let selectedGrants = $state<string[]>([]);

	// Update selected grants when user changes
	$effect(() => {
		if (user) {
			selectedGrants = [...user.grants];
		} else {
			selectedGrants = [];
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

		const response = await fetch('?/updateUser', {
			method: 'POST',
			body: form,
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success') {
			toast.success('Permisos actualizados correctamente');
			await invalidate('app:users');
			onOpenChange(false);
		} else if (result.type === 'failure') {
			if (result.data?.errors?._form) {
				toast.error(result.data.errors._form[0]);
			}
		} else {
			toast.error('Error al actualizar los permisos');
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
	<DialogContent class="max-w-md">
		<DialogHeader>
			<DialogTitle>Editar Permisos</DialogTitle>
			<DialogDescription>
				{#if user}
					Modifica los permisos para {user.name || user.username} (@{user.username}).
				{/if}
			</DialogDescription>
		</DialogHeader>

		{#if user}
			<form onsubmit={handleSubmit} class="space-y-4">
				<!-- Grants Selection -->
				<div class="space-y-3">
					<Label>Permisos</Label>
					<div class="max-h-48 space-y-2 overflow-y-auto">
						{#each availableGrants as grant (grant.key)}
							<div class="flex items-center space-x-2">
								<Checkbox
									id={grant.key}
									checked={selectedGrants.includes(grant.key)}
									onCheckedChange={(checked) => handleGrantChange(grant.key, checked)}
									disabled={isSubmitting} />
								<Label for={grant.key} class="text-sm font-normal">
									<span class="font-medium">{grant.name}</span>
									<span class="block text-xs text-gray-500">{grant.description}</span>
								</Label>
							</div>
						{/each}
					</div>
					{#if selectedGrants.length === 0}
						<p class="text-sm text-gray-500">El usuario no tendrá permisos asignados.</p>
					{/if}
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onclick={handleClose} disabled={isSubmitting}>
						Cancelar
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{#if isSubmitting}
							Guardando...
						{:else}
							Guardar Cambios
						{/if}
					</Button>
				</DialogFooter>
			</form>
		{/if}
	</DialogContent>
</Dialog>
