<script lang="ts">
  /**
   * QueueList - Audio queue list component
   *
   * Displays the list of tracks in the queue with track info,
   * playing indicator, remove button, and add files functionality.
   */

  import { cn } from '$lib/utils';
  import type { AudioQueueItem } from '$lib/types/viper';

  interface Props {
    /** List of tracks in the queue */
    queue?: AudioQueueItem[];
    /** Index of currently playing track */
    currentIndex?: number;
    /** Callback when a track is clicked to play */
    onPlayTrack?: (index: number) => void;
    /** Callback when remove button is clicked */
    onRemoveTrack?: (id: string) => void;
    /** Callback when clear all is clicked */
    onClearQueue?: () => void;
    /** Callback when files are added */
    onAddFiles?: (files: File[]) => void;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    queue = [],
    currentIndex = -1,
    onPlayTrack,
    onRemoveTrack,
    onClearQueue,
    onAddFiles,
    class: className,
  }: Props = $props();

  // Reference to hidden file input
  let fileInputRef: HTMLInputElement | null = $state(null);

  /**
   * Format duration in seconds to MM:SS format
   */
  function formatDuration(seconds: number): string {
    if (seconds <= 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Handle file input change - filter for audio files only
   */
  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      const audioFiles = Array.from(files).filter(f => f.type.startsWith('audio/'));
      if (audioFiles.length > 0) {
        onAddFiles?.(audioFiles);
      }
    }
    // Reset input so the same file can be selected again
    target.value = '';
  }

  /**
   * Handle track click to play
   */
  function handleTrackClick(index: number) {
    onPlayTrack?.(index);
  }

  /**
   * Handle remove button click with event propagation stopped
   */
  function handleRemoveClick(e: MouseEvent, id: string) {
    e.stopPropagation();
    onRemoveTrack?.(id);
  }

  /**
   * Open file picker dialog
   */
  function openFilePicker() {
    fileInputRef?.click();
  }
</script>

{#if queue.length === 0}
  <!-- Empty state -->
  <div class={cn('mt-4 p-4 bg-dark-800/50 rounded-xl border border-dark-700', className)}>
    <p class="text-center text-dark-400 text-sm">
      Queue is empty. Add audio files to get started.
    </p>
  </div>
{:else}
  <!-- Queue list -->
  <div class={cn('mt-4 bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden', className)}>
    <!-- Hidden file input -->
    <input
      bind:this={fileInputRef}
      type="file"
      accept="audio/*"
      multiple
      onchange={handleFileChange}
      class="hidden"
    />

    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-dark-700">
      <span class="text-sm text-dark-300">
        Queue ({queue.length} {queue.length === 1 ? 'track' : 'tracks'})
      </span>
      <div class="flex items-center gap-3">
        <button
          onclick={openFilePicker}
          class="text-xs text-dark-400 hover:text-primary-400 transition-colors flex items-center gap-1"
          title="Add files"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
        <button
          onclick={onClearQueue}
          class="text-xs text-dark-400 hover:text-red-400 transition-colors"
        >
          Clear All
        </button>
      </div>
    </div>

    <!-- Track list -->
    <div class="max-h-48 overflow-y-auto">
      {#each queue as item, index (item.id)}
        <div
          role="button"
          tabindex="0"
          onclick={() => handleTrackClick(index)}
          onkeydown={(e) => e.key === 'Enter' && handleTrackClick(index)}
          class={cn(
            'flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors',
            index === currentIndex
              ? 'bg-primary-500/20 border-l-2 border-primary-500'
              : 'hover:bg-dark-700/50 border-l-2 border-transparent'
          )}
        >
          <!-- Track number / playing indicator -->
          <div class="w-6 text-center">
            {#if index === currentIndex}
              <svg class="w-4 h-4 text-primary-400 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            {:else}
              <span class="text-xs text-dark-500">{index + 1}</span>
            {/if}
          </div>

          <!-- Track name -->
          <div class="flex-1 min-w-0">
            <p class={cn(
              'text-sm truncate',
              index === currentIndex ? 'text-white font-medium' : 'text-dark-300'
            )}>
              {item.name}
            </p>
          </div>

          <!-- Duration -->
          <span class="text-xs text-dark-500 font-mono">
            {formatDuration(item.duration)}
          </span>

          <!-- Remove button -->
          <button
            onclick={(e) => handleRemoveClick(e, item.id)}
            class="p-1 text-dark-500 hover:text-red-400 transition-colors"
            title="Remove from queue"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/each}
    </div>
  </div>
{/if}
