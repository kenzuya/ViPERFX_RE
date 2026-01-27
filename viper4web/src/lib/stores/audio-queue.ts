/**
 * ViPER4Web Audio Queue Store
 *
 * Svelte store for managing audio playback queue with queue management actions.
 * Handles queue operations, current track index, and repeat mode.
 */

import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import type { AudioQueueItem, RepeatMode } from '$lib/types/viper';

/**
 * Audio Queue State
 */
export interface AudioQueueState {
  /** Array of queued audio items */
  queue: AudioQueueItem[];
  /** Current playing track index (-1 if nothing playing) */
  currentIndex: number;
  /** Repeat mode: 'off', 'one', or 'all' */
  repeatMode: RepeatMode;
}

/**
 * Default queue state
 */
const defaultQueueState: AudioQueueState = {
  queue: [],
  currentIndex: -1,
  repeatMode: 'off',
};

/**
 * Generate unique ID for queue items
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Create the audio queue store with queue management actions
 */
function createAudioQueueStore(): Writable<AudioQueueState> & {
  // Queue actions
  addToQueue: (items: Array<{ file: File; name: string; duration?: number; buffer?: AudioBuffer | null }>) => string[];
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;

  // Playback navigation
  setCurrentIndex: (index: number) => void;
  playTrack: (index: number) => void;
  playNext: () => boolean;
  playPrevious: () => boolean;

  // Repeat mode
  setRepeatMode: (mode: RepeatMode) => void;
  toggleRepeat: () => void;

  // Queue item updates
  updateItem: (id: string, updates: Partial<Omit<AudioQueueItem, 'id'>>) => void;
  updateItemBuffer: (id: string, buffer: AudioBuffer) => void;
  updateItemDuration: (id: string, duration: number) => void;

  // Utility
  getItemById: (id: string) => AudioQueueItem | undefined;
  getCurrentItem: () => AudioQueueItem | undefined;
  reset: () => void;
} {
  const { subscribe, set, update } = writable<AudioQueueState>(defaultQueueState);

  return {
    subscribe,
    set,
    update,

    /**
     * Add items to the queue
     * @param items - Array of items to add
     * @returns Array of generated IDs for the added items
     */
    addToQueue: (items) => {
      const ids: string[] = [];

      update((state) => {
        const newItems: AudioQueueItem[] = items.map((item) => {
          const id = generateId();
          ids.push(id);
          return {
            id,
            file: item.file,
            name: item.name,
            duration: item.duration ?? 0,
            buffer: item.buffer ?? null,
          };
        });

        return {
          ...state,
          queue: [...state.queue, ...newItems],
        };
      });

      return ids;
    },

    /**
     * Remove an item from the queue by ID
     * @param id - The item ID to remove
     */
    removeFromQueue: (id) => {
      update((state) => {
        const itemIndex = state.queue.findIndex((item) => item.id === id);
        if (itemIndex === -1) return state;

        const newQueue = state.queue.filter((item) => item.id !== id);
        let newCurrentIndex = state.currentIndex;

        // Adjust current index if needed
        if (itemIndex < state.currentIndex) {
          // Item before current was removed, shift index down
          newCurrentIndex = state.currentIndex - 1;
        } else if (itemIndex === state.currentIndex) {
          // Current item was removed
          if (newQueue.length === 0) {
            newCurrentIndex = -1;
          } else if (state.currentIndex >= newQueue.length) {
            newCurrentIndex = newQueue.length - 1;
          }
        }

        return {
          ...state,
          queue: newQueue,
          currentIndex: newCurrentIndex,
        };
      });
    },

    /**
     * Clear all items from the queue
     */
    clearQueue: () => {
      update((state) => ({
        ...state,
        queue: [],
        currentIndex: -1,
      }));
    },

    /**
     * Reorder an item in the queue
     * @param fromIndex - Source index
     * @param toIndex - Destination index
     */
    reorderQueue: (fromIndex, toIndex) => {
      update((state) => {
        if (
          fromIndex < 0 ||
          fromIndex >= state.queue.length ||
          toIndex < 0 ||
          toIndex >= state.queue.length ||
          fromIndex === toIndex
        ) {
          return state;
        }

        const newQueue = [...state.queue];
        const [removed] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, removed);

        // Adjust current index based on reorder
        let newCurrentIndex = state.currentIndex;
        if (state.currentIndex === fromIndex) {
          // The current track was moved
          newCurrentIndex = toIndex;
        } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
          // Item moved from before current to after current
          newCurrentIndex = state.currentIndex - 1;
        } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
          // Item moved from after current to before current
          newCurrentIndex = state.currentIndex + 1;
        }

        return {
          ...state,
          queue: newQueue,
          currentIndex: newCurrentIndex,
        };
      });
    },

    /**
     * Set the current track index
     * @param index - The new current index
     */
    setCurrentIndex: (index) => {
      update((state) => ({
        ...state,
        currentIndex: index >= -1 && index < state.queue.length ? index : state.currentIndex,
      }));
    },

    /**
     * Play a specific track by index
     * @param index - The track index to play
     */
    playTrack: (index) => {
      update((state) => ({
        ...state,
        currentIndex: index >= 0 && index < state.queue.length ? index : state.currentIndex,
      }));
    },

    /**
     * Move to the next track in the queue
     * @returns true if there's a next track, false if at end
     */
    playNext: () => {
      let hasNext = false;

      update((state) => {
        if (state.queue.length === 0) return state;

        let newIndex = state.currentIndex;

        if (state.repeatMode === 'one') {
          // Stay on current track
          hasNext = true;
          return state;
        }

        if (state.currentIndex < state.queue.length - 1) {
          // Move to next track
          newIndex = state.currentIndex + 1;
          hasNext = true;
        } else if (state.repeatMode === 'all') {
          // Wrap around to first track
          newIndex = 0;
          hasNext = true;
        } else {
          // No more tracks
          hasNext = false;
        }

        return {
          ...state,
          currentIndex: newIndex,
        };
      });

      return hasNext;
    },

    /**
     * Move to the previous track in the queue
     * @returns true if there's a previous track, false if at start
     */
    playPrevious: () => {
      let hasPrevious = false;

      update((state) => {
        if (state.queue.length === 0) return state;

        let newIndex = state.currentIndex;

        if (state.repeatMode === 'one') {
          // Stay on current track
          hasPrevious = true;
          return state;
        }

        if (state.currentIndex > 0) {
          // Move to previous track
          newIndex = state.currentIndex - 1;
          hasPrevious = true;
        } else if (state.repeatMode === 'all') {
          // Wrap around to last track
          newIndex = state.queue.length - 1;
          hasPrevious = true;
        } else {
          // Already at first track
          hasPrevious = false;
        }

        return {
          ...state,
          currentIndex: newIndex,
        };
      });

      return hasPrevious;
    },

    /**
     * Set the repeat mode
     * @param mode - The repeat mode to set
     */
    setRepeatMode: (mode) => {
      update((state) => ({
        ...state,
        repeatMode: mode,
      }));
    },

    /**
     * Toggle through repeat modes: off -> all -> one -> off
     */
    toggleRepeat: () => {
      update((state) => {
        const modes: RepeatMode[] = ['off', 'all', 'one'];
        const currentModeIndex = modes.indexOf(state.repeatMode);
        const nextMode = modes[(currentModeIndex + 1) % modes.length];

        return {
          ...state,
          repeatMode: nextMode,
        };
      });
    },

    /**
     * Update a queue item's properties
     * @param id - The item ID to update
     * @param updates - Partial updates to apply
     */
    updateItem: (id, updates) => {
      update((state) => ({
        ...state,
        queue: state.queue.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));
    },

    /**
     * Update a queue item's audio buffer
     * @param id - The item ID
     * @param buffer - The AudioBuffer to set
     */
    updateItemBuffer: (id, buffer) => {
      update((state) => ({
        ...state,
        queue: state.queue.map((item) =>
          item.id === id ? { ...item, buffer } : item
        ),
      }));
    },

    /**
     * Update a queue item's duration
     * @param id - The item ID
     * @param duration - The duration in seconds
     */
    updateItemDuration: (id, duration) => {
      update((state) => ({
        ...state,
        queue: state.queue.map((item) =>
          item.id === id ? { ...item, duration } : item
        ),
      }));
    },

    /**
     * Get a queue item by ID
     * @param id - The item ID
     * @returns The item or undefined
     */
    getItemById: (id) => {
      const state = get({ subscribe });
      return state.queue.find((item) => item.id === id);
    },

    /**
     * Get the currently playing item
     * @returns The current item or undefined
     */
    getCurrentItem: () => {
      const state = get({ subscribe });
      if (state.currentIndex >= 0 && state.currentIndex < state.queue.length) {
        return state.queue[state.currentIndex];
      }
      return undefined;
    },

    /**
     * Reset the queue to default state
     */
    reset: () => {
      set(defaultQueueState);
    },
  };
}

