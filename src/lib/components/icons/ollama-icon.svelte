<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, ...props }: HTMLAttributes<SVGElement> = $props();
</script>

<svg
	{...props}
	class={className}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round">
	<path d="M12 2a10 10 0 1 0 10 10c0-1.61-.3-3.14-.86-4.55L20 6l-1.45 1.14A10 10 0 0 0 12 2z" />
	<circle cx="12" cy="12" r="4" />
	<circle cx="12" cy="12" r="1" />
	<path d="m9 9 6 6" />
	<path d="m15 9-6 6" />
</svg>
