<script lang="ts">
	interface Props {
		class?: string;
	}

	let { class: className = 'size-4' }: Props = $props();
</script>

<svg class={className} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
	<title>Google</title>
	<path
		d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z"
	></path>
</svg>
