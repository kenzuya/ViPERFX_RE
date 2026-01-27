<script lang="ts">
  /**
   * MusicPlayer - Main audio player component
   *
   * Combines drag-drop file zone, progress bar, player controls, and queue list
   * into a cohesive music player interface. This is the main component for audio playback.
   * Uses Card component for consistent styling with effect cards.
   */

  import { cn } from '$lib/utils';
  import type { AudioQueueItem, RepeatMode } from '$lib/types/viper';
  import * as Card from '$lib/components/ui/card';
  import PlayerControls from './PlayerControls.svelte';
  import ProgressBar from './ProgressBar.svelte';
  import QueueList from './QueueList.svelte';

  interface Props {
    /** Current audio file name being played */
    audioFileName?: string | null;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Whether audio is loading */
    isLoadingAudio?: boolean;
    /** Current playback time in seconds */
    currentTime?: number;
    /** Total duration in seconds */
    duration?: number;
    /** Callback when play is clicked */
    onPlay?: () => void;
    /** Callback when pause is clicked */
    onPause?: () => void;
    /** Callback when stop is clicked */
    onStop?: () => void;
    /** Callback when user seeks to a position */
    onSeek?: (time: number) => void;
    /** Queue of audio items */
    queue?: AudioQueueItem[];
    /** Index of currently playing track */
    currentQueueIndex?: number;
    /** Current repeat mode */
    repeatMode?: RepeatMode;
    /** Callback when files are added to queue */
    onAddToQueue?: (files: File[]) => void;
    /** Callback when a track is removed from queue */
    onRemoveFromQueue?: (id: string) => void;
    /** Callback when queue is cleared */
    onClearQueue?: () => void;
    /** Callback when a specific track is selected to play */
    onPlayTrack?: (index: number) => void;
    /** Callback to play next track */
    onPlayNext?: () => void;
    /** Callback to play previous track */
    onPlayPrevious?: () => void;
    /** Callback to toggle repeat mode */
    onToggleRepeat?: () => void;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    audioFileName = null,
    isPlaying = false,
    isLoadingAudio = false,
    currentTime = 0,
    duration = 0,
    onPlay,
    onPause,
    onStop,
    onSeek,
    queue = [],
    currentQueueIndex = -1,
    repeatMode = 'off',
    onAddToQueue,
    onRemoveFromQueue,
    onClearQueue,
    onPlayTrack,
    onPlayNext,
    onPlayPrevious,
    onToggleRepeat,
    class: className,
  }: Props = $props();

  // Reference to hidden file input
  let fileInputRef: HTMLInputElement | null = $state(null);

  // Track drag state for visual feedback
  let isDragging = $state(false);

  // Controls are disabled when no audio is loaded or when audio is loading
  const controlsDisabled = $derived(!audioFileName || isLoadingAudio);
  const hasQueue = $derived(queue.length > 0);

  /**
   * Handle file input change
   */
  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      onAddToQueue?.(Array.from(files));
    }
    // Reset input so same file can be selected again
    target.value = '';
  }

  /**
   * Handle drop event on the drop zone
   */
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (isLoadingAudio) return;

    const files = e.dataTransfer?.files;
    if (files) {
      const audioFiles = Array.from(files).filter(f => f.type.startsWith('audio/'));
      if (audioFiles.length > 0) {
        onAddToQueue?.(audioFiles);
      }
    }
  }

  /**
   * Handle drag over event
   */
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (!isLoadingAudio) {
      isDragging = true;
    }
  }

  /**
   * Handle drag leave event
   */
  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  /**
   * Open file picker dialog
   */
  function openFilePicker() {
    if (!isLoadingAudio) {
      fileInputRef?.click();
    }
  }
</script>

<Card.Root class={cn('transition-all duration-200', className)}>
  <Card.Header class="pb-4">
    <Card.Title class="text-base font-medium flex items-center gap-2">
      <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
      Music Player
    </Card.Title>
  </Card.Header>
  <Card.Content class="space-y-4">
    <!-- Hidden file input -->
    <input
      bind:this={fileInputRef}
      type="file"
      accept="audio/*"
      multiple
      onchange={handleFileChange}
      class="hidden"
      disabled={isLoadingAudio}
    />

    <!-- File Drop Zone -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      ondrop={handleDrop}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      onclick={openFilePicker}
      class={cn(
        'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
        isLoadingAudio
          ? 'border-muted cursor-wait opacity-75'
          : isDragging
            ? 'border-primary-400 bg-primary-500/10'
            : 'border-muted hover:border-primary-500 cursor-pointer'
      )}
    >
      {#if isLoadingAudio}
        <!-- Loading state -->
        <div class="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p class="text-primary-400 font-medium">Loading audio...</p>
        <p class="text-muted-foreground text-sm mt-1">{audioFileName}</p>
      {:else}
        <!-- Default/ready state -->
        <svg class="w-12 h-12 mx-auto mb-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        {#if audioFileName}
          <p class="text-foreground font-medium">{audioFileName}</p>
        {:else}
          <p class="text-muted-foreground">Drop audio files here or click to browse</p>
          <p class="text-muted-foreground text-sm mt-1">MP3, WAV, FLAC, OGG supported (multiple files allowed)</p>
        {/if}
      {/if}
    </div>

    <!-- Progress Bar -->
    <ProgressBar
      {currentTime}
      {duration}
      disabled={controlsDisabled}
      {onSeek}
    />

    <!-- Player Controls -->
    <PlayerControls
      {isPlaying}
      isLoading={isLoadingAudio}
      disabled={controlsDisabled}
      {hasQueue}
      {repeatMode}
      {onPlay}
      {onPause}
      {onStop}
      onPrevious={onPlayPrevious}
      onNext={onPlayNext}
      {onToggleRepeat}
    />

    <!-- Queue List -->
    <QueueList
      {queue}
      currentIndex={currentQueueIndex}
      {onPlayTrack}
      onRemoveTrack={onRemoveFromQueue}
      {onClearQueue}
      onAddFiles={onAddToQueue}
    />
  </Card.Content>
</Card.Root>
