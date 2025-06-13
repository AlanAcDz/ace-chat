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
	<title>Registrarse | AceChat</title>
</svelte:head>

<Card.Header>
	<Card.Title class="text-center">
		{#if data.requiresInvite}
			Registro Restringido
		{:else if data.invite}
			¡Bienvenido! Completa tu registro
		{:else if data.isFirstUser}
			¡Bienvenido! Configura el sistema
		{:else}
			Registrarse
		{/if}
	</Card.Title>
	<Card.Description class="text-center">
		{#if data.requiresInvite}
			El registro está restringido solo a usuarios invitados
		{:else if data.invite}
			Has sido invitado por {data.invite.invitedBy.name || data.invite.invitedBy.username} para unirte
			al sistema
		{:else if data.isFirstUser}
			Eres el primer usuario. Configura tu cuenta de administrador
		{:else}
			Completa el formulario para crear tu cuenta
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
					<p class="font-medium">Se requiere una invitación</p>
					<p class="text-sm">
						Para registrarte en este sistema necesitas una invitación válida. Contacta con un
						administrador para obtener un enlace de invitación.
					</p>
				</div>
			</AlertDescription>
		</Alert>
	{:else if data.invite}
		<!-- Invite Information -->
		<Alert class="mb-4 border-blue-200 bg-blue-50">
			<Mail class="h-4 w-4 text-blue-600" />
			<AlertDescription class="text-blue-800">
				<p class="font-medium">Invitación activa para: @{data.invite.username}</p>
			</AlertDescription>
		</Alert>
	{:else if data.isFirstUser}
		<!-- First User Message -->
		<Alert class="mb-4 border-green-200 bg-green-50">
			<Mail class="h-4 w-4 text-green-600" />
			<AlertDescription class="text-green-800">
				<div class="space-y-2">
					<p class="font-medium">¡Bienvenido al sistema!</p>
					<p class="text-sm">
						Eres el primer usuario. Tu cuenta tendrá permisos de administrador completos.
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
				<Label>Nombre de usuario</Label>
				<Input
					type="text"
					value={data.invite.username}
					disabled
					readonly
					class="cursor-not-allowed bg-gray-50" />
				<p class="text-sm text-gray-600">El nombre de usuario está predefinido por la invitación</p>
			</div>
		{:else}
			<Form.Field {form} name="username">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Nombre de usuario</Form.Label>
						<Input
							{...props}
							type="text"
							placeholder="johndoe"
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
					<Form.Label>Contraseña</Form.Label>
					<PasswordInput
						{...props}
						placeholder="••••••••"
						bind:value={$formData.password}
						disabled={$submitting || data.requiresInvite} />
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field {form} name="confirmPassword">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Confirmar contraseña</Form.Label>
					<PasswordInput
						{...props}
						placeholder="••••••••"
						bind:value={$formData.confirmPassword}
						disabled={$submitting || data.requiresInvite} />
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Button type="submit" class="w-full" disabled={$submitting || data.requiresInvite}>
			{#if $submitting}
				Creando cuenta...
			{:else if data.requiresInvite}
				Invitación Requerida
			{:else if data.invite}
				Completar Registro
			{:else}
				Crear Cuenta
			{/if}
		</Button>
	</form>
</Card.Content>

<Card.Footer>
	<div class="w-full text-center">
		<p class="text-sm text-muted-foreground">
			¿Ya tienes una cuenta?
			<a href="/login" class="ml-1 font-medium text-primary underline-offset-4 hover:underline">
				Inicia sesión
			</a>
		</p>
	</div>
</Card.Footer>
