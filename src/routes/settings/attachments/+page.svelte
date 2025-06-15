<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';
	import { AlertCircle, ExternalLink, File, Trash2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';
	import type { Attachment } from '$lib/server/db/schema';
	import { applyAction, deserialize } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import AttachmentSkeleton from '$lib/components/attachments/attachment-skeleton.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import {
		AlertDialog,
		AlertDialogAction,
		AlertDialogCancel,
		AlertDialogContent,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogHeader,
		AlertDialogTitle,
	} from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { TabsContent } from '$lib/components/ui/tabs';
	import { formatFileSize, getFileIcon } from '$lib/utils';

	let { data }: { data: PageData } = $props();

	let selectedIds = $state<string[]>([]);
	let selectAll = $state(false);
	let isDeleting = $state(false);
	let dialogOpen = $state(false);
	let deleteType = $state<'single' | 'multiple'>('single');
	let attachmentToDelete = $state<Attachment | null>(null);

	// Handle select all toggle
	function handleSelectAll(attachments: Attachment[]) {
		if (selectAll) {
			selectedIds = [];
			selectAll = false;
		} else {
			selectedIds = attachments.map((a) => a.id);
			selectAll = true;
		}
	}

	// Handle individual selection
	function handleSelect(id: string, attachments: Attachment[]) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((i) => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
		selectAll = selectedIds.length === attachments.length;
	}

	// Show confirmation dialog for single delete
	function showDeleteDialog(attachment: Attachment) {
		attachmentToDelete = attachment;
		deleteType = 'single';
		dialogOpen = true;
	}

	// Show confirmation dialog for multiple delete
	function showDeleteMultipleDialog() {
		if (selectedIds.length === 0) return;
		deleteType = 'multiple';
		dialogOpen = true;
	}

	// Handle single delete
	async function handleDeleteSingle(attachment: Attachment) {
		isDeleting = true;
		const formData = new FormData();
		formData.append('id', attachment.id);

		const response = await fetch('?/deleteAttachment', {
			method: 'POST',
			body: formData,
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success') {
			toast.success('Archivo eliminado correctamente');
			await invalidate('app:attachments');
		} else {
			toast.error('Error al eliminar el archivo');
		}

		applyAction(result);
		isDeleting = false;
		dialogOpen = false;
	}

	// Handle delete multiple
	async function handleDeleteMultiple() {
		if (selectedIds.length === 0) return;

		isDeleting = true;
		const formData = new FormData();
		selectedIds.forEach((id) => formData.append('ids', id));

		const response = await fetch('?/deleteMultiple', {
			method: 'POST',
			body: formData,
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success') {
			toast.success(`Se eliminaron ${selectedIds.length} archivo(s)`);
			selectedIds = [];
			selectAll = false;
			await invalidate('app:attachments');
		} else {
			toast.error('Error al eliminar los archivos');
		}

		applyAction(result);
		isDeleting = false;
		dialogOpen = false;
	}

	// Handle confirm delete
	async function handleConfirmDelete() {
		if (deleteType === 'single' && attachmentToDelete) {
			await handleDeleteSingle(attachmentToDelete);
		} else if (deleteType === 'multiple') {
			await handleDeleteMultiple();
		}
	}
</script>

<TabsContent value="attachments" class="space-y-6">
	<div class="space-y-4">
		<!-- Header -->
		<div class="space-y-2">
			<h1 class="text-2xl font-bold text-gray-900">Archivos Adjuntos</h1>
			<div class="rounded-lg border border-secondary bg-secondary/20 p-4">
				<p class="text-sm">
					Gestiona tus archivos y adjuntos subidos. Ten en cuenta que eliminar archivos aquí los
					eliminará de los hilos relevantes, pero no eliminará los hilos. Esto puede llevar a
					comportamientos inesperados si eliminas un archivo que todavía se está utilizando en un
					hilo.
				</p>
			</div>
		</div>

		{#await data.attachments}
			<AttachmentSkeleton />
		{:then attachments}
			{#if attachments.length > 0}
				<!-- Select all and delete controls -->
				<div class="flex items-center justify-between">
					<div class="flex h-8 items-center gap-2">
						<Checkbox
							class="border-accent"
							checked={selectAll}
							onCheckedChange={() => handleSelectAll(attachments)}
							id="select-all" />
						<label for="select-all" class="cursor-pointer text-sm font-medium">
							Seleccionar todos
						</label>
					</div>
					{#if selectedIds.length > 0}
						<Button
							variant="destructive"
							size="sm"
							onclick={showDeleteMultipleDialog}
							disabled={isDeleting}>
							<Trash2 class="mr-2 h-4 w-4" />
							Eliminar seleccionados ({selectedIds.length})
						</Button>
					{/if}
				</div>

				<!-- Attachments list -->
				<div class="space-y-2">
					{#each attachments as attachment (attachment.id)}
						<div
							class="flex cursor-pointer items-center gap-4 rounded-lg border border-secondary bg-secondary/20 p-4 hover:bg-secondary/60"
							onclick={() => handleSelect(attachment.id, attachments)}
							role="button"
							tabindex="0"
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleSelect(attachment.id, attachments);
								}
							}}>
							<Checkbox
								class="border-accent"
								checked={selectedIds.includes(attachment.id)}
								onCheckedChange={() => handleSelect(attachment.id, attachments)}
								id="attachment-{attachment.id}"
								onclick={(e) => e.stopPropagation()} />

							<!-- File preview/icon -->
							<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/20">
								{#if attachment.fileType.startsWith('image/')}
									<img
										src="/api/files/{attachment.filePath}"
										alt={attachment.fileName}
										class="h-full w-full rounded-lg object-cover" />
								{:else}
									{@const IconComponent = getFileIcon(attachment.fileType)}
									<IconComponent class="h-6 w-6 text-gray-600" />
								{/if}
							</div>

							<!-- File info -->
							<div class="flex flex-1 flex-col">
								<div class="flex items-center gap-2">
									<button
										class="text-left font-medium text-gray-900 hover:text-primary hover:underline"
										onclick={(e) => {
											e.stopPropagation();
											window.open(`/api/files/${attachment.filePath}`, '_blank');
										}}
										aria-label="Abrir {attachment.fileName}">
										{attachment.fileName}
									</button>
									<ExternalLink class="h-4 w-4 text-gray-400" />
								</div>
								<div class="text-sm text-gray-500">
									{attachment.fileType} • {formatFileSize(attachment.fileSize)}
								</div>
							</div>

							<!-- Delete button -->
							<Button
								variant="ghost"
								size="sm"
								class="text-red-600 hover:bg-red-50 hover:text-red-700"
								onclick={(e) => {
									e.stopPropagation();
									showDeleteDialog(attachment);
								}}
								aria-label="Eliminar {attachment.fileName}">
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					{/each}
				</div>
			{:else}
				<div class="py-12 text-center">
					<File class="mx-auto mb-4 h-12 w-12 text-gray-400" />
					<h3 class="mb-2 text-lg font-medium text-gray-900">
						No se encontraron archivos adjuntos
					</h3>
					<p class="text-gray-500">
						Sus archivos subidos aparecerán aquí una vez que comience a adjuntarlos a los mensajes.
					</p>
				</div>
			{/if}
		{:catch}
			<Alert variant="destructive" class="mx-auto max-w-md">
				<AlertCircle class="h-4 w-4" />
				<AlertTitle>Error al cargar los archivos adjuntos</AlertTitle>
				<AlertDescription>
					Ocurrió un error al cargar sus archivos adjuntos. Por favor, inténtelo de nuevo.
				</AlertDescription>
			</Alert>
		{/await}
	</div>

	<!-- Confirmation Dialog -->
	<AlertDialog bind:open={dialogOpen}>
		<AlertDialogContent>
			<AlertDialogHeader>
				<AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
				<AlertDialogDescription>
					{#if deleteType === 'single' && attachmentToDelete}
						¿Estás seguro de que quieres eliminar el archivo "{attachmentToDelete.fileName}"?
					{:else if deleteType === 'multiple'}
						¿Estás seguro de que quieres eliminar {selectedIds.length} archivo(s) seleccionado(s)?
					{/if}
					Esta acción no se puede deshacer.
				</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter>
				<AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
				<AlertDialogAction
					onclick={handleConfirmDelete}
					disabled={isDeleting}
					class="bg-red-600 hover:bg-red-700">
					{#if isDeleting}
						Eliminando...
					{:else}
						Eliminar
					{/if}
				</AlertDialogAction>
			</AlertDialogFooter>
		</AlertDialogContent>
	</AlertDialog>
</TabsContent>
