<script lang="ts">
	import { Server, Zap } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import type { SubmitFunction } from './$types';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { AI_MODELS } from '$lib/ai/models';
	import AnthropicIcon from '$lib/components/icons/anthropic-icon.svelte';
	import GoogleIcon from '$lib/components/icons/google-icon.svelte';
	import OpenaiIcon from '$lib/components/icons/openai-icon.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { TabsContent } from '$lib/components/ui/tabs';

	let { data } = $props();

	// Custom submit function for both form types
	const submitFunction: SubmitFunction = () => {
		return async ({ result }) => {
			if (result.type === 'success' && result.data) {
				toast.success(result.data.message || 'Guardado exitosamente');
				await invalidate('app:api-keys');
			} else if (result.type === 'failure' && result.data) {
				toast.error(result.data.error || 'Error al guardar');
			} else {
				toast.error('Error inesperado');
			}
		};
	};

	// Agrupar modelos por proveedor
	const modelsByProvider = AI_MODELS.reduce(
		(acc, model) => {
			if (!acc[model.provider]) {
				acc[model.provider] = [];
			}
			acc[model.provider].push(model);
			return acc;
		},
		{} as Record<string, Array<(typeof AI_MODELS)[number]>>
	);

	// Configuraciones de proveedores con claves API
	const apiKeyProviders = [
		{
			key: 'anthropic',
			name: 'Clave API de Anthropic',
			placeholder: 'sk-ant-...',
			description: 'Obtén tu clave API desde',
			link: 'Consola de Anthropic',
			linkUrl: 'https://console.anthropic.com/account/keys',
			icon: AnthropicIcon,
			models: modelsByProvider.anthropic || [],
		},
		{
			key: 'openai',
			name: 'Clave API de OpenAI',
			placeholder: 'sk-...',
			description: 'Obtén tu clave API desde',
			link: 'Panel de OpenAI',
			linkUrl: 'https://platform.openai.com/api-keys',
			icon: OpenaiIcon,
			models: modelsByProvider.openai || [],
		},
		{
			key: 'google',
			name: 'Clave API de Google',
			placeholder: 'AIza...',
			description: 'Obtén tu clave API desde',
			link: 'Consola de Google Cloud',
			linkUrl: 'https://console.cloud.google.com/apis/credentials',
			icon: GoogleIcon,
			models: modelsByProvider.google || [],
		},
	];

	// Configuraciones de proveedores con URLs
	const urlProviders = [
		{
			key: 'lmstudio',
			name: 'URL de LM Studio',
			placeholder: 'http://localhost:1234/v1',
			description: 'Configura la URL de tu servidor LM Studio',
			icon: Server,
		},
		{
			key: 'ollama',
			name: 'URL de Ollama',
			placeholder: 'http://localhost:11434',
			description: 'Configura la URL de tu servidor Ollama',
			icon: Zap,
		},
	];

	// Helper function to get placeholder text for API key inputs
	function getApiKeyPlaceholder(provider: (typeof apiKeyProviders)[0]) {
		const apiKeyData = data.apiKeys[provider.key];
		if (apiKeyData?.hasApiKey) {
			return 'Clave configurada - ingresa nueva clave para actualizar';
		}
		return provider.placeholder;
	}

	// Helper function to determine if we should show the "configured" status
	function isApiKeyConfigured(providerKey: string) {
		return data.apiKeys[providerKey]?.hasApiKey || false;
	}
</script>

<TabsContent value="api-keys" class="space-y-6">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestionar Claves API</h1>
	<div class="space-y-6">
		<!-- Proveedores de Claves API -->
		{#each apiKeyProviders as provider (provider.key)}
			{#if provider.models.length > 0}
				{@const IconComponent = provider.icon}
				<div
					class="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
					<div class="mb-4 flex items-center gap-2">
						<IconComponent class="h-5 w-5" />
						<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
							{provider.name}
						</h3>
						{#if isApiKeyConfigured(provider.key)}
							<span
								class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
								Configurada
							</span>
						{/if}
					</div>

					<p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
						Usado para los siguientes modelos:
					</p>
					<div class="mb-4 flex flex-wrap gap-2">
						{#each provider.models as model (model.key)}
							<span class="rounded-full bg-gray-700 px-3 py-1 text-xs text-white">
								{model.label}
							</span>
						{/each}
					</div>

					<form method="POST" action="?/saveApiKey" use:enhance={submitFunction}>
						<input type="hidden" name="provider" value={provider.key} />
						<div class="flex gap-3">
							<Input
								name="apiKey"
								placeholder={getApiKeyPlaceholder(provider)}
								value=""
								class="flex-1 font-mono text-sm"
								type="password" />
							<Button type="submit">
								{isApiKeyConfigured(provider.key) ? 'Actualizar' : 'Guardar'}
							</Button>
						</div>
					</form>

					<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
						{provider.description}
						<a
							href={provider.linkUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
							{provider.link}
						</a>
					</p>
				</div>
			{/if}
		{/each}

		<!-- Proveedores de URLs -->
		{#each urlProviders as provider (provider.key)}
			{@const IconComponent = provider.icon}
			<div
				class="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
				<div class="mb-4 flex items-center gap-2">
					<IconComponent class="h-5 w-5" />
					<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
						{provider.name}
					</h3>
					{#if data.apiKeys[provider.key]?.url}
						<span
							class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
							Configurada
						</span>
					{/if}
				</div>

				<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">{provider.description}</p>

				<form method="POST" action="?/saveApiUrl" use:enhance={submitFunction}>
					<input type="hidden" name="provider" value={provider.key} />
					<div class="flex gap-3">
						<Input
							name="apiUrl"
							placeholder={provider.placeholder}
							value={data.apiKeys[provider.key]?.url || ''}
							class="flex-1 font-mono text-sm" />
						<Button type="submit">
							{data.apiKeys[provider.key]?.url ? 'Actualizar' : 'Guardar'}
						</Button>
					</div>
				</form>
			</div>
		{/each}
	</div>
</TabsContent>
