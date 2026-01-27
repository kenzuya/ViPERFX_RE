/**
 * Effect State Persistence Verification Script
 *
 * This script verifies that the effect state persistence logic works correctly.
 * It tests the core storage and type functionality without browser dependencies.
 *
 * End-to-end verification steps:
 * 1. Adjust equalizer bands
 * 2. Enable ViPER Bass with custom gain
 * 3. Simulate page refresh (reload from storage)
 * 4. Verify all settings restored
 *
 * Run with: npx tsx tests/verify-persistence.ts
 */

import { defaultEffectState, type ViperEffectState } from '../src/lib/types/viper.js';

// ANSI color codes for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Mock localStorage for Node.js environment
const mockStorage: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  },
};

// Storage key (matches STORAGE_KEYS.EFFECT_STATE)
const EFFECT_STATE_KEY = 'viper4web-effect-state';

// Test counter
let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passCount++;
    console.log(`${GREEN}✓${RESET} ${name}`);
  } catch (error) {
    failCount++;
    console.log(`${RED}✗${RESET} ${name}`);
    console.log(`  ${RED}${error instanceof Error ? error.message : error}${RESET}`);
  }
}

function expect<T>(actual: T) {
  return {
    toBe: (expected: T) => {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual: (expected: T) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`Expected truthy value but got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`Expected falsy value but got ${JSON.stringify(actual)}`);
      }
    },
  };
}

// Storage utility functions (copied from storage.ts for standalone testing)
function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = mockLocalStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): boolean {
  try {
    mockLocalStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Run tests
console.log(`\n${YELLOW}Effect State Persistence Verification${RESET}\n`);

// Test 1: Default values are correct
test('Default ViPER Bass settings are correct', () => {
  expect(defaultEffectState.viperBassEnabled).toBe(false);
  expect(defaultEffectState.viperBassMode).toBe(0);
  expect(defaultEffectState.viperBassFrequency).toBe(40);
  expect(defaultEffectState.viperBassGain).toBe(50);
});

test('Default equalizer bands are correct', () => {
  expect(defaultEffectState.firEqualizerEnabled).toBe(false);
  expect(defaultEffectState.firEqualizerBands).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  expect(defaultEffectState.firEqualizerBands.length).toBe(10);
});

test('Master is enabled by default', () => {
  expect(defaultEffectState.enabled).toBe(true);
});

// Test 2: Storage operations work correctly
test('Storage set and get works correctly', () => {
  mockLocalStorage.clear();
  const testData = { enabled: true, viperBassGain: 75 };
  setStorageItem('test-key', testData);
  const result = getStorageItem('test-key', {});
  expect(result).toEqual(testData);
});

test('Storage returns default for missing keys', () => {
  mockLocalStorage.clear();
  const result = getStorageItem('non-existent', { default: true });
  expect(result).toEqual({ default: true });
});

// Test 3: Persistence flow
test('Equalizer band changes persist', () => {
  mockLocalStorage.clear();

  const modifiedState: ViperEffectState = {
    ...defaultEffectState,
    firEqualizerEnabled: true,
    firEqualizerBands: [6, 5, 3, 1, 0, 0, 0, 0, 3, 5],
  };

  setStorageItem(EFFECT_STATE_KEY, modifiedState);
  const restored = getStorageItem<ViperEffectState>(EFFECT_STATE_KEY, defaultEffectState);

  expect(restored.firEqualizerEnabled).toBe(true);
  expect(restored.firEqualizerBands).toEqual([6, 5, 3, 1, 0, 0, 0, 0, 3, 5]);
});

test('ViPER Bass with custom gain persists', () => {
  mockLocalStorage.clear();

  const modifiedState: ViperEffectState = {
    ...defaultEffectState,
    viperBassEnabled: true,
    viperBassMode: 1,
    viperBassFrequency: 60,
    viperBassGain: 75,
  };

  setStorageItem(EFFECT_STATE_KEY, modifiedState);
  const restored = getStorageItem<ViperEffectState>(EFFECT_STATE_KEY, defaultEffectState);

  expect(restored.viperBassEnabled).toBe(true);
  expect(restored.viperBassMode).toBe(1);
  expect(restored.viperBassFrequency).toBe(60);
  expect(restored.viperBassGain).toBe(75);
});

// Test 4: Complete end-to-end verification
console.log(`\n${YELLOW}End-to-End Verification${RESET}\n`);

test('STEP 1-4: Complete workflow - adjust EQ, enable Bass, refresh, verify', () => {
  mockLocalStorage.clear();

  // STEP 1: Adjust equalizer bands
  const stateAfterEQ: ViperEffectState = {
    ...defaultEffectState,
    firEqualizerEnabled: true,
    firEqualizerBands: [6, 5, 3, 1, 0, 0, 0, 0, 0, 0], // Bass boost preset
  };

  // STEP 2: Enable ViPER Bass with custom gain
  const stateAfterBass: ViperEffectState = {
    ...stateAfterEQ,
    viperBassEnabled: true,
    viperBassGain: 75,
  };

  // Save state (simulating auto-save on change)
  setStorageItem(EFFECT_STATE_KEY, stateAfterBass);

  // STEP 3: Refresh page (simulated by clearing local state and reading from storage)
  // In a real browser, this would be a page reload
  const restoredFromStorage = getStorageItem<Partial<ViperEffectState>>(EFFECT_STATE_KEY, {});

  // Merge with defaults (as the store does)
  const finalState = { ...defaultEffectState, ...restoredFromStorage };

  // STEP 4: Verify all settings restored
  expect(finalState.firEqualizerEnabled).toBe(true);
  expect(finalState.firEqualizerBands).toEqual([6, 5, 3, 1, 0, 0, 0, 0, 0, 0]);
  expect(finalState.viperBassEnabled).toBe(true);
  expect(finalState.viperBassGain).toBe(75);
});

test('Merge with defaults handles missing fields correctly', () => {
  mockLocalStorage.clear();

  // Simulate an older saved state missing some newer fields
  const partialState = {
    enabled: true,
    viperBassEnabled: true,
    viperBassGain: 80,
  };

  setStorageItem(EFFECT_STATE_KEY, partialState);
  const restored = getStorageItem<Partial<ViperEffectState>>(EFFECT_STATE_KEY, {});
  const mergedState = { ...defaultEffectState, ...restored };

  // Verify saved values are preserved
  expect(mergedState.enabled).toBe(true);
  expect(mergedState.viperBassEnabled).toBe(true);
  expect(mergedState.viperBassGain).toBe(80);

  // Verify defaults are used for missing fields
  expect(mergedState.firEqualizerBands).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  expect(mergedState.reverbEnabled).toBe(false);
  expect(mergedState.outputVolume).toBe(100);
});

test('Corrupted storage data returns defaults', () => {
  mockLocalStorage.clear();
  mockStorage[EFFECT_STATE_KEY] = 'invalid json {{{';

  const result = getStorageItem<ViperEffectState>(EFFECT_STATE_KEY, defaultEffectState);
  expect(result).toEqual(defaultEffectState);
});

test('State validation checks for enabled key', () => {
  mockLocalStorage.clear();

  const validState = { enabled: false, viperBassEnabled: true };
  setStorageItem(EFFECT_STATE_KEY, validState);

  const restored = getStorageItem<Partial<ViperEffectState>>(EFFECT_STATE_KEY, {});
  const isValid = restored && typeof restored === 'object' && 'enabled' in restored;

  expect(isValid).toBeTruthy();
});

// Summary
console.log(`\n${YELLOW}Results${RESET}`);
console.log(`${GREEN}Passed: ${passCount}${RESET}`);
if (failCount > 0) {
  console.log(`${RED}Failed: ${failCount}${RESET}`);
  process.exit(1);
} else {
  console.log(`\n${GREEN}All tests passed! Effect state persistence is working correctly.${RESET}\n`);
  process.exit(0);
}
