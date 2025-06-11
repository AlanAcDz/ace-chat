<script lang="ts">
	import * as Card from '$lib/components/ui/card';

	let { children } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			<h1 class="text-3xl font-bold tracking-tight text-foreground">AceChat</h1>
		</div>

		<Card.Root class="w-full max-w-md">
			{@render children()}
		</Card.Root>
	</div>
</div>
