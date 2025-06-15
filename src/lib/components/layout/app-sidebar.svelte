<script lang="ts">
	import { GitBranch, X } from '@lucide/svelte';
	import MessageCirclePlus from '@lucide/svelte/icons/message-circle-plus';
	import Search from '@lucide/svelte/icons/search';
	import { createMutation, createQuery } from '@tanstack/svelte-query';

	import type { ChatGroups } from '$lib/server/data/chats';
	import type { User } from '$lib/server/db/schema';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { cn, getUserInitials } from '$lib/utils';

	interface Props {
		user: Promise<Omit<User, 'passwordHash'>>;
	}

	let { user }: Props = $props();

	// Search state
	let searchQuery = $state('');

	// Delete dialog state
	let showDeleteDialog = $state(false);
	let chatToDelete = $state<{ id: string; title: string; isBranched?: boolean } | null>(null);

	// Query to fetch chats
	const chatsQuery = $derived(
		createQuery({
			queryKey: ['chats', searchQuery],
			queryFn: async () => {
				const url = new URL('/api/chats', window.location.origin);
				if (searchQuery.trim()) {
					url.searchParams.set('search', searchQuery.trim());
				}

				const response = await fetch(url);
				if (!response.ok) {
					throw new Error('Error al cargar los chats');
				}

				return response.json() as Promise<ChatGroups>;
			},
		})
	);

	// Delete chat mutation
	const deleteChatMutation = createMutation({
		mutationFn: async (chatId: string) => {
			const response = await fetch(`/api/chats/${chatId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Error al eliminar el chat');
			}

			return response.json();
		},
		onSuccess: (_, chatId) => {
			// Refetch chats to update the UI
			$chatsQuery.refetch();

			// If we're currently viewing the deleted chat, redirect to home
			if (page.params.chatId === chatId) {
				goto('/');
			}

			// Close dialog and reset state
			showDeleteDialog = false;
			chatToDelete = null;
		},
		onError: (error) => {
			console.error('Error deleting chat:', error);
			// You could add a toast notification here
		},
	});

	// Get group label in Spanish
	function getGroupLabel(groupKey: keyof ChatGroups): string {
		const labels = {
			today: 'Hoy',
			yesterday: 'Ayer',
			last7Days: 'Últimos 7 días',
			last30Days: 'Últimos 30 días',
			older: 'Más antiguos',
		};
		return labels[groupKey];
	}

	// Check if a group has chats
	function hasChats(chats: Array<{ id: string; title: string; isBranched: boolean }>): boolean {
		return chats && chats.length > 0;
	}

	// Handle showing delete confirmation
	function handleShowDeleteDialog(
		chat: { id: string; title: string; isBranched?: boolean },
		event: Event
	) {
		event.preventDefault();
		event.stopPropagation();
		chatToDelete = chat;
		showDeleteDialog = true;
	}

	// Handle confirmed deletion
	function handleConfirmDelete() {
		if (chatToDelete) {
			$deleteChatMutation.mutate(chatToDelete.id);
		}
	}

	// Handle cancel deletion
	function handleCancelDelete() {
		showDeleteDialog = false;
		chatToDelete = null;
	}
</script>

<Sidebar.Root>
	<Sidebar.Header class="gap-3 border-b border-sidebar-border p-4">
		<!-- AceChat Brand -->
		<div class="flex items-center justify-center">
			<a href="/" class="flex items-center space-x-2 transition-opacity hover:opacity-80">
				<h1 class="text-center text-lg font-semibold text-sidebar-foreground">AceChat</h1>
			</a>
		</div>

		<!-- New Chat Button -->
		<Button href="/" variant="outline" size="sm" class="w-full gap-2">
			<MessageCirclePlus class="h-4 w-4" />
			<span>Nuevo Chat</span>
		</Button>

		<!-- Search Bar -->
		<div class="relative">
			<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input bind:value={searchQuery} placeholder="Buscar chats..." class="pl-9" />
		</div>
	</Sidebar.Header>

	<Sidebar.Content>
		<!-- Chat List -->
		{#if $chatsQuery.isPending}
			<!-- Loading state -->
			<Sidebar.Group>
				<Sidebar.Menu>
					{#each Array(5)}
						<Sidebar.MenuItem>
							<Sidebar.MenuSkeleton />
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.Group>
		{:else if $chatsQuery.isError}
			<!-- Error state -->
			<div class="py-8 text-center text-sm text-destructive">Error al cargar los chats</div>
		{:else if $chatsQuery.data}
			<!-- Success state -->
			{@const groups = $chatsQuery.data}

			{#each Object.entries(groups) as [groupKey, chats] (groupKey)}
				{#if hasChats(chats)}
					<Sidebar.Group>
						<Sidebar.GroupLabel>
							{getGroupLabel(groupKey as keyof ChatGroups)}
						</Sidebar.GroupLabel>
						<Sidebar.GroupContent>
							<Sidebar.Menu>
								{#each chats as chat (chat.id)}
									<Sidebar.MenuItem>
										<Sidebar.MenuButton isActive={page.params.chatId === chat.id}>
											{#snippet child({ props })}
												<a
													{...props}
													href="/chats/{chat.id}"
													class={cn(props.class as string, 'group/link relative truncate')}>
													{#if chat.isBranched}
														<div title="Chat ramificado">
															<GitBranch class="h-3 w-3 shrink-0 text-current" />
														</div>
													{/if}
													<span class="truncate text-xs">{chat.title}</span>
													<div
														class="absolute inset-y-0 right-0 flex translate-x-full items-center justify-end transition-transform group-hover/link:translate-x-0">
														<span
															class="h-full w-8 bg-linear-to-l from-sidebar-accent to-transparent"
														></span>
														<div class="flex items-center justify-center bg-sidebar-accent">
															<Button
																size="icon"
																variant="ghost"
																class="hover:bg-gray-200"
																onclick={(e) => handleShowDeleteDialog(chat, e)}
																disabled={$deleteChatMutation.isPending}>
																<X />
															</Button>
														</div>
													</div>
												</a>
											{/snippet}
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
								{/each}
							</Sidebar.Menu>
						</Sidebar.GroupContent>
					</Sidebar.Group>
				{/if}
			{/each}

			{#if !Object.values(groups).some(hasChats)}
				<!-- No chats found -->
				<div class="py-8 text-center text-sm text-muted-foreground">
					{searchQuery.trim() ? 'No se encontraron chats' : 'Los chats aparecerán aquí'}
				</div>
			{/if}
		{/if}
	</Sidebar.Content>

	<Sidebar.Footer class="border-t border-sidebar-border">
		<!-- User Button with await -->
		{#await user}
			<!-- Loading state -->
			<div class="flex items-center gap-3 p-3">
				<Skeleton class="h-8 w-8 rounded-full" />
				<div class="flex flex-col gap-1">
					<Skeleton class="h-4 w-24" />
					<Skeleton class="h-3 w-16" />
				</div>
			</div>
		{:then userData}
			<!-- Loaded state -->
			<Button href="/settings" variant="ghost" class="h-auto w-full justify-start gap-3 p-2">
				<Avatar class="size-10">
					<AvatarImage src={userData.avatarUrl} alt={userData.name || userData.username} />
					<AvatarFallback class="text-xs">
						{getUserInitials(userData.name, userData.username)}
					</AvatarFallback>
				</Avatar>
				<div class="flex flex-col items-start text-left">
					<div class="text-sm font-medium text-sidebar-foreground">
						{userData.name || userData.username}
					</div>
					<div class="text-xs text-muted-foreground">
						@{userData.username}
					</div>
				</div>
			</Button>
		{:catch}
			<!-- Error state -->
			<div class="p-3 text-center text-sm text-destructive">Error al cargar usuario</div>
		{/await}
	</Sidebar.Footer>
</Sidebar.Root>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Eliminar chat</AlertDialog.Title>
			<AlertDialog.Description>
				¿Estás seguro de que quieres eliminar el chat "{chatToDelete?.title}"? Esta acción no se
				puede deshacer.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={handleCancelDelete}>Cancelar</AlertDialog.Cancel>
			<AlertDialog.Action onclick={handleConfirmDelete} disabled={$deleteChatMutation.isPending}>
				{$deleteChatMutation.isPending ? 'Eliminando...' : 'Eliminar'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
