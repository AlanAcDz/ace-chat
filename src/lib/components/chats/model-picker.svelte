<script lang="ts">
	import { tick } from 'svelte';
	import {
		Bot,
		Brain,
		Check,
		ChevronsUpDown,
		Globe,
		Image as ImageIcon,
		Text,
	} from '@lucide/svelte';
	import { createQuery } from '@tanstack/svelte-query';

	import type { AIModel } from '$lib/ai/models.js';
	import AnthropicIcon from '$lib/components/icons/anthropic-icon.svelte';
	import GoogleIcon from '$lib/components/icons/google-icon.svelte';
	import LMStudioIcon from '$lib/components/icons/lmstudio-icon.svelte';
	import OllamaIcon from '$lib/components/icons/ollama-icon.svelte';
	import OpenAIIcon from '$lib/components/icons/openai-icon.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { m } from '$lib/paraglide/messages.js';
	import { cn } from '$lib/utils.js';

	interface LocalModel {
		id: string;
		label: string;
		provider: 'lmstudio' | 'ollama';
		key: string;
		capabilities: string[];
	}

	interface ModelsResponse {
		models: AIModel[];
		localModels: LocalModel[];
	}

	interface Props {
		value?: AIModel['key'] | string;
		onSelect?: (modelKey: AIModel['key'] | string) => void;
		class?: string;
		size?: 'sm' | 'default';
	}

	let { value, onSelect, class: className, size = 'sm' }: Props = $props();

	let open = $state(false);
	let triggerRef = $state<HTMLButtonElement>(null!);

	// Fetch available models using svelte-query
	const modelsQuery = createQuery({
		queryKey: ['available-models'],
		queryFn: async () => {
			const response = await fetch('/api/models/available');
			if (!response.ok) {
				throw new Error('Failed to fetch available models');
			}
			const data = (await response.json()) as ModelsResponse;
			return data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});

	// Combine static and local models
	const allModels = $derived(() => {
		const data = $modelsQuery.data;
		if (!data) return [];
		return [...data.models, ...data.localModels];
	});

	const selectedModel = $derived(() => {
		const models = allModels();
		return models.find((model) => model.key === value);
	});

	// Auto-select first available model if current selection is not available
	$effect(() => {
		const models = allModels();
		if (models.length > 0) {
			if (!value || !models.some((model) => model.key === value)) {
				// No model selected or current model is not available, select the first available one
				const firstAvailableModel = models[0];
				if (firstAvailableModel) {
					value = firstAvailableModel.key;
					onSelect?.(firstAvailableModel.key);
				}
			}
		}
	});

	// We want to refocus the trigger button when the user selects
	// an item from the list so users can continue navigating the
	// rest of the form with the keyboard.
	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef.focus();
		});
	}

	function handleSelect(modelKey: AIModel['key'] | string) {
		value = modelKey;
		onSelect?.(modelKey);
		closeAndFocusTrigger();
	}

	function getProviderIcon(provider: string) {
		switch (provider) {
			case 'anthropic':
				return AnthropicIcon;
			case 'openai':
				return OpenAIIcon;
			case 'google':
				return GoogleIcon;
			case 'lmstudio':
				return LMStudioIcon;
			case 'ollama':
				return OllamaIcon;
			default:
				return GoogleIcon;
		}
	}

	function getCapabilityIcon(capability: string) {
		switch (capability) {
			case 'text':
				return Text;
			case 'tools':
				return Globe;
			case 'thinking':
				return Brain;
			case 'image':
				return ImageIcon;
			default:
				return Text;
		}
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				variant="outline"
				{size}
				class={cn('justify-between gap-2', size === 'sm' ? 'text-xs' : '', className)}
				{...props}
				role="combobox"
				aria-expanded={open}>
				<div class="flex min-w-0 items-center gap-2">
					{#if selectedModel()}
						{@const model = selectedModel()!}
						{@const ProviderIcon = getProviderIcon(model.provider)}
						<ProviderIcon class={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
					{:else}
						<Bot class={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
					{/if}
					<span class="truncate text-xs">
						{selectedModel()?.label || m.model_picker_placeholder()}
					</span>
				</div>
				<ChevronsUpDown class={cn('shrink-0 opacity-50', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-80 p-0">
		<Command.Root>
			<Command.Input placeholder={m.model_picker_search_placeholder()} />
			<Command.List>
				<Command.Empty>{m.model_picker_not_found()}</Command.Empty>
				<Command.Group>
					{#each allModels() as model (model.key)}
						{@const ProviderIcon = getProviderIcon(model.provider)}
						<Command.Item
							value={model.key}
							onSelect={() => handleSelect(model.key)}
							class="flex items-center gap-3">
							<Check class={cn('h-4 w-4', value !== model.key && 'text-transparent')} />
							<div class="flex flex-1 items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<ProviderIcon class="h-4 w-4" />
									<span class="font-medium">{model.label}</span>
								</div>
								<div class="flex gap-1">
									{#each model.capabilities as capability (capability)}
										{@const CapabilityIcon = getCapabilityIcon(capability)}
										<div class="flex items-center gap-1 rounded bg-secondary px-2 py-1">
											<CapabilityIcon class="h-3 w-3 text-gray-600 dark:text-gray-400" />
										</div>
									{/each}
								</div>
							</div>
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
