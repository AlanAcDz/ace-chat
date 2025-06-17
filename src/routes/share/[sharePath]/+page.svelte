<script lang="ts">
	import { ExternalLinkIcon, MessageCircleIcon } from '@lucide/svelte';

	import type { PageData } from './$types';
	import AssistantMessage from '$lib/components/chats/assistant-message.svelte';
	import UserMessage from '$lib/components/chats/user-message.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: { data: PageData } = $props();

	const chat = $derived(data.sharedChat);
	const author = $derived(chat.user);
</script>

<svelte:head>
	<title>{chat.title} | {m.shared_chat_title()}</title>
	<meta
		name="description"
		content={m.shared_chat_description({ author: author.name || author.username })} />
</svelte:head>

<div class="mx-auto w-full max-w-4xl py-8">
	<!-- Header -->
	<Card class="mb-6">
		<CardHeader>
			<div class="flex items-start justify-between">
				<div class="space-y-2">
					<CardTitle class="flex items-center gap-2">
						<MessageCircleIcon class="size-5" />
						{chat.title}
					</CardTitle>
					<CardDescription>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html m.shared_chat_shared_by({ author: author.name || author.username })}
					</CardDescription>
				</div>
				<Badge variant="secondary" class="shrink-0">{m.shared_chat_badge()}</Badge>
			</div>
		</CardHeader>
	</Card>

	<!-- Messages -->
	<div class="space-y-4">
		{#each chat.messages as msg (msg.id)}
			{#if msg.role === 'user'}
				<UserMessage
					msg={{
						...msg,
						parts: [],
						hasAttachments: msg.hasAttachments || (msg.attachments && msg.attachments.length > 0),
						reasoning: msg.reasoning || undefined,
					}} />
			{:else if msg.role === 'assistant'}
				<AssistantMessage
					msg={{
						...msg,
						parts: [],
						model: msg.model || 'unknown',
						reasoning: msg.reasoning || undefined,
						sources: msg.sources || undefined,
					}}
					chatId={chat.id}
					isSharedView={true} />
			{/if}
		{/each}
	</div>

	<!-- Footer -->
	<div class="mt-12 text-center">
		<Card class="bg-muted/50">
			<CardContent class="pt-6">
				<div class="flex flex-col items-center gap-4">
					<div class="text-sm text-muted-foreground">{m.shared_chat_footer_question()}</div>
					<Button href="/" variant="outline">
						<ExternalLinkIcon class="size-4" />
						{m.shared_chat_footer_cta()}
					</Button>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
