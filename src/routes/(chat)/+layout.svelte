<script lang="ts">
	import { PlusIcon, Settings2 } from '@lucide/svelte';

	import { page } from '$app/stores';
	import ShareButton from '$lib/components/chats/share-button.svelte';
	import AppSidebar from '$lib/components/layout/app-sidebar.svelte';
	import LanguagePicker from '$lib/components/layout/language-picker.svelte';
	import ModeToggle from '$lib/components/layout/mode-toggle.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { setChatSettingsContext } from '$lib/contexts/chat-settings.svelte';
	import Button from '../../lib/components/ui/button/button.svelte';

	let { children, data } = $props();

	// Initialize chat settings context
	setChatSettingsContext();

	// Extract chatId from URL for share functionality
	const chatId = $derived($page.params.chatId);
	const isInChatPage = $derived(!!chatId);
</script>

<svelte:head>
	<title>AceChat</title>
</svelte:head>

<Sidebar.Provider>
	<AppSidebar user={data.user} />
	<main class="relative grid flex-1 grid-rows-[auto_1fr]">
		<header class="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2">
			<div class="flex items-center gap-0.5 rounded bg-secondary/50 p-0.5 backdrop-blur-sm">
				<Sidebar.Trigger class="size-8" />
				<Button href="/" variant="ghost" size="icon" class="size-8">
					<PlusIcon class="size-4" />
				</Button>
			</div>
			<div class="flex items-center gap-0.5 rounded bg-secondary/50 p-0.5 backdrop-blur-sm">
				{#if isInChatPage && chatId}
					<ShareButton {chatId} />
				{/if}
				<ModeToggle />
				<LanguagePicker />
				<Button href="/settings" variant="ghost" size="icon" class="size-8">
					<Settings2 class="size-4" />
				</Button>
			</div>
		</header>
		<div class="mx-auto flex h-full w-full max-w-4xl flex-col px-4 pt-6">
			{@render children?.()}
		</div>
	</main>
</Sidebar.Provider>
