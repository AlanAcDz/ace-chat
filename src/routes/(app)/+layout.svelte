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
	<main>
		<Sidebar.Trigger />
		{@render children?.()}
	</main>
</Sidebar.Provider>
