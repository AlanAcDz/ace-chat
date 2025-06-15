<script lang="ts">
	import { onMount } from 'svelte';
	import { Mail } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	import type { PageData } from './$types';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Form from '$lib/components/ui/form';
	import { Input, PasswordInput } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { m } from '$lib/paraglide/messages.js';
	import { registerSchema } from './schema';

	let { data }: { data: PageData } = $props();

	// Register form
	const form = superForm(data.form, {
		validators: zodClient(registerSchema),
		onResult: ({ result }) => {
			if (result.type === 'failure' && result.data?.form?.message) {
				toast.error(result.data.form.message);
			}
		},
	});

	const { form: formData, enhance, submitting } = form;

	// Pre-fill username if coming from invite
	onMount(() => {
		if (data.invite) {
			$formData.username = data.invite.username;
		}
	});
</script>

<svelte:head>
	<title>{m.auth_signup_title()}</title>
</svelte:head>

<Card.Header>
	<Card.Title class="text-center">
		{#if data.requiresInvite}
			{m.auth_signup_header_restricted()}
		{:else if data.invite}
			{m.auth_signup_header_invite()}
		{:else if data.isFirstUser}
			{m.auth_signup_header_first_user()}
		{:else}
			{m.auth_signup_header_default()}
		{/if}
	</Card.Title>
	<Card.Description class="text-center">
		{#if data.requiresInvite}
			{m.auth_signup_description_restricted()}
		{:else if data.invite}
			{m.auth_signup_description_invite({
				inviterName: data.invite.invitedBy.name || data.invite.invitedBy.username,
			})}
		{:else if data.isFirstUser}
			{m.auth_signup_description_first_user()}
		{:else}
			{m.auth_signup_description_default()}
		{/if}
	</Card.Description>
</Card.Header>

<Card.Content>
	{#if data.requiresInvite}
		<!-- No Invite Required Message -->
		<Alert class="mb-4 border-red-200 bg-red-50">
			<Mail class="h-4 w-4 text-red-600" />
			<AlertDescription class="text-red-800">
				<div class="space-y-2">
					<p class="font-medium">{m.auth_signup_invite_required_title()}</p>
					<p class="text-sm">
						{m.auth_signup_invite_required_description()}
					</p>
				</div>
			</AlertDescription>
		</Alert>
	{:else if data.invite}
		<!-- Invite Information -->
		<Alert class="mb-4 border-blue-200 bg-blue-50">
			<Mail class="h-4 w-4 text-blue-600" />
			<AlertDescription class="text-blue-800">
				<p class="font-medium">{m.auth_signup_invite_active({ username: data.invite.username })}</p>
			</AlertDescription>
		</Alert>
	{:else if data.isFirstUser}
		<!-- First User Message -->
		<Alert class="mb-4 border-green-200 bg-green-50">
			<Mail class="h-4 w-4 text-green-600" />
			<AlertDescription class="text-green-800">
				<div class="space-y-2">
					<p class="font-medium">{m.auth_signup_first_user_title()}</p>
					<p class="text-sm">
						{m.auth_signup_first_user_description()}
					</p>
				</div>
			</AlertDescription>
		</Alert>
	{/if}

	<form method="POST" use:enhance class="space-y-4">
		{#if data.invite}
			<!-- Hidden input for invite username -->
			<input type="hidden" name="username" value={data.invite.username} />

			<div class="space-y-2">
				<Label>{m.auth_signup_username_label()}</Label>
				<Input
					type="text"
					value={data.invite.username}
					disabled
					readonly
					class="cursor-not-allowed bg-gray-50" />
				<p class="text-sm text-muted-foreground">{m.auth_signup_username_predefined()}</p>
			</div>
		{:else}
			<Form.Field {form} name="username">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{m.auth_signup_username_label()}</Form.Label>
						<Input
							{...props}
							type="text"
							placeholder={m.auth_signup_username_placeholder()}
							bind:value={$formData.username}
							disabled={$submitting || data.requiresInvite}
							class={data.requiresInvite ? 'cursor-not-allowed bg-gray-50' : ''} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		{/if}

		<Form.Field {form} name="password">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>{m.auth_signup_password_label()}</Form.Label>
					<PasswordInput
						{...props}
						placeholder={m.auth_signup_password_placeholder()}
						bind:value={$formData.password}
						disabled={$submitting || data.requiresInvite} />
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field {form} name="confirmPassword">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>{m.auth_signup_confirm_password_label()}</Form.Label>
					<PasswordInput
						{...props}
						placeholder={m.auth_signup_confirm_password_placeholder()}
						bind:value={$formData.confirmPassword}
						disabled={$submitting || data.requiresInvite} />
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Button type="submit" class="w-full" disabled={$submitting || data.requiresInvite}>
			{#if $submitting}
				{m.auth_signup_submit_creating()}
			{:else if data.requiresInvite}
				{m.auth_signup_submit_invite_required()}
			{:else if data.invite}
				{m.auth_signup_submit_complete()}
			{:else}
				{m.auth_signup_submit_create()}
			{/if}
		</Button>
	</form>
</Card.Content>

<Card.Footer>
	<div class="w-full text-center">
		<p class="text-sm text-muted-foreground">
			{m.auth_signup_have_account()}
			<a href="/login" class="ml-1 font-medium text-primary underline-offset-4 hover:underline">
				{m.auth_signup_login_link()}
			</a>
		</p>
	</div>
</Card.Footer>
