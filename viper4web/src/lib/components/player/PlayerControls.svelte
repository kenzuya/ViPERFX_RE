<script lang="ts">
  /**
   * PlayerControls - Audio player control buttons
   *
   * Provides play/pause, stop, previous/next track, and repeat mode buttons
   * for the music player interface.
   */

  import { cn } from '$lib/utils';
  import type { RepeatMode } from '$lib/types/viper';
  import * as Tooltip from '$lib/components/ui/tooltip';

  interface Props {
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Whether audio is currently loading */
    isLoading?: boolean;
    /** Whether controls should be disabled (no audio loaded) */
    disabled?: boolean;
    /** Whether queue has items (for prev/next buttons) */
    hasQueue?: boolean;
    /** Current repeat mode */
    repeatMode?: RepeatMode;
    /** Callback when play is clicked */
    onPlay?: () => void;
    /** Callback when pause is clicked */
    onPause?: () => void;
    /** Callback when stop is clicked */
    onStop?: () => void;
    /** Callback when previous track is clicked */
    onPrevious?: () => void;
    /** Callback when next track is clicked */
    onNext?: () => void;
    /** Callback when repeat mode is toggled */
    onToggleRepeat?: () => void;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    isPlaying = false,
    isLoading = false,
    disabled = false,
    hasQueue = false,
    repeatMode = 'off',
    onPlay,
    onPause,
    onStop,
    onPrevious,
    onNext,
    onToggleRepeat,
    class: className,
  }: Props = $props();

  // Controls are disabled when audio is not loaded or is loading
  const controlsDisabled = $derived(disabled || isLoading);

  // Get repeat mode label for tooltip
  const repeatLabel = $derived(
    repeatMode === 'off' ? 'Off' : repeatMode === 'one' ? 'One' : 'All'
  );

  function handlePlayPause() {
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.();
    }
  }
</script>

<div class={cn('flex items-center justify-center gap-2', className)}>
  <!-- Previous Track -->
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      {#snippet child({ props })}
        <button
          {...props}
          onclick={onPrevious}
          disabled={!hasQueue}
          class="p-3 rounded-full bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Previous track</p>
    </Tooltip.Content>
  </Tooltip.Root>

  <!-- Stop -->
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      {#snippet child({ props })}
        <button
          {...props}
          onclick={onStop}
          disabled={controlsDisabled}
          class="p-3 rounded-full bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Stop</p>
    </Tooltip.Content>
  </Tooltip.Root>

  <!-- Play/Pause -->
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      {#snippet child({ props })}
        <button
          {...props}
          onclick={handlePlayPause}
          disabled={controlsDisabled}
          class="p-4 rounded-full bg-viper-500 hover:bg-viper-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors glow-viper"
        >
          {#if isLoading}
            <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {:else if isPlaying}
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          {:else}
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          {/if}
        </button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>{isPlaying ? 'Pause' : 'Play'}</p>
    </Tooltip.Content>
  </Tooltip.Root>

  <!-- Next Track -->
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      {#snippet child({ props })}
        <button
          {...props}
          onclick={onNext}
          disabled={!hasQueue}
          class="p-3 rounded-full bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Next track</p>
    </Tooltip.Content>
  </Tooltip.Root>

  <!-- Repeat -->
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      {#snippet child({ props })}
        <button
          {...props}
          onclick={onToggleRepeat}
          class={cn(
            'p-3 rounded-full transition-colors',
            repeatMode === 'off'
              ? 'bg-dark-700 hover:bg-dark-600 text-dark-400'
              : 'bg-viper-500/20 hover:bg-viper-500/30 text-viper-400'
          )}
        >
          {#if repeatMode === 'off'}
            <!-- Repeat Off Icon -->
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          {:else if repeatMode === 'all'}
            <!-- Repeat All Icon -->
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
          {:else}
            <!-- Repeat One Icon -->
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              <text x="12" y="14" text-anchor="middle" font-size="8" fill="currentColor" font-weight="bold">1</text>
            </svg>
          {/if}
        </button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Repeat: {repeatLabel}</p>
    </Tooltip.Content>
  </Tooltip.Root>
</div>
