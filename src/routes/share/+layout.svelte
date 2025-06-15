<script lang="ts">
	import { ArrowLeft, MessageCircleIcon } from '@lucide/svelte';

	import LanguagePicker from '$lib/components/layout/language-picker.svelte';
	import { Button } from '$lib/components/ui/button';
	import { m } from '$lib/paraglide/messages.js';

	let { children } = $props();
</script>

<svelte:head>
	<title>{m.share_layout_title()}</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Simple Header -->
	<header
		class="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="container mx-auto flex h-14 items-center justify-between px-4">
			<div class="flex items-center gap-2">
				<MessageCircleIcon class="size-6" />
				<span class="font-semibold">AceChat</span>
			</div>
			<div class="flex items-center gap-2">
				<LanguagePicker />
				<Button href="/" variant="secondary">
					<ArrowLeft class="size-4" />
					{m.share_layout_go_to_app()}
				</Button>
			</div>
		</div>
	</header>

	<!-- Content -->
	<main class="container mx-auto px-4">
		{@render children?.()}
	</main>

	<!-- Footer -->
	<footer class="border-t py-6 text-center text-sm text-muted-foreground">
		<div class="container mx-auto px-4">
			{m.share_layout_footer()}
		</div>
	</footer>
</div>