/**
 * The main audio queue store
 */
export const audioQueue = createAudioQueueStore();

/**
 * Derived store: Get the current queue
 */
export const queue: Readable<AudioQueueItem[]> = derived(
  audioQueue,
  ($state) => $state.queue
);

/**
 * Derived store: Get the current track index
 */
export const currentIndex: Readable<number> = derived(
  audioQueue,
  ($state) => $state.currentIndex
);

/**
 * Derived store: Get the current repeat mode
 */
export const repeatMode: Readable<RepeatMode> = derived(
  audioQueue,
  ($state) => $state.repeatMode
);

/**
 * Derived store: Get the current track
 */
export const currentTrack: Readable<AudioQueueItem | null> = derived(
  audioQueue,
  ($state) => {
    if ($state.currentIndex >= 0 && $state.currentIndex < $state.queue.length) {
      return $state.queue[$state.currentIndex];
    }
    return null;
  }
);

/**
 * Derived store: Check if queue is empty
 */
export const isQueueEmpty: Readable<boolean> = derived(
  audioQueue,
  ($state) => $state.queue.length === 0
);

/**
 * Derived store: Get queue length
 */
export const queueLength: Readable<number> = derived(
  audioQueue,
  ($state) => $state.queue.length
);

/**
 * Derived store: Check if there's a next track available
 */
export const hasNextTrack: Readable<boolean> = derived(
  audioQueue,
  ($state) => {
    if ($state.queue.length === 0) return false;
    if ($state.repeatMode === 'one' || $state.repeatMode === 'all') return true;
    return $state.currentIndex < $state.queue.length - 1;
  }
);

/**
 * Derived store: Check if there's a previous track available
 */
export const hasPreviousTrack: Readable<boolean> = derived(
  audioQueue,
  ($state) => {
    if ($state.queue.length === 0) return false;
    if ($state.repeatMode === 'one' || $state.repeatMode === 'all') return true;
    return $state.currentIndex > 0;
  }
);

/**
 * Get the current audio queue state synchronously
 */
export function getAudioQueueState(): AudioQueueState {
  return get(audioQueue);
}

/**
 * Re-export default state for reference
 */
export { defaultQueueState };
