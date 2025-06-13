<script lang="ts">
	import { Copy, Mail, Trash2 } from '@lucide/svelte';

	import type { UserInvite } from '$lib/server/db/schema';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		invite: UserInvite & {
			invitedBy: {
				username: string;
				name: string | null;
			};
		};
		canDelete: boolean;
		onCopyLink: (username: string) => void;
		onDelete: (
			invite: UserInvite & { invitedBy: { username: string; name: string | null } }
		) => void;
	}

	let { invite, canDelete, onCopyLink, onDelete }: Props = $props();
</script>

<div class="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
	<!-- Invite icon -->
	<div class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
		<Mail class="h-6 w-6" />
	</div>

	<!-- Invite info -->
	<div class="flex flex-1 flex-col">
		<div class="flex items-center gap-2">
			<span class="font-medium text-gray-900">@{invite.username}</span>
			<Badge variant="outline" class="text-xs">Pendiente</Badge>
		</div>
		<div class="mt-1 flex flex-wrap gap-1">
			{#if invite.grants.length > 0}
				{#each invite.grants.slice(0, 3) as grant, i (i)}
					<Badge variant="secondary" class="text-xs">
						{grant.replace(/:/g, ' ')}
					</Badge>
				{/each}
				{#if invite.grants.length > 3}
					<Badge variant="outline" class="text-xs">
						+{invite.grants.length - 3} más
					</Badge>
				{/if}
			{:else}
				<Badge variant="outline" class="text-xs">Sin permisos</Badge>
			{/if}
		</div>
		<div class="mt-1 text-xs text-gray-600">
			Invitado por: {invite.invitedBy.name || invite.invitedBy.username} •
			{new Date(invite.createdAt).toLocaleDateString()}
		</div>
	</div>

	<!-- Action buttons -->
	<div class="flex gap-2">
		<Button
			variant="ghost"
			size="sm"
			onclick={() => {
				onCopyLink(invite.username);
			}}
			aria-label="Copiar enlace de invitación para {invite.username}">
			<Copy class="h-4 w-4" />
		</Button>
		{#if canDelete}
			<Button
				variant="ghost"
				size="sm"
				class="text-red-600 hover:bg-red-50 hover:text-red-700"
				onclick={() => {
					onDelete(invite);
				}}
				aria-label="Eliminar invitación para {invite.username}">
				<Trash2 class="h-4 w-4" />
			</Button>
		{/if}
	</div>
</div>
