<script lang="ts">
	import { Languages } from '@lucide/svelte';

	import Button from '$lib/components/ui/button/button.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { getLocale, locales, setLocale } from '$lib/paraglide/runtime.js';

	type Locale = (typeof locales)[number];

	// Language display names
	const languageNames: Record<Locale, string> = {
		en: 'English',
		es: 'Español',
	};

	// Language flag emojis
	const languageFlags: Record<Locale, string> = {
		en: '🇺🇸',
		es: '🇲🇽',
	};

	let currentLocale = $state(getLocale());

	function handleLanguageChange(locale: Locale) {
		setLocale(locale);
		currentLocale = locale;
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<Button variant="ghost" size="icon" class="size-8">
			<Languages class="size-4" />
			<span class="sr-only">Language selector</span>
		</Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-48">
		{#each locales as locale (locale)}
			<DropdownMenu.CheckboxItem
				onclick={() => handleLanguageChange(locale)}
				checked={currentLocale === locale}>
				<span class="text-lg">{languageFlags[locale] || '🌐'}</span>
				<span class="flex-1">{languageNames[locale] || locale}</span>
			</DropdownMenu.CheckboxItem>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
