<script lang="ts">
	import { ArrowLeft, Key, Paperclip, User, Users } from '@lucide/svelte';

	import type { UserGrant } from '$lib/grants';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import LanguagePicker from '$lib/components/layout/language-picker.svelte';
	import ModeToggle from '$lib/components/layout/mode-toggle.svelte';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { hasGrant } from '$lib/grants';
	import { m } from '$lib/paraglide/messages.js';
	import { getUserInitials } from '$lib/utils';

	let { children, data } = $props();

	const activeTab = $derived.by(() => {
		const path = page.url.pathname;
		if (path.startsWith('/settings/api-keys')) return 'api-keys';
		if (path.startsWith('/settings/attachments')) return 'attachments';
		if (path.startsWith('/settings/users')) return 'users';
		return 'profile';
	});

	const canViewUsers = $derived(hasGrant(data.user.grants as UserGrant[], 'users:view'));
	const canManageApiKeys = $derived(
		hasGrant(data.user.grants as UserGrant[], 'api-keys:create:personal')
	);
</script>

<svelte:head>
	<title>{m.settings_layout_title()}</title>
</svelte:head>

<div class="flex min-h-dvh flex-col gap-2">
	<header class="flex items-center justify-between gap-2 px-4 py-6">
		<Button href="/" variant="ghost">
			<ArrowLeft class="h-4 w-4" />
			{m.settings_layout_back_to_chat()}
		</Button>
		<div class="flex items-center gap-2">
			<ModeToggle />
			<LanguagePicker />
			<form use:enhance method="POST" action="/settings?/logout">
				<Button type="submit" variant="ghost">{m.settings_layout_logout()}</Button>
			</form>
		</div>
	</header>
	<div class="grid flex-1 gap-8 md:grid-cols-4">
		<aside class="hidden md:block">
			<div class="mb-8 text-center">
				<div class="mb-4">
					<Avatar class="mx-auto h-24 w-24">
						<AvatarImage src={data.user.avatarUrl} alt={data.user.name} />
						<AvatarFallback class="text-xl font-semibold">
							{getUserInitials(data.user.name, data.user.username)}
						</AvatarFallback>
					</Avatar>
				</div>
				<h2 class="mb-1 text-xl font-semibold text-foreground">
					{data.user.name || data.user.username}
				</h2>
				<p class="mb-4 text-sm text-muted-foreground">
					@{data.user.username}
				</p>
			</div>
		</aside>
		<main class="px-4 pb-8 md:col-span-3">
			<Tabs value={activeTab} class="w-full gap-6">
				<TabsList
					class="no-scrollbar w-full max-w-[calc(100vw-2rem)] justify-start overflow-x-auto">
					<TabsTrigger value="profile" onclick={() => goto('/settings')}>
						<User class="h-4 w-4" />
						{m.settings_layout_profile()}
					</TabsTrigger>
					{#if canManageApiKeys}
						<TabsTrigger value="api-keys" onclick={() => goto('/settings/api-keys')}>
							<Key class="h-4 w-4" />
							{m.settings_layout_api_keys()}
						</TabsTrigger>
					{/if}
					<TabsTrigger value="attachments" onclick={() => goto('/settings/attachments')}>
						<Paperclip class="h-4 w-4" />
						{m.settings_layout_attachments()}
					</TabsTrigger>
					{#if canViewUsers}
						<TabsTrigger value="users" onclick={() => goto('/settings/users')}>
							<Users class="h-4 w-4" />
							{m.settings_layout_users()}
						</TabsTrigger>
					{/if}
				</TabsList>
				{@render children?.()}
			</Tabs>
		</main>
	</div>
</div>
