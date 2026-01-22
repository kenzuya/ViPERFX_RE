/**
 * Storage Utilities for ViPER4Web
 *
 * Generic localStorage helpers with SSR safety and error handling.
 */

/**
 * Check if localStorage is available (safe for SSR)
 * @returns true if localStorage is available and accessible
 */
export function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return false;
    }
    // Test that we can actually use it
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get an item from localStorage with type safety
 * @param key - The storage key
 * @param defaultValue - Default value if key doesn't exist or parsing fails
 * @returns Parsed value or default
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (!isStorageAvailable()) {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Set an item in localStorage with error handling
 * @param key - The storage key
 * @param value - The value to store (will be JSON stringified)
 * @returns true if successful, false otherwise
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove an item from localStorage
 * @param key - The storage key to remove
 * @returns true if successful, false otherwise
 */
export function removeStorageItem(key: string): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all items from localStorage
 * @returns true if successful, false otherwise
 */
export function clearStorage(): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.clear();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all keys matching a prefix
 * @param prefix - The prefix to match
 * @returns Array of matching keys
 */
export function getStorageKeys(prefix?: string): string[] {
  if (!isStorageAvailable()) {
    return [];
  }

  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null) {
        if (!prefix || key.startsWith(prefix)) {
          keys.push(key);
        }
      }
    }
    return keys;
  } catch {
    return [];
  }
}

/**
 * Storage keys used by ViPER4Web
 */
export const STORAGE_KEYS = {
  EFFECT_STATE: 'viper4web-effect-state',
  AUDIO_QUEUE: 'viper4web-audio-queue',
  PLAYER_STATE: 'viper4web-player-state',
  THEME: 'viper4web-theme',
  VOLUME: 'viper4web-volume',
} as const;

/**
 * Type for storage keys
 */
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
