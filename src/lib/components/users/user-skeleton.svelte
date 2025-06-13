<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="space-y-4">
	<!-- Header skeleton -->
	<div class="flex items-center justify-between">
		<div class="flex h-8 items-center gap-2">
			<Skeleton class="h-4 w-4" />
			<Skeleton class="h-4 w-24" />
		</div>
		<Skeleton class="h-8 w-32" />
	</div>

	<!-- User list skeleton -->
	<div class="space-y-2">
		{#each [1, 2, 3, 4, 5] as i (i)}
			<div class="flex items-center gap-4 rounded-lg border border-gray-200 p-4">
				<Skeleton class="h-4 w-4" />
				<Skeleton class="h-12 w-12 rounded-full" />
				<div class="flex flex-1 flex-col gap-2">
					<Skeleton class="h-4 w-32" />
					<Skeleton class="h-3 w-48" />
				</div>
				<Skeleton class="h-8 w-8" />
			</div>
		{/each}
	</div>
</div>
