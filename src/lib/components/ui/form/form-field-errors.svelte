<script lang="ts">
	import * as FormPrimitive from 'formsnap';

	import type { WithoutChild } from '$lib/utils.js';
	import { m } from '$lib/paraglide/messages.js';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		errorClasses,
		children: childrenProp,
		...restProps
	}: WithoutChild<FormPrimitive.FieldErrorsProps> & {
		errorClasses?: string | undefined | null;
	} = $props();

	// Function to translate validation messages
	function translateError(error: string): string {
		// Check if the error is a translation key (starts with validation_)
		if (error.startsWith('validation_')) {
			// Dynamically access the translation function
			const translationKey = error as keyof typeof m;
			if (translationKey in m && typeof m[translationKey] === 'function') {
				return (m[translationKey] as () => string)();
			}
		}
		// Return original error if not a translation key
		return error;
	}
</script>

<FormPrimitive.FieldErrors
	bind:ref
	class={cn('text-sm font-medium text-destructive', className)}
	{...restProps}>
	{#snippet children({ errors, errorProps })}
		{#if childrenProp}
			{@render childrenProp({ errors, errorProps })}
		{:else}
			{#each errors as error (error)}
				<div {...errorProps} class={cn(errorClasses)}>{translateError(error)}</div>
			{/each}
		{/if}
	{/snippet}
</FormPrimitive.FieldErrors>
