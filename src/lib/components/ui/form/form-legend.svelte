<script lang="ts">
	import * as FormPrimitive from 'formsnap';

	import type { WithoutChild } from '$lib/utils.js';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChild<FormPrimitive.LegendProps> = $props();
</script>

<FormPrimitive.Legend
	bind:ref
	class={cn('text-sm leading-none font-medium data-[fs-error]:text-destructive', className)}
	{...restProps} />
