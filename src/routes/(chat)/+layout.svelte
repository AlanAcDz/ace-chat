<script lang="ts">
	import AppSidebar from '$lib/components/layout/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	let { children, data } = $props();
</script>

<svelte:head>
	<title>AceChat</title>
</svelte:head>

<Sidebar.Provider>
	<AppSidebar user={data.user} />
	<main class="relative grid flex-1 grid-rows-[auto_1fr]">
		<header class="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2">
			<Sidebar.Trigger class="size-8" />
		</header>
		<div class="mx-auto flex h-full w-full max-w-4xl flex-col px-4 pt-6">
			{@render children?.()}
		</div>
	</main>
</Sidebar.Provider>
