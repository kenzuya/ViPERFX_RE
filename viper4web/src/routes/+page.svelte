<script lang="ts">
	/**
	 * Main Application Page
	 *
	 * The main entry point for ViPER4Web application. Combines Header,
	 * MusicPlayer, EffectsPanel, and Footer into a cohesive interface
	 * with loading state and error display handling.
	 */

	import { onMount, onDestroy } from 'svelte';
	import { createViperAudio } from '$lib/hooks/viper-audio.svelte';
	import { effectState } from '$lib/stores/effect-state';
	import { audioQueue } from '$lib/stores/audio-queue';
	import { Header } from '$lib/components/layout';
	import MusicPlayer from '$lib/components/player/MusicPlayer.svelte';
	import EffectsPanel from '$lib/components/effects/EffectsPanel.svelte';

	// Create the ViPER audio controller
	const viperAudio = createViperAudio();

	// Initialize on mount
	onMount(() => {
		viperAudio.init();
	});

	// Cleanup on destroy
	onDestroy(() => {
		viperAudio.destroy();
	});
</script>

{#if viperAudio.isLoading}
	<!-- Loading State -->
	<div class="flex min-h-screen items-center justify-center bg-background">
		<div class="text-center">
			<div
				class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"
			></div>
			<p class="text-muted-foreground">Loading ViPER4Web...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-background">
		<!-- Header -->
		<Header
			version={viperAudio.version ?? undefined}
			architecture={viperAudio.architecture ?? undefined}
			onMasterToggle={(checked) => viperAudio.updateEffect('enabled', checked)}
		/>

		<!-- Main Content -->
		<main class="mx-auto max-w-7xl px-4 py-6">
			<!-- Error Display - hidden when loading audio -->
			{#if viperAudio.error && !viperAudio.isLoadingAudio}
				<div class="mb-6 rounded-xl border border-red-700 bg-red-900/50 p-4">
					<div class="flex items-start justify-between gap-3">
						<div class="flex items-start gap-2">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
								/>
							</svg>
							<div>
								<p class="font-medium text-red-400">{viperAudio.error}</p>
								{#if viperAudio.error.includes('ViPER')}
									<p class="mt-1 text-sm text-red-300">
										Make sure to build the WASM module first by running
										<code class="rounded bg-background/80 px-2 py-1">./build-web.sh</code>
									</p>
								{/if}
							</div>
						</div>
						<button
							onclick={() => viperAudio.clearError()}
							class="flex-shrink-0 p-1 text-red-400 hover:text-red-300"
							title="Dismiss"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>
			{/if}

			<!-- Music Player -->
			<section class="mb-8">
				<h2 class="mb-4 text-lg font-semibold text-foreground">Music Player</h2>
				<MusicPlayer
					audioFileName={viperAudio.audioFileName}
					isPlaying={viperAudio.isPlaying}
					isLoadingAudio={viperAudio.isLoadingAudio}
					currentTime={viperAudio.currentTime}
					duration={viperAudio.duration}
					onPlay={() => viperAudio.play()}
					onPause={() => viperAudio.pause()}
					onStop={() => viperAudio.stop()}
					onSeek={(time) => viperAudio.seek(time)}
					queue={$audioQueue.queue}
					currentQueueIndex={$audioQueue.currentIndex}
					repeatMode={$audioQueue.repeatMode}
					onAddToQueue={(files) => viperAudio.addToQueue(files)}
					onRemoveFromQueue={(id) => viperAudio.removeFromQueue(id)}
					onClearQueue={() => viperAudio.clearQueue()}
					onPlayTrack={(index) => viperAudio.playTrack(index)}
					onPlayNext={() => viperAudio.playNext()}
					onPlayPrevious={() => viperAudio.playPrevious()}
					onToggleRepeat={() => viperAudio.toggleRepeat()}
				/>
			</section>

			<!-- Effects Panel -->
			<section>
				<h2 class="mb-4 text-lg font-semibold text-foreground">Effects</h2>
				<EffectsPanel
					effectState={$effectState}
					onUpdateEffect={(key, value) => viperAudio.updateEffect(key, value)}
					onUpdateEqualizerBand={(bandIndex, gain) =>
						viperAudio.updateEqualizerBand(bandIndex, gain)}
				/>
			</section>
		</main>

		<!-- Footer -->
		<footer class="mt-8 border-t border-border py-6">
			<div class="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
				<p>ViPER4Web - Audio Effect Processor</p>
				<p class="mt-1">Based on ViPER4Android by viper.WYF, Martmists, Iscle</p>
			</div>
		</footer>
	</div>
{/if}
