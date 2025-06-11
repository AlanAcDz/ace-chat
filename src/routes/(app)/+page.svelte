<script lang="ts">
	import type { PageData } from './$types';
	import MessageInput from '$lib/components/chats/message-input.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';

	let { data }: { data: PageData } = $props();
</script>

<!-- Header Section -->
<div class="mb-8 flex flex-1 flex-col items-center justify-center text-center">
	{#await data.user}
		<div class="mb-6">
			<Skeleton class="mx-auto mb-2 h-12 w-96" />
			<Skeleton class="mx-auto h-8 w-64" />
		</div>
	{:then user}
		<h1 class="mb-6 text-4xl font-semibold text-gray-800 md:text-5xl dark:text-gray-200">
			¿Cómo puedo ayudarte, {user.name || user.username}?
		</h1>
	{/await}

	<!-- Sample Questions (placeholder for future implementation) -->
	<div class="grid max-w-2xl grid-cols-1 gap-3 md:grid-cols-2">
		<div
			class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
			¿Cómo funciona la IA?
		</div>
		<div
			class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
			¿Son reales los agujeros negros?
		</div>
		<div
			class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
			¿Cuántas Rs hay en la palabra "fresa"?
		</div>
		<div
			class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
			¿Cuál es el significado de la vida?
		</div>
	</div>
</div>

<MessageInput />
