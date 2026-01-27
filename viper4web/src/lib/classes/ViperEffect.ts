/**
 * ViperEffect Class
 *
 * Handles all ViPER audio effect functionality including:
 * - Initial WASM module loading
 * - Effect state management
 * - Effect application to audio
 * - Saving/loading effect state from localStorage
 */

import type { ViperController, ViperModule, ViperEffectState } from '$lib/types/viper';
import { effectState, getEffectState } from '$lib/stores/effect-state';

interface ViperModuleFactory {
  (options?: { locateFile?: (path: string) => string }): Promise<ViperModule>;
}

declare global {
  interface Window {
    ViperModule: ViperModuleFactory;
  }
}

// Buffer size for WASM processing - must match worklet's inputChunkSize
const BUFFER_SIZE = 512;

export interface ViperEffectCallbacks {
  onInitialized?: (version: string, architecture: string) => void;
  onError?: (error: string) => void;
  onEffectChange?: (key: keyof ViperEffectState, value: ViperEffectState[keyof ViperEffectState]) => void;
}

/**
 * ViperEffect class for managing audio effects via WASM
 */
export class ViperEffect {
  // WASM module and controller
  private viperModule: ViperModule | null = null;
  private viperController: ViperController | null = null;
  private processorMemory: { inputPtr: number; outputPtr: number } | null = null;

  // State
  private _isLoading = true;
  private _version: string | null = null;
  private _architecture: string | null = null;
  private _error: string | null = null;

  // Callbacks
  private callbacks: ViperEffectCallbacks = {};

