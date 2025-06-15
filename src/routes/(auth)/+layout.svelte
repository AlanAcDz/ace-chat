<script lang="ts">
	import LanguagePicker from '$lib/components/layout/language-picker.svelte';
	import * as Card from '$lib/components/ui/card';

	let { children } = $props();
</script>

<div
	class="relative flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
	<!-- Language Picker - Absolute positioned in top-right corner -->
	<div class="absolute top-4 right-4 z-10 rounded bg-secondary/50 p-0.5 backdrop-blur-sm">
		<LanguagePicker />
	</div>

	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			<h1 class="text-3xl font-bold tracking-tight text-foreground">AceChat</h1>
		</div>

		<Card.Root class="w-full max-w-md">
			{@render children()}
		</Card.Root>
	</div>
</div>
