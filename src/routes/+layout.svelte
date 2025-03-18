<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="bg-gradient-to-br from-red-50 via-red-100 to-red-200">
	{@render children()}
  </div>