  constructor(callbacks?: ViperEffectCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  // Getters
  get isLoading(): boolean {
    return this._isLoading;
  }

  get version(): string | null {
    return this._version;
  }

  get architecture(): string | null {
    return this._architecture;
  }

  get error(): string | null {
    return this._error;
  }

  get isInitialized(): boolean {
    return this.viperController !== null;
  }

  /**
   * Initialize the ViPER WASM module
   * Loads effect state from localStorage during initialization
   */
  async initialize(): Promise<boolean> {
    this._isLoading = true;
    this._error = null;

    try {
      // Check if WASM module exists
      if (typeof window.ViperModule === 'undefined') {
        // Load the module script dynamically
        const script = document.createElement('script');
        script.src = '/wasm/viper4web.js';
        script.async = true;

        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load ViPER WASM module'));
          document.head.appendChild(script);
        });
      }

      // Wait for module to be available
      let retries = 0;
      while (typeof window.ViperModule === 'undefined' && retries < 50) {
        await new Promise((r) => setTimeout(r, 100));
        retries++;
      }

      if (typeof window.ViperModule === 'undefined') {
        throw new Error('ViPER WASM module not found. Please build the WASM module first.');
      }

      // Initialize module with locateFile to help find the WASM binary
      const module = await window.ViperModule({
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return '/wasm/viper4web.wasm';
          }
          return '/wasm/' + path;
        },
      });
      this.viperModule = module;

      const controller = new module.ViperController();
      this.viperController = controller;

      // Set default sample rate before applying any effects
      // This ensures effects initialize with valid coefficients
      controller.setSampleRate(44100);

      // Pre-allocate memory for audio processing
      const inputPtr = module._malloc(BUFFER_SIZE * 2 * 4); // stereo, float32
      const outputPtr = module._malloc(BUFFER_SIZE * 2 * 4);
      this.processorMemory = { inputPtr, outputPtr };

      this._version = controller.getVersion();
      this._architecture = controller.getArchitecture();
      this._isLoading = false;

      // Load and apply initial effect state from localStorage
      // This happens during WASM initialization as requested by QA
      this.applyAllEffects();

      if (this.callbacks.onInitialized) {
        this.callbacks.onInitialized(this._version, this._architecture);
      }

      return true;
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to initialize ViPER';
      this._isLoading = false;

      if (this.callbacks.onError) {
        this.callbacks.onError(this._error);
      }

      return false;
    }
  }

  /**
   * Set sample rate for the controller
   */
  setSampleRate(sampleRate: number): void {
    if (this.viperController) {
      this.viperController.setSampleRate(sampleRate);
      // Re-apply all effects after sample rate change
      this.applyAllEffects();
    }
  }

  /**
   * Apply all effect settings from the store to the controller
   * Called during initialization and after setSampleRate
   */
  applyAllEffects(): void {
    if (!this.viperController) return;

    const state = getEffectState();

    this.viperController.setEnabled(state.enabled);
    this.viperController.setConvolverEnabled(state.convolverEnabled);
    this.viperController.setConvolverCrossChannel(state.convolverCrossChannel);
    this.viperController.setVHEEnabled(state.vheEnabled);
    this.viperController.setVHELevel(state.vheLevel);
    this.viperController.setDDCEnabled(state.ddcEnabled);
    this.viperController.setSpectrumExtendEnabled(state.spectrumExtendEnabled);
    this.viperController.setSpectrumExtendBark(state.spectrumExtendBark);
    this.viperController.setSpectrumExtendBarkReconstruct(state.spectrumExtendBarkReconstruct);
    this.viperController.setFIREqualizerEnabled(state.firEqualizerEnabled);
    state.firEqualizerBands.forEach((gain, index) => {
      this.viperController!.setFIREqualizerBand(index, gain);
    });
    this.viperController.setFieldSurroundEnabled(state.fieldSurroundEnabled);
    this.viperController.setFieldSurroundWidening(state.fieldSurroundWidening);
    this.viperController.setFieldSurroundMidImage(state.fieldSurroundMidImage);
    this.viperController.setFieldSurroundDepth(state.fieldSurroundDepth);
    this.viperController.setDiffSurroundEnabled(state.diffSurroundEnabled);
    this.viperController.setDiffSurroundDelay(state.diffSurroundDelay);
    this.viperController.setReverbEnabled(state.reverbEnabled);
    this.viperController.setReverbRoomSize(state.reverbRoomSize);
    this.viperController.setReverbRoomWidth(state.reverbRoomWidth);
    this.viperController.setReverbDampening(state.reverbDampening);
    this.viperController.setReverbWetSignal(state.reverbWetSignal);
    this.viperController.setReverbDrySignal(state.reverbDrySignal);
    this.viperController.setAGCEnabled(state.agcEnabled);
    this.viperController.setAGCRatio(state.agcRatio);
    this.viperController.setAGCVolume(state.agcVolume);
    this.viperController.setAGCMaxScaler(state.agcMaxScaler);
    this.viperController.setDynamicSystemEnabled(state.dynamicSystemEnabled);
    this.viperController.setDynamicSystemXCoeffs(state.dynamicSystemXLowFreq, state.dynamicSystemXHighFreq);
    this.viperController.setDynamicSystemYCoeffs(state.dynamicSystemYLowFreq, state.dynamicSystemYHighFreq);
    this.viperController.setDynamicSystemSideGain(state.dynamicSystemSideGainX, state.dynamicSystemSideGainY);
    this.viperController.setDynamicSystemBassGain(state.dynamicSystemBassGain);
    this.viperController.setViperBassEnabled(state.viperBassEnabled);
    this.viperController.setViperBassMode(state.viperBassMode);
    this.viperController.setViperBassFrequency(state.viperBassFrequency);
    this.viperController.setViperBassGain(state.viperBassGain);
    this.viperController.setViperClarityEnabled(state.viperClarityEnabled);
    this.viperController.setViperClarityMode(state.viperClarityMode);
    this.viperController.setViperClarityGain(state.viperClarityGain);
    this.viperController.setCureEnabled(state.cureEnabled);
    this.viperController.setCureLevel(state.cureLevel);
    this.viperController.setTubeSimulatorEnabled(state.tubeSimulatorEnabled);
    this.viperController.setAnalogXEnabled(state.analogXEnabled);
    this.viperController.setAnalogXMode(state.analogXMode);
    this.viperController.setOutputVolume(state.outputVolume);
    this.viperController.setOutputPan(state.outputPan);
    this.viperController.setLimiterThreshold(state.limiterThreshold);
    this.viperController.setSpeakerOptimizationEnabled(state.speakerOptimizationEnabled);
    this.viperController.setFETCompressorEnabled(state.fetCompressorEnabled);
    this.viperController.setFETCompressorThreshold(state.fetCompressorThreshold);
    this.viperController.setFETCompressorRatio(state.fetCompressorRatio);
    this.viperController.setFETCompressorKnee(state.fetCompressorKnee);
    this.viperController.setFETCompressorAutoKnee(state.fetCompressorAutoKnee);
    this.viperController.setFETCompressorGain(state.fetCompressorGain);
    this.viperController.setFETCompressorAutoGain(state.fetCompressorAutoGain);
    this.viperController.setFETCompressorAttack(state.fetCompressorAttack);
    this.viperController.setFETCompressorAutoAttack(state.fetCompressorAutoAttack);
    this.viperController.setFETCompressorRelease(state.fetCompressorRelease);
    this.viperController.setFETCompressorAutoRelease(state.fetCompressorAutoRelease);
    this.viperController.setFETCompressorNoClip(state.fetCompressorNoClip);
  }

  /**
   * Process audio through WASM
   */
  processAudio(inputL: Float32Array, inputR: Float32Array): { outputL: Float32Array; outputR: Float32Array } | null {
    if (!this.viperController || !this.viperModule || !this.processorMemory) {
      return null;
    }

    const { inputPtr, outputPtr } = this.processorMemory;
    const frames = inputL.length;

    // Copy input to WASM memory (interleaved stereo)
    for (let i = 0; i < frames; i++) {
      this.viperModule.setValue(inputPtr + i * 2 * 4, inputL[i], 'float');
      this.viperModule.setValue(inputPtr + (i * 2 + 1) * 4, inputR[i], 'float');
    }

    // Process through ViPER
    this.viperController.process(inputPtr, frames, outputPtr);

    // Copy output from WASM memory
    const outputLArray = new Float32Array(frames);
    const outputRArray = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
      outputLArray[i] = this.viperModule.getValue(outputPtr + i * 2 * 4, 'float');
      outputRArray[i] = this.viperModule.getValue(outputPtr + (i * 2 + 1) * 4, 'float');
    }

    return { outputL: outputLArray, outputR: outputRArray };
  }

  /**
   * Update a single effect and save to localStorage via the store
   */
  updateEffect<K extends keyof ViperEffectState>(key: K, value: ViperEffectState[K]): void {
    // Update the store (which handles localStorage persistence)
    effectState.updateEffect(key, value);

    if (!this.viperController) return;

    // Apply the effect change to the ViPER controller
    this.applyEffectToController(key, value);

    if (this.callbacks.onEffectChange) {
      this.callbacks.onEffectChange(key, value);
    }
  }

  /**
   * Apply a single effect to the controller
   */
  private applyEffectToController<K extends keyof ViperEffectState>(
    key: K,
    value: ViperEffectState[K]
  ): void {
    if (!this.viperController) return;

    switch (key) {
      case 'enabled': {
        const enabled = value as boolean;
        this.viperController.setEnabled(enabled);
        // WASM handles bypass via memcpy - no worklet notification needed
        // Individual effects remain configured, just bypassed when master is off
        break;
      }
      case 'convolverEnabled':
        this.viperController.setConvolverEnabled(value as boolean);
        break;
      case 'convolverCrossChannel':
        this.viperController.setConvolverCrossChannel(value as number);
        break;
      case 'vheEnabled':
        this.viperController.setVHEEnabled(value as boolean);
        break;
      case 'vheLevel':
        this.viperController.setVHELevel(value as number);
        break;
      case 'ddcEnabled':
        this.viperController.setDDCEnabled(value as boolean);
        break;
      case 'spectrumExtendEnabled':
        this.viperController.setSpectrumExtendEnabled(value as boolean);
        break;
      case 'spectrumExtendBark':
        this.viperController.setSpectrumExtendBark(value as number);
        break;
      case 'spectrumExtendBarkReconstruct':
        this.viperController.setSpectrumExtendBarkReconstruct(value as number);
        break;
      case 'firEqualizerEnabled':
        this.viperController.setFIREqualizerEnabled(value as boolean);
        break;
      case 'firEqualizerBands':
        (value as number[]).forEach((gain, index) => {
          this.viperController!.setFIREqualizerBand(index, gain);
        });
        break;
      case 'fieldSurroundEnabled':
        this.viperController.setFieldSurroundEnabled(value as boolean);
        break;
      case 'fieldSurroundWidening':
        this.viperController.setFieldSurroundWidening(value as number);
        break;
      case 'fieldSurroundMidImage':
        this.viperController.setFieldSurroundMidImage(value as number);
        break;
      case 'fieldSurroundDepth':
        this.viperController.setFieldSurroundDepth(value as number);
        break;
      case 'diffSurroundEnabled':
        this.viperController.setDiffSurroundEnabled(value as boolean);
        break;
      case 'diffSurroundDelay':
        this.viperController.setDiffSurroundDelay(value as number);
        break;
      case 'reverbEnabled':
        this.viperController.setReverbEnabled(value as boolean);
        break;
      case 'reverbRoomSize':
        this.viperController.setReverbRoomSize(value as number);
        break;
      case 'reverbRoomWidth':
        this.viperController.setReverbRoomWidth(value as number);
        break;
      case 'reverbDampening':
        this.viperController.setReverbDampening(value as number);
        break;
      case 'reverbWetSignal':
        this.viperController.setReverbWetSignal(value as number);
        break;
      case 'reverbDrySignal':
        this.viperController.setReverbDrySignal(value as number);
        break;
      case 'agcEnabled':
        this.viperController.setAGCEnabled(value as boolean);
        break;
      case 'agcRatio':
        this.viperController.setAGCRatio(value as number);
        break;
      case 'agcVolume':
        this.viperController.setAGCVolume(value as number);
        break;
      case 'agcMaxScaler':
        this.viperController.setAGCMaxScaler(value as number);
        break;
      case 'dynamicSystemEnabled':
        this.viperController.setDynamicSystemEnabled(value as boolean);
        break;
      case 'dynamicSystemXLowFreq':
      case 'dynamicSystemXHighFreq': {
        const state = getEffectState();
        const xLow = key === 'dynamicSystemXLowFreq' ? (value as number) : state.dynamicSystemXLowFreq;
        const xHigh = key === 'dynamicSystemXHighFreq' ? (value as number) : state.dynamicSystemXHighFreq;
        this.viperController.setDynamicSystemXCoeffs(xLow, xHigh);
        break;
      }
      case 'dynamicSystemYLowFreq':
      case 'dynamicSystemYHighFreq': {
        const state = getEffectState();
        const yLow = key === 'dynamicSystemYLowFreq' ? (value as number) : state.dynamicSystemYLowFreq;
        const yHigh = key === 'dynamicSystemYHighFreq' ? (value as number) : state.dynamicSystemYHighFreq;
        this.viperController.setDynamicSystemYCoeffs(yLow, yHigh);
        break;
      }
      case 'dynamicSystemSideGainX':
      case 'dynamicSystemSideGainY': {
        const state = getEffectState();
        const gainX = key === 'dynamicSystemSideGainX' ? (value as number) : state.dynamicSystemSideGainX;
        const gainY = key === 'dynamicSystemSideGainY' ? (value as number) : state.dynamicSystemSideGainY;
        this.viperController.setDynamicSystemSideGain(gainX, gainY);
        break;
      }
      case 'dynamicSystemBassGain':
        this.viperController.setDynamicSystemBassGain(value as number);
        break;
      case 'viperBassEnabled':
        this.viperController.setViperBassEnabled(value as boolean);
        break;
      case 'viperBassMode':
        this.viperController.setViperBassMode(value as number);
        break;
      case 'viperBassFrequency':
        this.viperController.setViperBassFrequency(value as number);
        break;
      case 'viperBassGain':
        this.viperController.setViperBassGain(value as number);
        break;
      case 'viperClarityEnabled':
        this.viperController.setViperClarityEnabled(value as boolean);
        break;
      case 'viperClarityMode':
        this.viperController.setViperClarityMode(value as number);
        break;
      case 'viperClarityGain':
        this.viperController.setViperClarityGain(value as number);
        break;
      case 'cureEnabled':
        this.viperController.setCureEnabled(value as boolean);
        break;
      case 'cureLevel':
        this.viperController.setCureLevel(value as number);
        break;
      case 'tubeSimulatorEnabled':
        this.viperController.setTubeSimulatorEnabled(value as boolean);
        break;
      case 'analogXEnabled':
        this.viperController.setAnalogXEnabled(value as boolean);
        break;
      case 'analogXMode':
        this.viperController.setAnalogXMode(value as number);
        break;
      case 'outputVolume':
        this.viperController.setOutputVolume(value as number);
        break;
      case 'outputPan':
        this.viperController.setOutputPan(value as number);
        break;
      case 'limiterThreshold':
        this.viperController.setLimiterThreshold(value as number);
        break;
      case 'speakerOptimizationEnabled':
        this.viperController.setSpeakerOptimizationEnabled(value as boolean);
        break;
      case 'fetCompressorEnabled':
        this.viperController.setFETCompressorEnabled(value as boolean);
        break;
      case 'fetCompressorThreshold':
        this.viperController.setFETCompressorThreshold(value as number);
        break;
      case 'fetCompressorRatio':
        this.viperController.setFETCompressorRatio(value as number);
        break;
      case 'fetCompressorKnee':
        this.viperController.setFETCompressorKnee(value as number);
        break;
      case 'fetCompressorAutoKnee':
        this.viperController.setFETCompressorAutoKnee(value as boolean);
        break;
      case 'fetCompressorGain':
        this.viperController.setFETCompressorGain(value as number);
        break;
      case 'fetCompressorAutoGain':
        this.viperController.setFETCompressorAutoGain(value as boolean);
        break;
      case 'fetCompressorAttack':
        this.viperController.setFETCompressorAttack(value as number);
        break;
      case 'fetCompressorAutoAttack':
        this.viperController.setFETCompressorAutoAttack(value as boolean);
        break;
      case 'fetCompressorRelease':
        this.viperController.setFETCompressorRelease(value as number);
        break;
      case 'fetCompressorAutoRelease':
        this.viperController.setFETCompressorAutoRelease(value as boolean);
        break;
      case 'fetCompressorNoClip':
        this.viperController.setFETCompressorNoClip(value as boolean);
        break;
    }
  }

  /**
   * Update a single equalizer band
   */
  updateEqualizerBand(bandIndex: number, gain: number): void {
    effectState.updateEqualizerBand(bandIndex, gain);

    if (this.viperController) {
      this.viperController.setFIREqualizerBand(bandIndex, gain);
    }
  }

  /**
   * Reset all effects to defaults
   */
  resetEffects(): void {
    effectState.reset();

    if (this.viperController) {
      this.viperController.resetAllEffects();
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error = null;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.processorMemory && this.viperModule) {
      this.viperModule._free(this.processorMemory.inputPtr);
      this.viperModule._free(this.processorMemory.outputPtr);
      this.processorMemory = null;
    }
    if (this.viperController) {
      this.viperController.delete();
      this.viperController = null;
    }
    this.viperModule = null;
  }
}
