<script lang="ts">
	import { Settings, Trash2 } from '@lucide/svelte';

	import type { User } from '$lib/server/db/schema';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { getUserInitials } from '$lib/utils';

	interface Props {
		user: Omit<User, 'passwordHash' | 'defaultSystemPrompt'>;
		currentUserId: string;
		canUpdate: boolean;
		canDelete: boolean;
		onEdit: (user: Omit<User, 'passwordHash' | 'defaultSystemPrompt'>) => void;
		onDelete: (user: Omit<User, 'passwordHash' | 'defaultSystemPrompt'>) => void;
	}

	let { user, currentUserId, canUpdate, canDelete, onEdit, onDelete }: Props = $props();
</script>

<div class="flex items-center gap-4 rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
	<!-- User avatar -->
	<Avatar class="h-12 w-12">
		<AvatarImage src={user.avatarUrl} alt={user.name || user.username} />
		<AvatarFallback class="text-sm">
			{getUserInitials(user.name, user.username)}
		</AvatarFallback>
	</Avatar>

	<!-- User info -->
	<div class="flex flex-1 flex-col">
		<div class="flex items-center gap-2">
			<span class="font-medium text-gray-900">
				{user.name || user.username}
			</span>
			{#if user.name}
				<span class="text-sm text-gray-500">@{user.username}</span>
			{/if}
		</div>
		<div class="mt-1 flex flex-wrap gap-1">
			{#if user.grants.length > 0}
				{#each user.grants.slice(0, 3) as grant, i (i)}
					<Badge variant="secondary" class="text-xs">
						{grant.replace(/:/g, ' ')}
					</Badge>
				{/each}
				{#if user.grants.length > 3}
					<Badge variant="outline" class="text-xs">
						+{user.grants.length - 3} más
					</Badge>
				{/if}
			{:else}
				<Badge variant="outline" class="text-xs">Sin permisos</Badge>
			{/if}
		</div>
		<div class="mt-1 text-xs text-gray-500">
			Creado: {new Date(user.createdAt).toLocaleDateString()}
		</div>
	</div>

	<!-- Action buttons -->
	<div class="flex gap-2">
		{#if canUpdate && user.id !== currentUserId}
			<Button
				variant="ghost"
				size="sm"
				class="text-gray-600 hover:bg-gray-100 hover:text-gray-700"
				onclick={(e) => {
					e.stopPropagation();
					onEdit(user);
				}}
				aria-label="Editar {user.name || user.username}">
				<Settings class="h-4 w-4" />
			</Button>
		{/if}
		{#if canDelete && user.id !== currentUserId}
			<Button
				variant="ghost"
				size="sm"
				class="text-red-600 hover:bg-red-50 hover:text-red-700"
				onclick={(e) => {
					e.stopPropagation();
					onDelete(user);
				}}
				aria-label="Eliminar {user.name || user.username}">
				<Trash2 class="h-4 w-4" />
			</Button>
		{/if}
	</div>
</div>
