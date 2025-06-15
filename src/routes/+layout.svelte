<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';

	import { Toaster } from '$lib/components/ui/sonner/index.js';

	import '@fontsource-variable/fira-code';
	import '@fontsource-variable/geist';
	import '@fontsource-variable/lora';
	import '../app.css';

	let { children, data } = $props();
</script>

<QueryClientProvider client={data.queryClient}>
	{@render children?.()}
</QueryClientProvider>
<Toaster richColors />
