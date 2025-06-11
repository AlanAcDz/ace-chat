<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Form from '$lib/components/ui/form';
	import { Input, PasswordInput } from '$lib/components/ui/input';
	import { loginSchema } from './schema';

	let { data }: { data: PageData } = $props();

	// Login form
	const form = superForm(data.form, {
		validators: zodClient(loginSchema),
		onResult: ({ result }) => {
			if (result.type === 'failure' && result.data?.form?.message) {
				toast.error(result.data.form.message);
			}
		},
	});

	const { form: formData, enhance, submitting } = form;
</script>

<svelte:head>
	<title>Iniciar Sesión | AceChat</title>
</svelte:head>

<Card.Header>
	<Card.Title class="text-center">Iniciar Sesión</Card.Title>
	<Card.Description class="text-center">Introduce tus credenciales para acceder</Card.Description>
</Card.Header>

<Card.Content>
	<form method="POST" use:enhance class="space-y-4">
		<Form.Field {form} name="username">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Nombre de usuario</Form.Label>
					<Input
						{...props}
						type="text"
						placeholder="johndoe"
						bind:value={$formData.username}
						disabled={$submitting} />
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field {form} name="password">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Contraseña</Form.Label>
					<PasswordInput
						{...props}
						placeholder="••••••••"
						bind:value={$formData.password}
						disabled={$submitting} />
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Button type="submit" class="w-full" disabled={$submitting}>
			{$submitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
		</Button>
	</form>
</Card.Content>

<Card.Footer>
	<div class="w-full text-center">
		<p class="text-sm text-muted-foreground">
			¿No tienes una cuenta?
			<a href="/signup" class="ml-1 font-medium text-primary underline-offset-4 hover:underline">
				Regístrate
			</a>
		</p>
	</div>
</Card.Footer>
