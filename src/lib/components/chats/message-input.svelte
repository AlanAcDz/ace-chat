<script lang="ts">
	import { ArrowUp, Globe, Paperclip, X } from '@lucide/svelte';

	import type { AIModel } from '$lib/ai/models.js';
	import { AI_MODELS } from '$lib/ai/models.js';
	import { m } from '$lib/paraglide/messages.js';
	import { Button } from '../ui/button';
	import { createFileAttachmentsHandler } from './file-attachments.svelte';
	import ModelPicker from './model-picker.svelte';

	interface Props {
		isSubmitting?: boolean;
		message?: string;
		isSearchEnabled?: boolean;
		selectedModel?: AIModel['key'] | string;
		onSubmit: (data: {
			message: string;
			model: string;
			isSearchEnabled: boolean;
			files: FileList;
		}) => Promise<void> | void;
		onModelChange?: (model: AIModel['key'] | string) => void;
		onSearchToggle?: () => void;
	}

	let {
		onSubmit,
		isSubmitting = false,
		message = $bindable(''),
		isSearchEnabled = false,
		selectedModel = AI_MODELS[0].key,
		onModelChange,
		onSearchToggle,
	}: Props = $props();

	let fileAttachmentsHandler = createFileAttachmentsHandler();

	async function handleSubmit() {
		if (!message.trim() && fileAttachmentsHandler.attachedFiles.length === 0) return;

		const data = {
			message,
			model: selectedModel,
			isSearchEnabled,
			files: fileAttachmentsHandler.createFileLikeFileList(),
		};

		await onSubmit(data);
		// Clear the form after successful submission
		fileAttachmentsHandler.attachedFiles = [];
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
		}
	}

	function handleModelSelect(modelKey: AIModel['key'] | string) {
		onModelChange?.(modelKey);
	}
</script>

<!-- Message Input Section -->
<div class="sticky bottom-0 z-10 mx-auto w-full max-w-3xl">
	<div
		class="relative rounded-t-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900">
		<!-- Attached Files Display -->
		{#if fileAttachmentsHandler.attachedFiles.length > 0}
			<div class="px-4 py-3">
				<div class="flex flex-wrap gap-2">
					{#each fileAttachmentsHandler.attachedFiles as file, index (file.name + file.size + file.lastModified)}
						{@const IconComponent = fileAttachmentsHandler.getFileIcon(file)}
						<div
							class="flex w-auto items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
							<IconComponent class="size-5 text-gray-600 dark:text-gray-400" />
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
									{file.name}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">
									{fileAttachmentsHandler.formatFileSize(file.size)}
								</p>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => fileAttachmentsHandler.removeFile(index)}
								class="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
								aria-label={m.message_input_remove_file_aria()}>
								<X class="h-3 w-3" />
							</Button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Textarea -->
		<div class="px-4 py-3">
			<textarea
				bind:value={message}
				onkeydown={handleKeydown}
				placeholder={m.message_input_placeholder()}
				disabled={isSubmitting}
				class="field-sizing-content h-full max-h-[200px] min-h-[60px] w-full resize-none border-none bg-transparent text-gray-900 placeholder-gray-500 outline-none disabled:opacity-50 dark:text-gray-100 dark:placeholder-gray-400"
				rows="1"></textarea>
		</div>

		<!-- Bottom Controls -->
		<div class="flex items-center justify-between px-4 py-2">
			<div class="flex items-center gap-2">
				<!-- Model Picker -->
				<ModelPicker value={selectedModel} onSelect={handleModelSelect} size="sm" />

				<!-- Search Toggle -->
				<Button
					variant={isSearchEnabled ? 'default' : 'outline'}
					size="sm"
					disabled={isSubmitting}
					onclick={() => onSearchToggle?.()}
					class="text-xs"
					aria-label={m.message_input_search_toggle_aria()}>
					<Globe class="h-3 w-3" />
					<span class="hidden sm:block">{m.message_input_search()}</span>
				</Button>

				<!-- Attach Button -->
				<Button
					variant="outline"
					size="sm"
					disabled={isSubmitting}
					onclick={() => fileAttachmentsHandler.handleAttachClick()}
					aria-label={m.message_input_attach_aria()}
					class="text-xs">
					<Paperclip class="h-3 w-3" />
					<span class="hidden sm:block">{m.message_input_attach()}</span>
				</Button>
			</div>

			<!-- Submit Button -->
			<Button
				onclick={handleSubmit}
				disabled={(!message.trim() && fileAttachmentsHandler.attachedFiles.length === 0) ||
					isSubmitting}
				size="sm"
				class="ml-2">
				<ArrowUp class="h-3 w-3" />
			</Button>
		</div>
	</div>
</div>

<!-- Hidden File Input -->
<input
	bind:this={fileAttachmentsHandler.fileInput}
	type="file"
	multiple
	accept=".txt,.md,.json,.csv,.xml,.html,.css,.js,.ts,.pdf,image/*,text/*"
	onchange={(e) => fileAttachmentsHandler.handleFileChange(e)}
	class="hidden"
	aria-label={m.message_input_select_files_aria()} />
