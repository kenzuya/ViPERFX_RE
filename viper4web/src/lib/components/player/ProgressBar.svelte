<script lang="ts">
  /**
   * ProgressBar - Audio progress bar with seek functionality
   *
   * Provides a clickable seek bar with current time and duration display
   * for the music player interface.
   */

  import { cn } from '$lib/utils';
  import * as Tooltip from '$lib/components/ui/tooltip';

  interface Props {
    /** Current playback time in seconds */
    currentTime?: number;
    /** Total duration in seconds */
    duration?: number;
    /** Whether the progress bar is disabled */
    disabled?: boolean;
    /** Callback when user seeks to a position (time in seconds) */
    onSeek?: (time: number) => void;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    currentTime = 0,
    duration = 0,
    disabled = false,
    onSeek,
    class: className,
  }: Props = $props();

  // Calculate progress percentage
  const progress = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);

  /**
   * Format seconds into MM:SS format
   */
  function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Handle click on the progress bar to seek
   */
  function handleClick(event: MouseEvent) {
    if (disabled || duration <= 0) return;

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const seekTime = percent * duration;

    onSeek?.(seekTime);
  }

  /**
   * Handle keyboard interaction for accessibility
   */
  function handleKeyDown(event: KeyboardEvent) {
    if (disabled || duration <= 0) return;

    const step = duration * 0.05; // 5% of duration
    let newTime = currentTime;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newTime = Math.max(0, currentTime - step);
        break;
      case 'ArrowRight':
        event.preventDefault();
        newTime = Math.min(duration, currentTime + step);
        break;
      case 'Home':
        event.preventDefault();
        newTime = 0;
        break;
      case 'End':
        event.preventDefault();
        newTime = duration;
        break;
      default:
        return;
    }

    onSeek?.(newTime);
  }
</script>

<div class={cn('mb-4', className)}>
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <div
          {...props}
          role="slider"
          tabindex={disabled ? -1 : 0}
          aria-label="Seek audio"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          aria-disabled={disabled}
          class={cn(
            'h-2 bg-dark-700 rounded-full overflow-hidden relative group',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          )}
          onclick={handleClick}
          onkeydown={handleKeyDown}
        >
          <!-- Progress fill -->
          <div
            class="h-full bg-gradient-to-r from-viper-600 to-viper-400 rounded-full transition-all"
            style="width: {progress}%"
          ></div>

          <!-- Hover indicator (thumb) -->
          {#if !disabled}
            <div
              class="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style="left: calc({progress}% - 6px)"
            ></div>
          {/if}
        </div>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Click to seek</p>
    </Tooltip.Content>
  </Tooltip.Root>

  <!-- Time display -->
  <div class="flex justify-between text-sm text-dark-400 mt-1">
    <span>{formatTime(currentTime)}</span>
    <span>{formatTime(duration)}</span>
  </div>
</div>
