<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';
	import { AlertCircle, Mail, Plus, User, UserCheck } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';
	import type { UserInvite as UserInviteType, User as UserType } from '$lib/server/db/schema';
	import { applyAction, deserialize } from '$app/forms';
	import { invalidate } from '$app/navigation';
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
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { TabsContent } from '$lib/components/ui/tabs';
	import EditUserDialog from '$lib/components/users/edit-user-dialog.svelte';
	import InviteCard from '$lib/components/users/invite-card.svelte';
	import InviteUserDialog from '$lib/components/users/invite-user-dialog.svelte';
	import UserCard from '$lib/components/users/user-card.svelte';
	import UserSkeleton from '$lib/components/users/user-skeleton.svelte';
	import { m } from '$lib/paraglide/messages.js';

	// Create types that match the data returned from the server
	type UserDisplay = Omit<UserType, 'passwordHash'>;
	type InviteDisplay = UserInviteType & {
		invitedBy: {
			username: string;
			name: string | null;
		};
	};

	let { data }: { data: PageData } = $props();

	// Get current user from parent layout to prevent self-deletion
	const currentUser = $derived(data.user);

	let isDeleting = $state(false);
	let dialogOpen = $state(false);
	let inviteDialogOpen = $state(false);
	let editDialogOpen = $state(false);
	let deleteType = $state<'user' | 'invite'>('user');
	let userToDelete = $state<UserDisplay | null>(null);
	let userToEdit = $state<UserDisplay | null>(null);
	let inviteToDelete = $state<InviteDisplay | null>(null);

	// Show confirmation dialog for delete user
	function showDeleteUserDialog(user: UserDisplay) {
		userToDelete = user;
		deleteType = 'user';
		dialogOpen = true;
	}

	// Show edit dialog for user
	function showEditUserDialog(user: UserDisplay) {
		userToEdit = user;
		editDialogOpen = true;
	}

	// Show confirmation dialog for delete invite
	function showDeleteInviteDialog(invite: InviteDisplay) {
		inviteToDelete = invite;
		deleteType = 'invite';
		dialogOpen = true;
	}

	// Handle delete user
	async function handleDeleteUser(user: UserDisplay) {
		isDeleting = true;
		const formData = new FormData();
		formData.append('id', user.id);

		const response = await fetch('?/deleteUser', {
			method: 'POST',
			body: formData,
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success') {
			toast.success(m.settings_users_delete_success());
			await invalidate('app:users');
		} else {
			toast.error(m.settings_users_delete_error());
		}

		applyAction(result);
		isDeleting = false;
		dialogOpen = false;
	}

	// Handle delete invite
	async function handleDeleteInvite(invite: InviteDisplay) {
		isDeleting = true;
		const formData = new FormData();
		formData.append('id', invite.id);

		const response = await fetch('?/deleteInvite', {
			method: 'POST',
			body: formData,
		});

		const result: ActionResult = deserialize(await response.text());

		if (result.type === 'success') {
			toast.success(m.settings_users_invite_delete_success());
			await invalidate('app:users');
		} else {
			toast.error(m.settings_users_invite_delete_error());
		}

		applyAction(result);
		isDeleting = false;
		dialogOpen = false;
	}

	// Handle confirm delete
	async function handleConfirmDelete() {
		if (deleteType === 'user' && userToDelete) {
			await handleDeleteUser(userToDelete);
		} else if (deleteType === 'invite' && inviteToDelete) {
			await handleDeleteInvite(inviteToDelete);
		}
	}

	// Handle copy invite link
	function copyInviteLink(username: string) {
		const inviteUrl = `${window.location.origin}/signup?username=${encodeURIComponent(username)}`;
		navigator.clipboard
			.writeText(inviteUrl)
			.then(() => {
				toast.success(m.settings_users_invite_link_copied());
			})
			.catch(() => {
				toast.error(m.settings_users_invite_link_copy_error());
			});
	}
</script>

<TabsContent value="users" class="space-y-6">
	<div class="space-y-4">
		<!-- Header -->
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-bold text-gray-900">{m.settings_users_title()}</h1>
				{#if data.canCreate}
					<Button size="sm" onclick={() => (inviteDialogOpen = true)}>
						<Plus class="mr-2 h-4 w-4" />
						{m.settings_users_invite_button()}
					</Button>
				{/if}
			</div>
			<div class="rounded-lg border border-secondary bg-secondary/20 p-4">
				<p class="text-sm">
					{m.settings_users_description()}
				</p>
			</div>
		</div>

		{#await Promise.all([data.users, data.invites])}
			<UserSkeleton />
		{:then [users, invites]}
			<!-- Users Section -->
			{#if users.length > 0}
				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<UserCheck class="h-5 w-5 text-gray-600" />
						<h2 class="text-lg font-semibold text-gray-900">{m.settings_users_active_title()}</h2>
						<Badge variant="secondary">{users.length}</Badge>
					</div>
					<div class="space-y-2">
						{#each users as user (user.id)}
							<UserCard
								{user}
								currentUserId={currentUser.id}
								canUpdate={data.canUpdate}
								canDelete={data.canDelete}
								onEdit={showEditUserDialog}
								onDelete={showDeleteUserDialog} />
						{/each}
					</div>
				</div>
			{/if}

			<!-- Invites Section -->
			{#if invites.length > 0}
				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<Mail class="h-5 w-5" />
						<h2 class="text-lg font-semibold text-gray-900">
							{m.settings_users_pending_invites_title()}
						</h2>
						<Badge variant="default">{invites.length}</Badge>
					</div>
					<div class="space-y-2">
						{#each invites as invite (invite.id)}
							<InviteCard
								{invite}
								canDelete={data.canDelete}
								onCopyLink={copyInviteLink}
								onDelete={showDeleteInviteDialog} />
						{/each}
					</div>
				</div>
			{/if}

			<!-- Empty state -->
			{#if users.length === 0 && invites.length === 0}
				<div class="py-12 text-center">
					<User class="mx-auto mb-4 h-12 w-12 text-gray-400" />
					<h3 class="mb-2 text-lg font-medium text-gray-900">{m.settings_users_empty_title()}</h3>
					<p class="text-gray-500">
						{#if data.canCreate}
							{m.settings_users_empty_description_can_create()}
						{:else}
							{m.settings_users_empty_description_no_permission()}
						{/if}
					</p>
				</div>
			{/if}
		{:catch}
			<Alert variant="destructive" class="mx-auto max-w-md">
				<AlertCircle class="h-4 w-4" />
				<AlertTitle>{m.settings_users_error_loading_title()}</AlertTitle>
				<AlertDescription>
					{m.settings_users_error_loading_description()}
				</AlertDescription>
			</Alert>
		{/await}
	</div>

	<!-- Invite User Dialog -->
	<InviteUserDialog
		bind:open={inviteDialogOpen}
		onOpenChange={(open) => (inviteDialogOpen = open)} />

	<!-- Edit User Dialog -->
	<EditUserDialog
		bind:open={editDialogOpen}
		user={userToEdit}
		onOpenChange={(open) => (editDialogOpen = open)} />

	<!-- Confirmation Dialog -->
	<AlertDialog bind:open={dialogOpen}>
		<AlertDialogContent>
			<AlertDialogHeader>
				<AlertDialogTitle>{m.settings_users_confirm_delete_title()}</AlertDialogTitle>
				<AlertDialogDescription>
					{#if deleteType === 'user' && userToDelete}
						{m.settings_users_confirm_delete_user({
							username: userToDelete.name || userToDelete.username,
						})}
					{:else if deleteType === 'invite' && inviteToDelete}
						{m.settings_users_confirm_delete_invite({ username: inviteToDelete.username })}
					{/if}
					{m.settings_users_confirm_delete_warning()}
				</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter>
				<AlertDialogCancel disabled={isDeleting}>{m.settings_users_cancel()}</AlertDialogCancel>
				<AlertDialogAction
					onclick={handleConfirmDelete}
					disabled={isDeleting}
					class="bg-red-600 hover:bg-red-700">
					{#if isDeleting}
						{m.settings_users_deleting()}
					{:else}
						{m.settings_users_delete()}
					{/if}
				</AlertDialogAction>
			</AlertDialogFooter>
		</AlertDialogContent>
	</AlertDialog>
</TabsContent>
