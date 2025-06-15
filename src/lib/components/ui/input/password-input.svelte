<script lang="ts">
	import { Eye, EyeOff } from '@lucide/svelte';

	import type { WithElementRef } from '$lib/utils.js';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { m } from '$lib/paraglide/messages.js';
	import { cn } from '$lib/utils.js';
	import { Input } from '.';
	import { Button } from '../button';

	type Props = WithElementRef<Omit<HTMLInputAttributes, 'type' | 'files'>> & {
		value?: string;
		disabled?: boolean;
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		disabled = false,
		class: className,
		...restProps
	}: Props = $props();

	let showPassword = $state(false);

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}
</script>

<div class="relative">
	<Input
		bind:ref
		bind:value
		type={showPassword ? 'text' : 'password'}
		class={cn('pr-10', className)}
		{disabled}
		{...restProps} />
	<Button
		type="button"
		variant="ghost"
		size="icon"
		class="absolute top-0 right-0 h-9 w-10 hover:bg-transparent"
		onclick={togglePasswordVisibility}
		{disabled}
		aria-label={showPassword ? m.password_input_hide_aria() : m.password_input_show_aria()}>
		{#if showPassword}
			<EyeOff class="h-4 w-4 text-muted-foreground" />
		{:else}
			<Eye class="h-4 w-4 text-muted-foreground" />
		{/if}
	</Button>
</div>
