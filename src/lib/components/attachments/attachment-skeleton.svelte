<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<!-- Skeleton for attachments page -->
<div class="space-y-4">
	<!-- Header skeleton -->
	<div class="space-y-2">
		<Skeleton class="h-8 w-48" />
		<Skeleton class="h-4 w-96" />
	</div>

	<!-- Select all skeleton -->
	<div class="flex items-center gap-2">
		<Skeleton class="h-4 w-4" />
		<Skeleton class="h-4 w-20" />
	</div>

	<!-- List skeleton -->
	<div class="space-y-2">
		{#each Array.from({ length: 6 }, (_, i) => i) as i (i)}
			<div class="flex items-center gap-4 rounded-lg border border-gray-200 p-4">
				<Skeleton class="h-4 w-4" />
				<Skeleton class="h-12 w-12 rounded" />
				<div class="flex flex-1 flex-col gap-2">
					<Skeleton class="h-4 w-48" />
					<Skeleton class="h-3 w-24" />
				</div>
				<Skeleton class="h-8 w-8" />
			</div>
		{/each}
	</div>
</div>
