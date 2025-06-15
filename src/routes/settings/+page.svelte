<script lang="ts">
	import { User } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	import type { PageData } from './$types';
	import { invalidate } from '$app/navigation';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { TabsContent } from '$lib/components/ui/tabs';
	import { Textarea } from '$lib/components/ui/textarea';
	import { m } from '$lib/paraglide/messages.js';
	import { getUserInitials } from '$lib/utils';
	import { profileSchema } from './schema';

	let { data }: { data: PageData } = $props();

	// Profile form
	const form = superForm(data.form, {
		validators: zodClient(profileSchema),
		onResult: ({ result }) => {
			if (result.type === 'success' && result.data?.form?.message) {
				toast.success(result.data.form.message);
				invalidate('app:user');
			} else if (result.type === 'failure' && result.data?.form?.message) {
				toast.error(result.data.form.message);
			}
		},
	});

	const { form: formData, enhance, submitting } = form;

	// Avatar upload state
	let avatarFile: File | null = $state(null);
	let avatarPreview: string | null = $state(null);
	let fileInput: HTMLInputElement | null = $state(null);

	function handleAvatarUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			// Validate file type
			if (!file.type.startsWith('image/')) {
				toast.error(m.settings_profile_avatar_error_type());
				return;
			}

			// Validate file size (max 5MB)
			if (file.size > 5 * 1024 * 1024) {
				toast.error(m.settings_profile_avatar_error_size());
				return;
			}

			avatarFile = file;

			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				avatarPreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	function removeAvatar() {
		avatarFile = null;
		avatarPreview = null;
		if (fileInput) {
			fileInput.value = '';
		}
	}
</script>

<TabsContent value="profile" class="space-y-6">
	<h1 class="text-2xl font-bold">{m.settings_profile_title()}</h1>
	<form
		method="POST"
		action="?/updateProfile"
		use:enhance
		enctype="multipart/form-data"
		class="space-y-6">
		<!-- Avatar Upload Section -->
		<div class="space-y-4">
			<div class="flex items-center gap-4">
				<Avatar class="h-20 w-20">
					<AvatarImage
						src={avatarPreview || data.user.avatarUrl}
						alt={data.user.name || data.user.username} />
					<AvatarFallback class="text-lg">
						{getUserInitials(data.user.name, data.user.username)}
					</AvatarFallback>
				</Avatar>
				<div class="flex flex-col gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => fileInput?.click()}
						disabled={$submitting}>
						<User class="mr-2 h-4 w-4" />
						{avatarFile ? m.settings_profile_avatar_change() : m.settings_profile_avatar_upload()}
					</Button>
					{#if avatarFile}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={removeAvatar}
							disabled={$submitting}>
							{m.settings_profile_avatar_remove()}
						</Button>
					{/if}
				</div>
			</div>
			<p class="text-sm text-muted-foreground">{m.settings_profile_avatar_description()}</p>
			<input
				bind:this={fileInput}
				type="file"
				name="avatar"
				accept="image/*"
				onchange={handleAvatarUpload}
				class="hidden"
				disabled={$submitting} />
		</div>

		<Form.Field {form} name="username">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>{m.settings_profile_username_label()}</Form.Label>
					<Input
						{...props}
						type="text"
						placeholder={m.settings_profile_username_placeholder()}
						bind:value={$formData.username}
						disabled={$submitting} />
					<Form.Description>{m.settings_profile_username_description()}</Form.Description>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field {form} name="name">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>{m.settings_profile_name_label()}</Form.Label>
					<Input
						{...props}
						type="text"
						placeholder={m.settings_profile_name_placeholder()}
						bind:value={$formData.name}
						disabled={$submitting} />
					<Form.Description>
						{m.settings_profile_name_description()}
					</Form.Description>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		{#if data.canUpdateSystemPrompt}
			<Form.Field {form} name="defaultSystemPrompt">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.settings_profile_system_prompt_label()}</Form.Label>
						<Textarea
							{...props}
							placeholder={m.settings_profile_system_prompt_placeholder()}
							class="min-h-24"
							bind:value={$formData.defaultSystemPrompt}
							disabled={$submitting} />
						<Form.Description>
							{m.settings_profile_system_prompt_description()}
						</Form.Description>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		{/if}

		<Button type="submit" disabled={$submitting}>
			{$submitting ? m.settings_profile_submit_saving() : m.settings_profile_submit()}
		</Button>
	</form>
</TabsContent>
