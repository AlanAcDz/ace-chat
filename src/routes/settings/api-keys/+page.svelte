<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';
	import { Server, Zap } from '@lucide/svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';

	import type { SubmitFunction } from './$types';
	import type { UserGrant } from '$lib/grants';
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { AI_MODELS } from '$lib/ai/models';
	import AnthropicIcon from '$lib/components/icons/anthropic-icon.svelte';
	import GoogleIcon from '$lib/components/icons/google-icon.svelte';
	import OpenaiIcon from '$lib/components/icons/openai-icon.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { TabsContent } from '$lib/components/ui/tabs';
	import { hasGrant } from '$lib/grants';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	// Get query client for invalidating cache
	const queryClient = useQueryClient();

	// Helper function to check if user has permission for shared API keys
	function canCreateSharedKeys(): boolean {
		return hasGrant(data.userGrants as UserGrant[], 'api-keys:create:shared');
	}

	// Initialize scope states to false (personal) for all providers
	// We need to do this after the providers are defined, so we'll move this after the provider definitions

	// Custom submit function for both form types
	const submitFunction: SubmitFunction = () => {
		return async ({ result }) => {
			if (result.type === 'success' && result.data) {
				toast.success(result.data.message || m.settings_api_keys_save_success());
				await invalidate('app:api-keys');
				// Also invalidate the available models query so model picker updates
				queryClient.invalidateQueries({ queryKey: ['available-models'] });
			} else if (result.type === 'failure' && result.data) {
				toast.error(result.data.error || m.settings_api_keys_save_error());
			} else {
				toast.error(m.settings_api_keys_unexpected_error());
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
			name: m.settings_api_keys_anthropic(),
			placeholder: 'sk-ant-...',
			description: m.settings_api_keys_anthropic_description(),
			link: m.settings_api_keys_anthropic_link(),
			linkUrl: 'https://console.anthropic.com/account/keys',
			icon: AnthropicIcon,
			models: modelsByProvider.anthropic || [],
		},
		{
			key: 'openai',
			name: m.settings_api_keys_openai(),
			placeholder: 'sk-...',
			description: m.settings_api_keys_openai_description(),
			link: m.settings_api_keys_openai_link(),
			linkUrl: 'https://platform.openai.com/api-keys',
			icon: OpenaiIcon,
			models: modelsByProvider.openai || [],
		},
		{
			key: 'google',
			name: m.settings_api_keys_google(),
			placeholder: 'AIza...',
			description: m.settings_api_keys_google_description(),
			link: m.settings_api_keys_google_link(),
			linkUrl: 'https://console.cloud.google.com/apis/credentials',
			icon: GoogleIcon,
			models: modelsByProvider.google || [],
		},
	];

	// Configuraciones de proveedores con URLs
	const urlProviders = [
		{
			key: 'lmstudio',
			name: m.settings_api_keys_lmstudio(),
			placeholder: 'http://localhost:1234/v1',
			description: m.settings_api_keys_lmstudio_description(),
			icon: Server,
		},
		{
			key: 'ollama',
			name: m.settings_api_keys_ollama(),
			placeholder: 'http://localhost:11434',
			description: m.settings_api_keys_ollama_description(),
			icon: Zap,
		},
	];

	// Track scope state for each provider - initialize with current scope from database
	let scopeStates: Record<string, boolean> = $state(
		(() => {
			const initialStates: Record<string, boolean> = {};
			[...apiKeyProviders, ...urlProviders].forEach((provider) => {
				// Set to current scope from database, default to personal (false) if not found
				const currentScope = data.apiKeys[provider.key]?.scope || 'personal';
				initialStates[provider.key] = currentScope === 'shared';
			});
			return initialStates;
		})()
	);

	// Function to handle scope updates
	async function handleScopeUpdate(providerKey: string, newScope: boolean) {
		// If there's an existing API key/URL, update the scope immediately
		if (data.apiKeys[providerKey]) {
			const formData = new FormData();
			formData.append('provider', providerKey);
			formData.append('scope', newScope ? 'shared' : 'personal');

			try {
				const response = await fetch('?/updateScope', {
					method: 'POST',
					body: formData,
				});

				const result: ActionResult = deserialize(await response.text());

				if (result.type === 'success') {
					toast.success(result.data?.message || m.settings_api_keys_scope_update_success());
					await invalidate('app:api-keys');
					// Also invalidate the available models query so model picker updates
					queryClient.invalidateQueries({ queryKey: ['available-models'] });
				} else if (result.type === 'failure') {
					toast.error(result.data?.error || m.settings_api_keys_scope_update_error());
					// Revert the switch state
					scopeStates[providerKey] = !newScope;
				}

				applyAction(result);
			} catch (error) {
				console.error('Error updating scope:', error);
				toast.error(m.settings_api_keys_scope_update_error());
				// Revert the switch state
				scopeStates[providerKey] = !newScope;
			}
		}
		// If no existing API key/URL, just update the local state
		// The scope will be used when the user saves their API key/URL
	}

	// Helper function to get placeholder text for API key inputs
	function getApiKeyPlaceholder(provider: (typeof apiKeyProviders)[0]) {
		const apiKeyData = data.apiKeys[provider.key];
		if (apiKeyData?.hasApiKey) {
			return m.settings_api_keys_placeholder_configured();
		}
		return provider.placeholder;
	}

	// Helper function to determine if we should show the "configured" status
	function isApiKeyConfigured(providerKey: string) {
		return data.apiKeys[providerKey]?.hasApiKey || false;
	}
</script>

<TabsContent value="api-keys" class="space-y-6">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{m.settings_api_keys_title()}</h1>
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
								{m.settings_api_keys_configured()}
							</span>
							{#if data.apiKeys[provider.key]?.scope === 'shared'}
								<span
									class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
									{m.settings_api_keys_shared()}
								</span>
							{:else}
								<span
									class="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-900 dark:text-gray-200">
									{m.settings_api_keys_personal()}
								</span>
							{/if}
						{/if}
					</div>

					<p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
						{m.settings_api_keys_used_for_models()}
					</p>
					<div class="mb-4 flex flex-wrap gap-2">
						{#each provider.models as model (model.key)}
							<Badge>
								{model.label}
							</Badge>
						{/each}
					</div>

					<form method="POST" action="?/saveApiKey" use:enhance={submitFunction}>
						<input type="hidden" name="provider" value={provider.key} />
						<input
							type="hidden"
							name="scope"
							value={scopeStates[provider.key] ? 'shared' : 'personal'} />

						<div class="space-y-4">
							{#if canCreateSharedKeys()}
								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<label
											class="text-sm font-medium text-gray-700 dark:text-gray-300"
											for="scope-{provider.key}">
											{m.settings_api_keys_shared_api_key()}
										</label>
										<p class="text-xs text-gray-500 dark:text-gray-400">
											{m.settings_api_keys_shared_api_key_description()}
										</p>
									</div>
									<Switch
										bind:checked={scopeStates[provider.key]}
										id="scope-{provider.key}"
										onCheckedChange={(checked) => handleScopeUpdate(provider.key, checked)} />
								</div>
							{/if}

							<div class="flex gap-3">
								<Input
									name="apiKey"
									placeholder={getApiKeyPlaceholder(provider)}
									value=""
									class="flex-1 font-mono text-sm"
									type="password" />
								<Button type="submit">
									{isApiKeyConfigured(provider.key)
										? m.settings_api_keys_update()
										: m.settings_api_keys_save()}
								</Button>
							</div>
						</div>
					</form>

					<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
						{provider.description}
						<a
							href={provider.linkUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="text-primary hover:text-primary/80">
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
							{m.settings_api_keys_configured()}
						</span>
						{#if data.apiKeys[provider.key]?.scope === 'shared'}
							<span
								class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
								{m.settings_api_keys_shared()}
							</span>
						{:else}
							<span
								class="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-900 dark:text-gray-200">
								{m.settings_api_keys_personal()}
							</span>
						{/if}
					{/if}
				</div>

				<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">{provider.description}</p>

				<form method="POST" action="?/saveApiUrl" use:enhance={submitFunction}>
					<input type="hidden" name="provider" value={provider.key} />
					<input
						type="hidden"
						name="scope"
						value={scopeStates[provider.key] ? 'shared' : 'personal'} />

					<div class="space-y-4">
						{#if canCreateSharedKeys()}
							<div class="flex items-center justify-between">
								<div class="space-y-0.5">
									<label
										class="text-sm font-medium text-gray-700 dark:text-gray-300"
										for="scope-url-{provider.key}">
										{m.settings_api_keys_shared_url()}
									</label>
									<p class="text-xs text-gray-500 dark:text-gray-400">
										{m.settings_api_keys_shared_url_description()}
									</p>
								</div>
								<Switch
									bind:checked={scopeStates[provider.key]}
									id="scope-url-{provider.key}"
									onCheckedChange={(checked) => handleScopeUpdate(provider.key, checked)} />
							</div>
						{/if}

						<div class="flex gap-3">
							<Input
								name="apiUrl"
								placeholder={provider.placeholder}
								value={data.apiKeys[provider.key]?.url || ''}
								class="flex-1 font-mono text-sm" />
							<Button type="submit">
								{data.apiKeys[provider.key]?.url
									? m.settings_api_keys_update()
									: m.settings_api_keys_save()}
							</Button>
						</div>
					</div>
				</form>
			</div>
		{/each}
	</div>
</TabsContent>
