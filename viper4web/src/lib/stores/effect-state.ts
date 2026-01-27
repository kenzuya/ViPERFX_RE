/**
 * ViPER4Web Effect State Store
 *
 * Svelte store for managing ViPER effect state with localStorage persistence.
 * Automatically syncs state changes to localStorage for persistence across sessions.
 */

import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import type { ViperEffectState } from '$lib/types/viper';
import { defaultEffectState } from '$lib/types/viper';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '$lib/utils/storage';

/**
 * Load effect state from localStorage, merging with defaults
 * to ensure all fields exist (in case new fields were added)
 */
function loadPersistedState(): ViperEffectState {
  const saved = getStorageItem<Partial<ViperEffectState>>(STORAGE_KEYS.EFFECT_STATE, {});

  // Validate that it has the expected structure by checking if it's a non-empty object
  // We check for any known property to determine if it's a valid saved state
  if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
    // Merge with defaults to ensure all properties exist (handles schema migrations)
    return { ...defaultEffectState, ...saved };
  }

  return defaultEffectState;
}

/**
 * Save effect state to localStorage
 */
function saveState(state: ViperEffectState): void {
  setStorageItem(STORAGE_KEYS.EFFECT_STATE, state);
}

/**
 * Create the effect state store with persistence
 */
function createEffectStateStore(): Writable<ViperEffectState> & {
  updateEffect: <K extends keyof ViperEffectState>(key: K, value: ViperEffectState[K]) => void;
  updateEqualizerBand: (bandIndex: number, gain: number) => void;
  reset: () => void;
} {
  const { subscribe, set, update } = writable<ViperEffectState>(loadPersistedState());

  // Subscribe to changes and persist to localStorage
  // Use a flag to skip the initial subscription call and ensure we're in a browser
  let initialized = false;
  subscribe((state) => {
    // Skip initial subscription call during SSR or before hydration
    // Also check if we're in the browser by verifying window exists
    if (initialized && typeof window !== 'undefined') {
      saveState(state);
    }
    initialized = true;
  });

  return {
    subscribe,
    set: (value: ViperEffectState) => {
      set(value);
    },
    update,

    /**
     * Update a single effect property
     * @param key - The effect property key
     * @param value - The new value
     */
    updateEffect: <K extends keyof ViperEffectState>(key: K, value: ViperEffectState[K]) => {
      update((state) => ({ ...state, [key]: value }));
    },

    /**
     * Update a single equalizer band
     * @param bandIndex - The band index (0-9)
     * @param gain - The gain value in dB
     */
    updateEqualizerBand: (bandIndex: number, gain: number) => {
      update((state) => {
        const newBands = [...state.firEqualizerBands];
        if (bandIndex >= 0 && bandIndex < newBands.length) {
          newBands[bandIndex] = gain;
        }
        return { ...state, firEqualizerBands: newBands };
      });
    },

    /**
     * Reset all effects to default values
     */
    reset: () => {
      set(defaultEffectState);
    },
  };
}

/**
 * The main effect state store
 * Persists to localStorage automatically on changes
 */
export const effectState = createEffectStateStore();

/**
 * Derived store: Check if ViPER processing is enabled
 */
export const isViperEnabled: Readable<boolean> = derived(
  effectState,
  ($state) => $state.enabled
);

/**
 * Derived store: Check if any effect is currently active
 */
export const hasActiveEffects: Readable<boolean> = derived(
  effectState,
  ($state) =>
    $state.enabled &&
    ($state.convolverEnabled ||
      $state.vheEnabled ||
      $state.ddcEnabled ||
      $state.spectrumExtendEnabled ||
      $state.firEqualizerEnabled ||
      $state.fieldSurroundEnabled ||
      $state.diffSurroundEnabled ||
      $state.reverbEnabled ||
      $state.agcEnabled ||
      $state.dynamicSystemEnabled ||
      $state.viperBassEnabled ||
      $state.viperClarityEnabled ||
      $state.cureEnabled ||
      $state.tubeSimulatorEnabled ||
      $state.analogXEnabled ||
      $state.speakerOptimizationEnabled ||
      $state.fetCompressorEnabled)
);

/**
 * Derived store: Get equalizer bands
 */
export const equalizerBands: Readable<number[]> = derived(
  effectState,
  ($state) => $state.firEqualizerBands
);

/**
 * Derived store: Get output volume (0-100)
 */
export const outputVolume: Readable<number> = derived(
  effectState,
  ($state) => $state.outputVolume
);

/**
 * Derived store: Get output pan (-100 to 100)
 */
export const outputPan: Readable<number> = derived(
  effectState,
  ($state) => $state.outputPan
);

/**
 * Get the current effect state value synchronously
 */
export function getEffectState(): ViperEffectState {
  return get(effectState);
}

/**
 * Re-export default state for reference
 */
export { defaultEffectState };
