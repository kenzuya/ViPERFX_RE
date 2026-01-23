/**
 * ViPER4Web Audio Hook
 *
 * Svelte 5 hook for managing ViPER audio processing with WASM,
 * AudioContext creation, and ViperController setup.
 */

import type { ViperController, ViperModule, ViperEffectState } from '$lib/types/viper';
import { effectState, getEffectState } from '$lib/stores/effect-state';
import { audioQueue, getAudioQueueState } from '$lib/stores/audio-queue';

interface ViperModuleFactory {
  (options?: { locateFile?: (path: string) => string }): Promise<ViperModule>;
}

declare global {
  interface Window {
    ViperModule: ViperModuleFactory;
  }
}

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

// Buffer size for WASM processing - must match worklet's inputChunkSize
const BUFFER_SIZE = 512;

/**
 * Create ViPER Audio state and actions
 *
 * This is a Svelte 5 runes-based hook that manages WASM initialization,
 * AudioContext creation, and audio processing through the ViperController.
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

  // Internal refs (not reactive, just for storing references)
  let viperModule: ViperModule | null = null;
  let viperController: ViperController | null = null;
  let audioContext: AudioContext | null = null;
  let audioBuffer: AudioBuffer | null = null;
  let sourceNode: AudioBufferSourceNode | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let workletReady = false;
  let processorMemory: { inputPtr: number; outputPtr: number } | null = null;
  let startTime = 0;
  let pauseTime = 0;
  let animationFrameId: number | null = null;
  let isPlayingInternal = false;

  /**
   * Initialize the ViPER WASM module
   */
  async function initViper(): Promise<void> {
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
      viperModule = module;

      const controller = new module.ViperController();
      viperController = controller;

      // Set default sample rate before applying any effects
      // This ensures effects initialize with valid coefficients
      controller.setSampleRate(44100);

      // Pre-allocate memory for audio processing
      const inputPtr = module._malloc(BUFFER_SIZE * 2 * 4); // stereo, float32
      const outputPtr = module._malloc(BUFFER_SIZE * 2 * 4);
      processorMemory = { inputPtr, outputPtr };

      version = controller.getVersion();
      architecture = controller.getArchitecture();
      isLoading = false;

      // Apply initial effect state from store
      applyAllEffects();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to initialize ViPER';
      isLoading = false;
    }
  }

  /**
   * Cleanup resources
   */
  function cleanup(): void {
    if (processorMemory && viperModule) {
      viperModule._free(processorMemory.inputPtr);
      viperModule._free(processorMemory.outputPtr);
      processorMemory = null;
    }
    if (workletNode) {
      workletNode.port.postMessage({ type: 'reset' });
      workletNode.disconnect();
      workletNode = null;
    }
    if (viperController) {
      viperController.delete();
      viperController = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  /**
   * Apply all effect settings to the controller
   * Called after setSampleRate since it resets all effects internally
   */
  function applyAllEffects(): void {
    if (!viperController) return;

    const state = getEffectState();

    viperController.setEnabled(state.enabled);
    viperController.setConvolverEnabled(state.convolverEnabled);
    viperController.setConvolverCrossChannel(state.convolverCrossChannel);
    viperController.setVHEEnabled(state.vheEnabled);
    viperController.setVHELevel(state.vheLevel);
    viperController.setDDCEnabled(state.ddcEnabled);
    viperController.setSpectrumExtendEnabled(state.spectrumExtendEnabled);
    viperController.setSpectrumExtendBark(state.spectrumExtendBark);
    viperController.setSpectrumExtendBarkReconstruct(state.spectrumExtendBarkReconstruct);
    viperController.setFIREqualizerEnabled(state.firEqualizerEnabled);
    state.firEqualizerBands.forEach((gain, index) => {
      viperController!.setFIREqualizerBand(index, gain);
    });
    viperController.setFieldSurroundEnabled(state.fieldSurroundEnabled);
    viperController.setFieldSurroundWidening(state.fieldSurroundWidening);
    viperController.setFieldSurroundMidImage(state.fieldSurroundMidImage);
    viperController.setFieldSurroundDepth(state.fieldSurroundDepth);
    viperController.setDiffSurroundEnabled(state.diffSurroundEnabled);
    viperController.setDiffSurroundDelay(state.diffSurroundDelay);
    viperController.setReverbEnabled(state.reverbEnabled);
    viperController.setReverbRoomSize(state.reverbRoomSize);
    viperController.setReverbRoomWidth(state.reverbRoomWidth);
    viperController.setReverbDampening(state.reverbDampening);
    viperController.setReverbWetSignal(state.reverbWetSignal);
    viperController.setReverbDrySignal(state.reverbDrySignal);
    viperController.setAGCEnabled(state.agcEnabled);
    viperController.setAGCRatio(state.agcRatio);
    viperController.setAGCVolume(state.agcVolume);
    viperController.setAGCMaxScaler(state.agcMaxScaler);
    viperController.setDynamicSystemEnabled(state.dynamicSystemEnabled);
    viperController.setDynamicSystemXCoeffs(state.dynamicSystemXLowFreq, state.dynamicSystemXHighFreq);
    viperController.setDynamicSystemYCoeffs(state.dynamicSystemYLowFreq, state.dynamicSystemYHighFreq);
    viperController.setDynamicSystemSideGain(state.dynamicSystemSideGainX, state.dynamicSystemSideGainY);
    viperController.setDynamicSystemBassGain(state.dynamicSystemBassGain);
    viperController.setViperBassEnabled(state.viperBassEnabled);
    viperController.setViperBassMode(state.viperBassMode);
    viperController.setViperBassFrequency(state.viperBassFrequency);
    viperController.setViperBassGain(state.viperBassGain);
    viperController.setViperClarityEnabled(state.viperClarityEnabled);
    viperController.setViperClarityMode(state.viperClarityMode);
    viperController.setViperClarityGain(state.viperClarityGain);
    viperController.setCureEnabled(state.cureEnabled);
    viperController.setCureLevel(state.cureLevel);
    viperController.setTubeSimulatorEnabled(state.tubeSimulatorEnabled);
    viperController.setAnalogXEnabled(state.analogXEnabled);
    viperController.setAnalogXMode(state.analogXMode);
    viperController.setOutputVolume(state.outputVolume);
    viperController.setOutputPan(state.outputPan);
    viperController.setLimiterThreshold(state.limiterThreshold);
    viperController.setSpeakerOptimizationEnabled(state.speakerOptimizationEnabled);
    viperController.setFETCompressorEnabled(state.fetCompressorEnabled);
    viperController.setFETCompressorThreshold(state.fetCompressorThreshold);
    viperController.setFETCompressorRatio(state.fetCompressorRatio);
    viperController.setFETCompressorKnee(state.fetCompressorKnee);
    viperController.setFETCompressorAutoKnee(state.fetCompressorAutoKnee);
    viperController.setFETCompressorGain(state.fetCompressorGain);
    viperController.setFETCompressorAutoGain(state.fetCompressorAutoGain);
    viperController.setFETCompressorAttack(state.fetCompressorAttack);
    viperController.setFETCompressorAutoAttack(state.fetCompressorAutoAttack);
    viperController.setFETCompressorRelease(state.fetCompressorRelease);
    viperController.setFETCompressorAutoRelease(state.fetCompressorAutoRelease);
    viperController.setFETCompressorNoClip(state.fetCompressorNoClip);
  }

  /**
   * Process audio in main thread and send back to worklet
   */
  function processAudioInMainThread(
    inputL: Float32Array,
    inputR: Float32Array,
    sequence: number
  ): void {
    if (!viperController || !viperModule || !processorMemory || !workletNode) {
      return;
    }

    const { inputPtr, outputPtr } = processorMemory;
    const frames = inputL.length;

    // Copy input to WASM memory (interleaved stereo)
    for (let i = 0; i < frames; i++) {
      viperModule.setValue(inputPtr + i * 2 * 4, inputL[i], 'float');
      viperModule.setValue(inputPtr + (i * 2 + 1) * 4, inputR[i], 'float');
    }

    // Process through ViPER
    viperController.process(inputPtr, frames, outputPtr);

    // Copy output from WASM memory
    const outputLArray = new Float32Array(frames);
    const outputRArray = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
      outputLArray[i] = viperModule.getValue(outputPtr + i * 2 * 4, 'float');
      outputRArray[i] = viperModule.getValue(outputPtr + (i * 2 + 1) * 4, 'float');
    }

    // Send processed audio back to worklet
    workletNode.port.postMessage({
      type: 'processedAudio',
      outputL: outputLArray,
      outputR: outputRArray,
      sequence,
    });
  }

  /**
   * Initialize AudioWorklet
   */
  async function initAudioWorklet(ctx: AudioContext): Promise<AudioWorkletNode | null> {
    if (workletReady && workletNode) {
      return workletNode;
    }

    try {
      // Register the worklet processor
      await ctx.audioWorklet.addModule('/viper-worklet-processor.js');

      // Create the worklet node
      const node = new AudioWorkletNode(ctx, 'viper-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 2,
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers',
      });

      // Handle messages from worklet
      node.port.onmessage = (event) => {
        const data = event.data;
        if (data.type === 'ready') {
          workletReady = true;
          // Sync enabled state to worklet on initialization
          const state = getEffectState();
          node.port.postMessage({
            type: 'setEnabled',
            value: state.enabled,
          });
        } else if (data.type === 'inputAudio') {
          // Process audio in main thread with WASM
          processAudioInMainThread(data.inputL, data.inputR, data.sequence);
        }
      };

      workletNode = node;
      return node;
    } catch {
      return null;
    }
  }

  /**
   * Update time tracking
   */
  function updateTime(): void {
    if (audioContext && isPlayingInternal) {
      const elapsed = audioContext.currentTime - startTime + pauseTime;
      const audioDuration = audioBuffer?.duration || 0;
      currentTime = Math.min(elapsed, audioDuration);
      animationFrameId = requestAnimationFrame(updateTime);
    }
  }

  /**
   * Clean up playback nodes
   */
  function cleanupPlayback(): void {
    if (sourceNode) {
      try {
        sourceNode.stop();
      } catch {
        // Ignore errors if already stopped
      }
      sourceNode.disconnect();
      sourceNode = null;
    }
    // Reset worklet buffer state
    if (workletNode) {
      workletNode.port.postMessage({ type: 'reset' });
    }
  }

  /**
   * Load an audio file
   */
  async function loadAudioFile(file: File): Promise<void> {
    if (!viperController || !viperModule) {
      error = 'ViPER not initialized';
      return;
    }

    // Clear any previous errors and set loading state
    error = null;
    isLoadingAudio = true;

    try {
      audioFileName = file.name;

      // Create or resume audio context
      if (!audioContext) {
        audioContext = new AudioContext();
      }

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Initialize AudioWorklet
      await initAudioWorklet(audioContext);

      // Decode audio file
      const arrayBuffer = await file.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Set sample rate in ViPER controller
      viperController.setSampleRate(audioBuffer.sampleRate);
      applyAllEffects(); // Re-apply effects after sample rate change

      duration = audioBuffer.duration;
      currentTime = 0;
      pauseTime = 0;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load audio file';
      audioFileName = null;
    } finally {
      isLoadingAudio = false;
    }
  }

  /**
   * Play audio
   */
  async function play(): Promise<void> {
    if (!audioContext || !audioBuffer) {
      error = 'No audio loaded';
      return;
    }

    // Clean up any existing playback
    cleanupPlayback();

    const ctx = audioContext;

    // Resume context if suspended
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Ensure worklet is ready
    if (!workletNode) {
      await initAudioWorklet(ctx);
    }

    // Signal worklet that playback is starting
    if (workletNode) {
      workletNode.port.postMessage({ type: 'start' });
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    // Connect through worklet
    if (workletNode) {
      source.connect(workletNode);
      workletNode.connect(ctx.destination);
    } else {
      // Fallback: direct connection if worklet failed
      source.connect(ctx.destination);
    }

    source.onended = () => {
      if (isPlayingInternal) {
        isPlayingInternal = false;
        isPlaying = false;

        const queueState = getAudioQueueState();
        const currentIndex = queueState.currentIndex;
        const queue = queueState.queue;
        const repeat = queueState.repeatMode;

        if (repeat === 'one') {
          // Repeat current track
          pauseTime = 0;
          currentTime = 0;
          setTimeout(() => play(), 10);
        } else if (currentIndex < queue.length - 1) {
          // Play next track
          playTrackInternal(currentIndex + 1);
        } else if (repeat === 'all' && queue.length > 0) {
          // Loop back to first track
          playTrackInternal(0);
        } else {
          // End of queue, reset to beginning
          pauseTime = 0;
          currentTime = 0;
        }
      }
    };

    // Start playback from current position
    const offset = pauseTime;
    startTime = ctx.currentTime;
    source.start(0, offset);
    sourceNode = source;

    isPlayingInternal = true;
    isPlaying = true;
    animationFrameId = requestAnimationFrame(updateTime);
  }

  /**
   * Pause audio
   */
  function pause(): void {
    if (sourceNode && audioContext) {
      pauseTime = audioContext.currentTime - startTime + pauseTime;
    }
    cleanupPlayback();
    isPlayingInternal = false;
    isPlaying = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  /**
   * Stop audio
   */
  function stop(): void {
    cleanupPlayback();
    pauseTime = 0;
    currentTime = 0;
    isPlayingInternal = false;
    isPlaying = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  /**
   * Seek to a specific time
   */
  function seek(time: number): void {
    const wasPlaying = isPlayingInternal;

    if (wasPlaying) {
      cleanupPlayback();
      isPlayingInternal = false;
      isPlaying = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }

    pauseTime = time;
    currentTime = time;

    if (wasPlaying) {
      // Use setTimeout to ensure state is updated before playing again
      setTimeout(() => {
        play();
      }, 10);
    }
  }

  /**
   * Update a single effect
   */
  function updateEffect<K extends keyof ViperEffectState>(key: K, value: ViperEffectState[K]): void {
    effectState.updateEffect(key, value);

    if (!viperController) return;

    // Apply the effect change to the ViPER controller
    switch (key) {
      case 'enabled': {
        const enabled = value as boolean;
        viperController.setEnabled(enabled);
        // Also notify worklet
        if (workletNode) {
          workletNode.port.postMessage({ type: 'setEnabled', value: enabled });
        }
        // When master is disabled, also disable all individual effects via WASM
        // This ensures the WASM engine bypasses all processing
        if (!enabled) {
          viperController.setViperBassEnabled(false);
          viperController.setViperClarityEnabled(false);
          viperController.setFIREqualizerEnabled(false);
          viperController.setFieldSurroundEnabled(false);
          viperController.setDiffSurroundEnabled(false);
          viperController.setReverbEnabled(false);
          viperController.setVHEEnabled(false);
          viperController.setDynamicSystemEnabled(false);
          viperController.setCureEnabled(false);
          viperController.setTubeSimulatorEnabled(false);
          viperController.setAnalogXEnabled(false);
          viperController.setSpectrumExtendEnabled(false);
          viperController.setFETCompressorEnabled(false);
          viperController.setSpeakerOptimizationEnabled(false);
        } else {
          // When master is re-enabled, restore individual effect states from store
          const state = getEffectState();
          viperController.setViperBassEnabled(state.viperBassEnabled);
          viperController.setViperClarityEnabled(state.viperClarityEnabled);
          viperController.setFIREqualizerEnabled(state.firEqualizerEnabled);
          viperController.setFieldSurroundEnabled(state.fieldSurroundEnabled);
          viperController.setDiffSurroundEnabled(state.diffSurroundEnabled);
          viperController.setReverbEnabled(state.reverbEnabled);
          viperController.setVHEEnabled(state.vheEnabled);
          viperController.setDynamicSystemEnabled(state.dynamicSystemEnabled);
          viperController.setCureEnabled(state.cureEnabled);
          viperController.setTubeSimulatorEnabled(state.tubeSimulatorEnabled);
          viperController.setAnalogXEnabled(state.analogXEnabled);
          viperController.setSpectrumExtendEnabled(state.spectrumExtendEnabled);
          viperController.setFETCompressorEnabled(state.fetCompressorEnabled);
          viperController.setSpeakerOptimizationEnabled(state.speakerOptimizationEnabled);
        }
        break;
      }
      case 'convolverEnabled':
        viperController.setConvolverEnabled(value as boolean);
        break;
      case 'convolverCrossChannel':
        viperController.setConvolverCrossChannel(value as number);
        break;
      case 'vheEnabled':
        viperController.setVHEEnabled(value as boolean);
        break;
      case 'vheLevel':
        viperController.setVHELevel(value as number);
        break;
      case 'ddcEnabled':
        viperController.setDDCEnabled(value as boolean);
        break;
      case 'spectrumExtendEnabled':
        viperController.setSpectrumExtendEnabled(value as boolean);
        break;
      case 'spectrumExtendBark':
        viperController.setSpectrumExtendBark(value as number);
        break;
      case 'spectrumExtendBarkReconstruct':
        viperController.setSpectrumExtendBarkReconstruct(value as number);
        break;
      case 'firEqualizerEnabled':
        viperController.setFIREqualizerEnabled(value as boolean);
        break;
      case 'firEqualizerBands':
        // Update all bands when the array is replaced
        (value as number[]).forEach((gain, index) => {
          viperController!.setFIREqualizerBand(index, gain);
        });
        break;
      case 'fieldSurroundEnabled':
        viperController.setFieldSurroundEnabled(value as boolean);
        break;
      case 'fieldSurroundWidening':
        viperController.setFieldSurroundWidening(value as number);
        break;
      case 'fieldSurroundMidImage':
        viperController.setFieldSurroundMidImage(value as number);
        break;
      case 'fieldSurroundDepth':
        viperController.setFieldSurroundDepth(value as number);
        break;
      case 'diffSurroundEnabled':
        viperController.setDiffSurroundEnabled(value as boolean);
        break;
      case 'diffSurroundDelay':
        viperController.setDiffSurroundDelay(value as number);
        break;
      case 'reverbEnabled':
        viperController.setReverbEnabled(value as boolean);
        break;
      case 'reverbRoomSize':
        viperController.setReverbRoomSize(value as number);
        break;
      case 'reverbRoomWidth':
        viperController.setReverbRoomWidth(value as number);
        break;
      case 'reverbDampening':
        viperController.setReverbDampening(value as number);
        break;
      case 'reverbWetSignal':
        viperController.setReverbWetSignal(value as number);
        break;
      case 'reverbDrySignal':
        viperController.setReverbDrySignal(value as number);
        break;
      case 'agcEnabled':
        viperController.setAGCEnabled(value as boolean);
        break;
      case 'agcRatio':
        viperController.setAGCRatio(value as number);
        break;
      case 'agcVolume':
        viperController.setAGCVolume(value as number);
        break;
      case 'agcMaxScaler':
        viperController.setAGCMaxScaler(value as number);
        break;
      case 'dynamicSystemEnabled':
        viperController.setDynamicSystemEnabled(value as boolean);
        break;
      case 'dynamicSystemXLowFreq':
      case 'dynamicSystemXHighFreq': {
        // Need to update both X coeffs together
        const state = getEffectState();
        const xLow = key === 'dynamicSystemXLowFreq' ? (value as number) : state.dynamicSystemXLowFreq;
        const xHigh = key === 'dynamicSystemXHighFreq' ? (value as number) : state.dynamicSystemXHighFreq;
        viperController.setDynamicSystemXCoeffs(xLow, xHigh);
        break;
      }
      case 'dynamicSystemYLowFreq':
      case 'dynamicSystemYHighFreq': {
        // Need to update both Y coeffs together
        const state = getEffectState();
        const yLow = key === 'dynamicSystemYLowFreq' ? (value as number) : state.dynamicSystemYLowFreq;
        const yHigh = key === 'dynamicSystemYHighFreq' ? (value as number) : state.dynamicSystemYHighFreq;
        viperController.setDynamicSystemYCoeffs(yLow, yHigh);
        break;
      }
      case 'dynamicSystemSideGainX':
      case 'dynamicSystemSideGainY': {
        // Need to update both side gains together
        const state = getEffectState();
        const gainX = key === 'dynamicSystemSideGainX' ? (value as number) : state.dynamicSystemSideGainX;
        const gainY = key === 'dynamicSystemSideGainY' ? (value as number) : state.dynamicSystemSideGainY;
        viperController.setDynamicSystemSideGain(gainX, gainY);
        break;
      }
      case 'dynamicSystemBassGain':
        viperController.setDynamicSystemBassGain(value as number);
        break;
      case 'viperBassEnabled':
        viperController.setViperBassEnabled(value as boolean);
        break;
      case 'viperBassMode':
        viperController.setViperBassMode(value as number);
        break;
      case 'viperBassFrequency':
        viperController.setViperBassFrequency(value as number);
        break;
      case 'viperBassGain':
        viperController.setViperBassGain(value as number);
        break;
      case 'viperClarityEnabled':
        viperController.setViperClarityEnabled(value as boolean);
        break;
      case 'viperClarityMode':
        viperController.setViperClarityMode(value as number);
        break;
      case 'viperClarityGain':
        viperController.setViperClarityGain(value as number);
        break;
      case 'cureEnabled':
        viperController.setCureEnabled(value as boolean);
        break;
      case 'cureLevel':
        viperController.setCureLevel(value as number);
        break;
      case 'tubeSimulatorEnabled':
        viperController.setTubeSimulatorEnabled(value as boolean);
        break;
      case 'analogXEnabled':
        viperController.setAnalogXEnabled(value as boolean);
        break;
      case 'analogXMode':
        viperController.setAnalogXMode(value as number);
        break;
      case 'outputVolume':
        viperController.setOutputVolume(value as number);
        break;
      case 'outputPan':
        viperController.setOutputPan(value as number);
        break;
      case 'limiterThreshold':
        viperController.setLimiterThreshold(value as number);
        break;
      case 'speakerOptimizationEnabled':
        viperController.setSpeakerOptimizationEnabled(value as boolean);
        break;
      case 'fetCompressorEnabled':
        viperController.setFETCompressorEnabled(value as boolean);
        break;
      case 'fetCompressorThreshold':
        viperController.setFETCompressorThreshold(value as number);
        break;
      case 'fetCompressorRatio':
        viperController.setFETCompressorRatio(value as number);
        break;
      case 'fetCompressorKnee':
        viperController.setFETCompressorKnee(value as number);
        break;
      case 'fetCompressorAutoKnee':
        viperController.setFETCompressorAutoKnee(value as boolean);
        break;
      case 'fetCompressorGain':
        viperController.setFETCompressorGain(value as number);
        break;
      case 'fetCompressorAutoGain':
        viperController.setFETCompressorAutoGain(value as boolean);
        break;
      case 'fetCompressorAttack':
        viperController.setFETCompressorAttack(value as number);
        break;
      case 'fetCompressorAutoAttack':
        viperController.setFETCompressorAutoAttack(value as boolean);
        break;
      case 'fetCompressorRelease':
        viperController.setFETCompressorRelease(value as number);
        break;
      case 'fetCompressorAutoRelease':
        viperController.setFETCompressorAutoRelease(value as boolean);
        break;
      case 'fetCompressorNoClip':
        viperController.setFETCompressorNoClip(value as boolean);
        break;
    }
  }

  /**
   * Update a single equalizer band
   */
  function updateEqualizerBand(bandIndex: number, gain: number): void {
    effectState.updateEqualizerBand(bandIndex, gain);

    if (viperController) {
      viperController.setFIREqualizerBand(bandIndex, gain);
    }
  }

  /**
   * Reset all effects to defaults
   */
  function resetEffects(): void {
    effectState.reset();

    if (viperController) {
      viperController.resetAllEffects();
    }
  }

  /**
   * Clear the current error
   */
  function clearError(): void {
    error = null;
  }

  /**
   * Internal function to play a track by index
   */
  async function playTrackInternal(index: number): Promise<void> {
    const queueState = getAudioQueueState();
    const queue = queueState.queue;

    if (index < 0 || index >= queue.length) return;

    const item = queue[index];

    // Clear any previous errors
    error = null;

    // Clean up existing playback
    cleanupPlayback();
    isPlayingInternal = false;
    isPlaying = false;

    // Update current index in queue store
    audioQueue.setCurrentIndex(index);

    // If buffer is already loaded, use it
    if (item.buffer) {
      audioBuffer = item.buffer;
      audioFileName = item.name;
      duration = item.duration;
      pauseTime = 0;
      currentTime = 0;

      // Set sample rate
      if (viperController) {
        viperController.setSampleRate(item.buffer.sampleRate);
        applyAllEffects(); // Re-apply effects after sample rate change
      }

      // Start playback
      setTimeout(() => play(), 10);
    } else {
      // Need to decode the buffer first
      isLoadingAudio = true;
      audioFileName = item.name;

      try {
        if (!audioContext) {
          audioContext = new AudioContext();
        }

        const arrayBuffer = await item.file.arrayBuffer();
        const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Update the queue item with the buffer
        audioQueue.updateItemBuffer(item.id, decodedBuffer);

        audioBuffer = decodedBuffer;
        duration = decodedBuffer.duration;
        pauseTime = 0;
        currentTime = 0;

        if (viperController) {
          viperController.setSampleRate(decodedBuffer.sampleRate);
          applyAllEffects(); // Re-apply effects after sample rate change
        }

        isLoadingAudio = false;
        setTimeout(() => play(), 10);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load track';
        isLoadingAudio = false;
      }
    }
  }

  /**
   * Add files to queue with pre-loading
   */
  async function addToQueue(files: File[]): Promise<void> {
    const items = files.map((file) => ({
      file,
      name: file.name,
      duration: 0,
      buffer: null,
    }));

    // Track if queue was empty before adding
    const wasEmpty = getAudioQueueState().queue.length === 0;

    // Add items to queue store
    const ids = audioQueue.addToQueue(items);

    // Initialize audio context for decoding
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const ctx = audioContext;

    // Pre-decode all buffers in parallel (fire and forget)
    files.forEach(async (file, index) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

        // Update queue item with decoded buffer
        audioQueue.updateItemBuffer(ids[index], decodedBuffer);
        audioQueue.updateItemDuration(ids[index], decodedBuffer.duration);
      } catch {
        // Silently ignore decoding errors during pre-loading
      }
    });

    // If queue was empty and we added items, auto-load the first one
    if (wasEmpty && files.length > 0) {
      await initAudioWorklet(ctx);
      setTimeout(() => playTrackInternal(0), 50);
    }
  }

  /**
   * Remove a track from the queue
   */
  function removeFromQueue(id: string): void {
    const queueState = getAudioQueueState();
    const index = queueState.queue.findIndex((item) => item.id === id);

    if (index === -1) return;

    // If removing currently playing track, stop playback
    if (index === queueState.currentIndex) {
      cleanupPlayback();
      isPlayingInternal = false;
      isPlaying = false;
      audioBuffer = null;
      audioFileName = null;
      duration = 0;
      currentTime = 0;
    }

    audioQueue.removeFromQueue(id);
  }

  /**
   * Clear the entire queue
   */
  function clearQueue(): void {
    cleanupPlayback();
    isPlayingInternal = false;
    isPlaying = false;
    audioBuffer = null;
    audioFileName = null;
    duration = 0;
    currentTime = 0;
    audioQueue.clearQueue();
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
    const currentIndex = queueState.currentIndex;

    if (queue.length === 0) return;

    // If no track is currently selected, start from the beginning
    if (currentIndex < 0) {
      playTrackInternal(0);
      return;
    }

    // If more than 3 seconds into track, restart current track
    if (
      pauseTime > 3 ||
      (audioContext && audioContext.currentTime - startTime + pauseTime > 3)
    ) {
      pauseTime = 0;
      currentTime = 0;
      if (isPlayingInternal) {
        cleanupPlayback();
        setTimeout(() => play(), 10);
      }
      return;
    }

    if (currentIndex > 0) {
      playTrackInternal(currentIndex - 1);
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
