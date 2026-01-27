<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from "mode-watcher";

	let { children } = $props();

	// Global error state for error boundary
	let globalError = $state<Error | null>(null);

	function handleGlobalError(event: ErrorEvent) {
		globalError = event.error || new Error(event.message);
	}

	function clearError() {
		globalError = null;
	}

	$effect(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('error', handleGlobalError);
			return () => {
				window.removeEventListener('error', handleGlobalError);
			};
		}
	});
</script>

<svelte:head>
	<!-- Basic Meta Tags -->
	<title>ViPER4Web - Audio Effect Processor</title>
	<meta name="description" content="ViPER4Web - A web-based audio effect processor based on ViPER4Android. Apply professional audio effects like equalizer, bass boost, surround sound, and more." />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta charset="UTF-8" />
	<meta name="theme-color" content="#9333ea" />
	<meta name="color-scheme" content="dark" />

	<!-- Favicon and Icons -->
	<link rel="icon" type="image/svg+xml" href={favicon} />
	<link rel="apple-touch-icon" href={favicon} />
	<link rel="shortcut icon" href={favicon} />
	<link rel="mask-icon" href={favicon} color="#9333ea" />

	<!-- Open Graph / Social Media -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="ViPER4Web - Audio Effect Processor" />
	<meta property="og:description" content="A web-based audio effect processor with equalizer, bass boost, surround sound, and more." />
	<meta property="og:site_name" content="ViPER4Web" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="ViPER4Web - Audio Effect Processor" />
	<meta name="twitter:description" content="A web-based audio effect processor with professional audio effects." />

	<!-- Additional Meta -->
	<meta name="application-name" content="ViPER4Web" />
	<meta name="author" content="ViPER4Android Team" />
	<meta name="keywords" content="viper, audio, effects, equalizer, bass boost, surround, web audio, wasm" />
</svelte:head>

<!-- Mode watcher for dark theme - defaults to dark -->
<ModeWatcher defaultMode="dark" />

<!-- Global Error Boundary -->
{#if globalError}
	<div class="min-h-screen bg-dark-900 flex items-center justify-center p-4">
		<div class="max-w-md w-full bg-red-900/50 border border-red-700 rounded-xl p-6">
			<div class="flex items-start gap-3">
				<svg class="w-6 h-6 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
				</svg>
				<div class="flex-1">
					<h2 class="text-lg font-semibold text-red-400 mb-2">Something went wrong</h2>
					<p class="text-red-300 text-sm mb-4">{globalError.message}</p>
					<button
						onclick={clearError}
						class="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm text-white transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		</div>
	</div>
{:else}
	{@render children()}
{/if}
