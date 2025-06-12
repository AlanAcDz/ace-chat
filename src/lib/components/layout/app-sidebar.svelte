<script lang="ts">
	import MessageCirclePlus from '@lucide/svelte/icons/message-circle-plus';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Search from '@lucide/svelte/icons/search';
	import { createQuery } from '@tanstack/svelte-query';

	import type { ChatGroups } from '$lib/server/data/chats';
	import type { User } from '$lib/server/db/schema';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';

	interface Props {
		user: Promise<Omit<User, 'passwordHash'>>;
	}

	let { user }: Props = $props();

	// Search state
	let searchQuery = $state('');

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

	// Get user initials for avatar fallback
	function getUserInitials(name: string | null, username: string): string {
		if (name) {
			return name
				.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2);
		}
		return username.slice(0, 2).toUpperCase();
	}

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
	function hasChats(chats: Array<{ id: string; title: string }>): boolean {
		return chats && chats.length > 0;
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
			<Input
				bind:value={searchQuery}
				placeholder="Buscar chats..."
				class="border-sidebar-border bg-sidebar-accent/50 pl-9" />
		</div>
	</Sidebar.Header>

	<Sidebar.Content class="p-4">
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
						<Sidebar.GroupLabel class="mb-2 text-xs text-muted-foreground">
							{getGroupLabel(groupKey as keyof ChatGroups)}
						</Sidebar.GroupLabel>
						<Sidebar.Menu>
							{#each chats as chat (chat.id)}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton>
										{#snippet child({ props })}
											<a href="/chats/{chat.id}" {...props} class="flex items-center gap-2">
												<MessageSquare class="h-4 w-4" />
												<span class="truncate">{chat.title}</span>
											</a>
										{/snippet}
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							{/each}
						</Sidebar.Menu>
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
