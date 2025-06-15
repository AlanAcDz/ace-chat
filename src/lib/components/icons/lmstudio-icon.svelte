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
	<rect width="18" height="10" x="3" y="11" rx="2" />
	<circle cx="12" cy="5" r="2" />
	<path d="m12 7-3 4h6z" />
	<path d="M8 16h0" />
	<path d="M16 16h0" />
</svg>
