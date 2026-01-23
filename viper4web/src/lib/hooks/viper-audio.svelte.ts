/**
 * ViPER4Web Audio Hook
 *
 * Svelte 5 hook for managing ViPER audio processing.
 * Uses MusicPlayer class for playback and ViperEffect class for effects.
 * This provides clear separation of concerns between playback and effect management.
 */

import type { ViperEffectState } from '$lib/types/viper';
import { MusicPlayer, type MusicPlayerState } from '$lib/classes/MusicPlayer';
import { ViperEffect } from '$lib/classes/ViperEffect';
import { getEffectState } from '$lib/stores/effect-state';
import { audioQueue, getAudioQueueState } from '$lib/stores/audio-queue';

/**
 * ViPER Audio State
 */
export interface ViperAudioState {
  // Loading states
  isLoading: boolean;
  isLoadingAudio: boolean;
  isPlaying: boolean;
  error: string | null;

  // Module info
  version: string | null;
  architecture: string | null;

  // Playback state
  currentTime: number;
  duration: number;
  audioFileName: string | null;
}

/**
 * Create ViPER Audio state and actions
 *
 * This is a Svelte 5 runes-based hook that manages audio processing.
 * It uses the MusicPlayer class for playback and ViperEffect class for effects.
 */
export function createViperAudio() {
  // Reactive state using Svelte 5 runes
  let isLoading = $state(true);
  let isLoadingAudio = $state(false);
  let isPlaying = $state(false);
  let error = $state<string | null>(null);
  let version = $state<string | null>(null);
  let architecture = $state<string | null>(null);
  let currentTime = $state(0);
  let duration = $state(0);
  let audioFileName = $state<string | null>(null);

  // Class instances
  let musicPlayer: MusicPlayer | null = null;
  let viperEffect: ViperEffect | null = null;

  /**
   * Handle player state changes
   */
  function handlePlayerStateChange(state: MusicPlayerState): void {
    isPlaying = state.isPlaying;
    isLoadingAudio = state.isLoadingAudio;
    currentTime = state.currentTime;
    duration = state.duration;
    audioFileName = state.audioFileName;
  }

  /**
   * Handle player errors
   */
  function handlePlayerError(err: string): void {
    error = err;
  }

  /**
   * Handle track end
   */
  function handleTrackEnd(): void {
    const queueState = getAudioQueueState();
    const currentIndex = queueState.currentIndex;
    const queue = queueState.queue;
    const repeat = queueState.repeatMode;

    if (repeat === 'one') {
      // Repeat current track
      musicPlayer?.restart();
    } else if (currentIndex < queue.length - 1) {
      // Play next track
      playTrackInternal(currentIndex + 1);
    } else if (repeat === 'all' && queue.length > 0) {
      // Loop back to first track
      playTrackInternal(0);
    } else {
      // End of queue
      currentTime = 0;
    }
  }

  /**
   * Process audio through WASM and send back to worklet
   */
  function processAudioCallback(inputL: Float32Array, inputR: Float32Array, sequence: number): void {
    if (!viperEffect || !musicPlayer) return;

    const result = viperEffect.processAudio(inputL, inputR);
    if (result) {
      musicPlayer.sendProcessedAudio(result.outputL, result.outputR, sequence);
    }
  }

  /**
   * Initialize ViPER WASM and audio system
   */
  async function initViper(): Promise<void> {
    try {
      // Create ViperEffect instance for effect management
      viperEffect = new ViperEffect({
        onInitialized: (v, a) => {
          version = v;
          architecture = a;
          isLoading = false;
        },
        onError: (err) => {
          error = err;
          isLoading = false;
        },
      });

      // Initialize WASM module - this loads effect state from localStorage
      const success = await viperEffect.initialize();
      if (!success) {
        return;
      }

      // Create MusicPlayer instance for playback management
      musicPlayer = new MusicPlayer({
        onStateChange: handlePlayerStateChange,
        onError: handlePlayerError,
        onTrackEnd: handleTrackEnd,
      });

      // Set up audio processor callback
      musicPlayer.setAudioProcessor(processAudioCallback);

      isLoading = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to initialize ViPER';
      isLoading = false;
    }
  }

  /**
   * Cleanup resources
   */
  function cleanup(): void {
    musicPlayer?.cleanup();
    viperEffect?.cleanup();
    musicPlayer = null;
    viperEffect = null;
  }

  /**
   * Load an audio file
   */
  async function loadAudioFile(file: File): Promise<void> {
    if (!viperEffect || !musicPlayer) {
      error = 'ViPER not initialized';
      return;
    }

    error = null;

    // Initialize worklet with current enabled state
    const state = getEffectState();
    await musicPlayer.initAudioWorklet(state.enabled);

    // Load the audio file
    const buffer = await musicPlayer.loadAudioFile(file);
    if (buffer) {
      // Set sample rate in ViperEffect
      viperEffect.setSampleRate(buffer.sampleRate);
    }
  }

  /**
   * Play audio
   */
  async function play(): Promise<void> {
    if (!musicPlayer) {
      error = 'Player not initialized';
      return;
    }

    const state = getEffectState();
    await musicPlayer.initAudioWorklet(state.enabled);
    await musicPlayer.play();
  }

  /**
   * Pause audio
   */
  function pause(): void {
    musicPlayer?.pause();
  }

  /**
   * Stop audio
   */
  function stop(): void {
    musicPlayer?.stop();
  }

  /**
   * Seek to a specific time
   */
  function seek(time: number): void {
    musicPlayer?.seek(time);
  }

  /**
   * Update a single effect
   */
  function updateEffect<K extends keyof ViperEffectState>(key: K, value: ViperEffectState[K]): void {
    if (!viperEffect) return;

    viperEffect.updateEffect(key, value);

    // Notify worklet for immediate bypass when master enabled state changes
    if (key === 'enabled' && musicPlayer) {
      musicPlayer.setWorkletEnabled(value as boolean);
    }
  }

  /**
   * Update a single equalizer band
   */
  function updateEqualizerBand(bandIndex: number, gain: number): void {
    viperEffect?.updateEqualizerBand(bandIndex, gain);
  }

  /**
   * Reset all effects to defaults
   */
  function resetEffects(): void {
    viperEffect?.resetEffects();
  }

  /**
   * Clear the current error
   */
  function clearError(): void {
    error = null;
    viperEffect?.clearError();
  }

  /**
   * Apply all effects
   */
  function applyAllEffects(): void {
    viperEffect?.applyAllEffects();
  }

  /**
   * Internal function to play a track by index
   */
  async function playTrackInternal(index: number): Promise<void> {
    if (!musicPlayer || !viperEffect) return;

    const queueState = getAudioQueueState();
    const queue = queueState.queue;

    if (index < 0 || index >= queue.length) return;

    const item = queue[index];
    error = null;

    // Increment sequence first to invalidate any pending onended handlers
    musicPlayer.incrementPlaybackSequence();

    // Stop any existing playback
    musicPlayer.stop();

    // Update current index in queue store
    audioQueue.setCurrentIndex(index);

    // Initialize worklet
    const state = getEffectState();
    await musicPlayer.initAudioWorklet(state.enabled);

    // If buffer is already loaded, use it
    if (item.buffer) {
      musicPlayer.setAudioBuffer(item.buffer, item.name);
      viperEffect.setSampleRate(item.buffer.sampleRate);
      await musicPlayer.startPlayback();
    } else {
      // Need to decode the buffer first
      isLoadingAudio = true;
      audioFileName = item.name;

      try {
        const ctx = musicPlayer.getAudioContext() || new AudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const arrayBuffer = await item.file.arrayBuffer();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

        // Update the queue item with the buffer
        audioQueue.updateItemBuffer(item.id, decodedBuffer);

        musicPlayer.setAudioBuffer(decodedBuffer, item.name);
        viperEffect.setSampleRate(decodedBuffer.sampleRate);

        isLoadingAudio = false;
        await musicPlayer.startPlayback();
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load track';
        isLoadingAudio = false;
      }
    }
  }

  /**
   * Add files to queue
   */
  async function addToQueue(files: File[]): Promise<void> {
    if (!musicPlayer) return;

    const wasEmpty = getAudioQueueState().queue.length === 0;
    await musicPlayer.addToQueue(files);

    // If queue was empty and we added items, auto-play the first one
    if (wasEmpty && files.length > 0 && viperEffect) {
      const state = getEffectState();
      await musicPlayer.initAudioWorklet(state.enabled);
      setTimeout(() => playTrackInternal(0), 50);
    }
  }

  /**
   * Remove a track from the queue
   */
  function removeFromQueue(id: string): void {
    musicPlayer?.removeFromQueue(id);
  }

  /**
   * Clear the entire queue
   */
  function clearQueue(): void {
    musicPlayer?.clearQueue();
  }

  /**
   * Play a specific track by index
   */
  function playTrack(index: number): void {
    playTrackInternal(index);
  }

  /**
   * Play the next track
   */
  function playNext(): void {
    const queueState = getAudioQueueState();
    const queue = queueState.queue;
    const currentIndex = queueState.currentIndex;

    if (queue.length === 0) return;

    // If no track is currently selected, start from the beginning
    if (currentIndex < 0) {
      playTrackInternal(0);
      return;
    }

    if (currentIndex < queue.length - 1) {
      playTrackInternal(currentIndex + 1);
    } else if (queueState.repeatMode === 'all') {
      playTrackInternal(0);
    }
  }

  /**
   * Play the previous track
   */
  function playPrevious(): void {
    const queueState = getAudioQueueState();
    const queue = queueState.queue;
    const currentIdx = queueState.currentIndex;

    if (queue.length === 0) return;

    // If no track is currently selected, start from the beginning
    if (currentIdx < 0) {
      playTrackInternal(0);
      return;
    }

    // Calculate current position for 3-second check
    const currentPosition = musicPlayer?.getCurrentPosition() || 0;

    // If more than 3 seconds into track, restart current track
    if (currentPosition > 3) {
      musicPlayer?.restart();
      return;
    }

    if (currentIdx > 0) {
      playTrackInternal(currentIdx - 1);
    } else if (queueState.repeatMode === 'all') {
      playTrackInternal(queue.length - 1);
    }
  }

  /**
   * Toggle repeat mode
   */
  function toggleRepeat(): void {
    audioQueue.toggleRepeat();
  }

  // Return the state getters and actions
  return {
    // State getters (these are reactive in Svelte 5)
    get isLoading() {
      return isLoading;
    },
    get isLoadingAudio() {
      return isLoadingAudio;
    },
    get isPlaying() {
      return isPlaying;
    },
    get error() {
      return error;
    },
    get version() {
      return version;
    },
    get architecture() {
      return architecture;
    },
    get currentTime() {
      return currentTime;
    },
    get duration() {
      return duration;
    },
    get audioFileName() {
      return audioFileName;
    },

    // Initialization and cleanup
    init: initViper,
    destroy: cleanup,

    // Playback actions
    loadAudioFile,
    play,
    pause,
    stop,
    seek,

    // Effect actions
    updateEffect,
    updateEqualizerBand,
    resetEffects,
    clearError,
    applyAllEffects,

    // Queue actions
    addToQueue,
    removeFromQueue,
    clearQueue,
    playTrack,
    playNext,
    playPrevious,
    toggleRepeat,
  };
}

/**
 * Type for the ViPER Audio hook return value
 */
export type ViperAudio = ReturnType<typeof createViperAudio>;
