import { useState, useEffect, useCallback, useRef } from 'react';
import { ViperController, ViperModule, ViperEffectState, defaultEffectState, getInitialEffectState, saveEffectState } from '../types/viper';

interface ViperModuleFactory {
  (options?: { locateFile?: (path: string) => string }): Promise<ViperModule>;
}

declare global {
  interface Window {
    ViperModule: ViperModuleFactory;
  }
}

export interface UseViperAudioResult {
  // State
  isLoading: boolean;
  isLoadingAudio: boolean;
  isPlaying: boolean;
  error: string | null;
  effectState: ViperEffectState;
  version: string | null;
  architecture: string | null;
  currentTime: number;
  duration: number;
  audioFileName: string | null;

  // Actions
  loadAudioFile: (file: File) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  updateEffect: <K extends keyof ViperEffectState>(key: K, value: ViperEffectState[K]) => void;
  updateEqualizerBand: (bandIndex: number, gain: number) => void;
  resetEffects: () => void;
}

export function useViperAudio(): UseViperAudioResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [effectState, setEffectState] = useState<ViperEffectState>(getInitialEffectState);
  const [version, setVersion] = useState<string | null>(null);
  const [architecture, setArchitecture] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);

  const viperModuleRef = useRef<ViperModule | null>(null);
  const viperControllerRef = useRef<ViperController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const workletReadyRef = useRef<boolean>(false);
  const processorMemoryRef = useRef<{ inputPtr: number; outputPtr: number } | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Buffer size for WASM processing
  const BUFFER_SIZE = 128; // AudioWorklet render quantum

  // Initialize ViPER Module
  useEffect(() => {
    const initViper = async () => {
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
          await new Promise(r => setTimeout(r, 100));
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
          }
        });
        viperModuleRef.current = module;

        const controller = new module.ViperController();
        viperControllerRef.current = controller;

        // Pre-allocate memory for audio processing
        const inputPtr = module._malloc(BUFFER_SIZE * 2 * 4); // stereo, float32
        const outputPtr = module._malloc(BUFFER_SIZE * 2 * 4);
        processorMemoryRef.current = { inputPtr, outputPtr };

        setVersion(controller.getVersion());
        setArchitecture(controller.getArchitecture());
        setIsLoading(false);
        console.log('[ViPER] Module initialized successfully');
      } catch (err) {
        console.error('[ViPER] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize ViPER');
        setIsLoading(false);
      }
    };

    initViper();

    return () => {
      // Cleanup
      if (processorMemoryRef.current && viperModuleRef.current) {
        viperModuleRef.current._free(processorMemoryRef.current.inputPtr);
        viperModuleRef.current._free(processorMemoryRef.current.outputPtr);
        processorMemoryRef.current = null;
      }
      if (workletNodeRef.current) {
        workletNodeRef.current.port.postMessage({ type: 'reset' });
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }
      if (viperControllerRef.current) {
        viperControllerRef.current.delete();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Save effect state to localStorage whenever it changes
  useEffect(() => {
    saveEffectState(effectState);
  }, [effectState]);

  // Apply loaded effect state to controller after initialization
  useEffect(() => {
    if (isLoading || !viperControllerRef.current) return;

    const controller = viperControllerRef.current;
    const state = effectState;

    // Apply all saved effect settings to the controller
    controller.setEnabled(state.enabled);
    controller.setConvolverEnabled(state.convolverEnabled);
    controller.setConvolverCrossChannel(state.convolverCrossChannel);
    controller.setVHEEnabled(state.vheEnabled);
    controller.setVHELevel(state.vheLevel);
    controller.setDDCEnabled(state.ddcEnabled);
    controller.setSpectrumExtendEnabled(state.spectrumExtendEnabled);
    controller.setSpectrumExtendBark(state.spectrumExtendBark);
    controller.setSpectrumExtendBarkReconstruct(state.spectrumExtendBarkReconstruct);
    controller.setFIREqualizerEnabled(state.firEqualizerEnabled);
    // Apply saved equalizer bands
    state.firEqualizerBands.forEach((gain, index) => {
      controller.setFIREqualizerBand(index, gain);
    });
    controller.setFieldSurroundEnabled(state.fieldSurroundEnabled);
    controller.setFieldSurroundWidening(state.fieldSurroundWidening);
    controller.setFieldSurroundMidImage(state.fieldSurroundMidImage);
    controller.setFieldSurroundDepth(state.fieldSurroundDepth);
    controller.setDiffSurroundEnabled(state.diffSurroundEnabled);
    controller.setDiffSurroundDelay(state.diffSurroundDelay);
    controller.setReverbEnabled(state.reverbEnabled);
    controller.setReverbRoomSize(state.reverbRoomSize);
    controller.setReverbRoomWidth(state.reverbRoomWidth);
    controller.setReverbDampening(state.reverbDampening);
    controller.setReverbWetSignal(state.reverbWetSignal);
    controller.setReverbDrySignal(state.reverbDrySignal);
    controller.setAGCEnabled(state.agcEnabled);
    controller.setAGCRatio(state.agcRatio);
    controller.setAGCVolume(state.agcVolume);
    controller.setAGCMaxScaler(state.agcMaxScaler);
    controller.setDynamicSystemEnabled(state.dynamicSystemEnabled);
    controller.setDynamicSystemStrength(state.dynamicSystemStrength);
    controller.setViperBassEnabled(state.viperBassEnabled);
    controller.setViperBassMode(state.viperBassMode);
    controller.setViperBassFrequency(state.viperBassFrequency);
    controller.setViperBassGain(state.viperBassGain);
    controller.setViperClarityEnabled(state.viperClarityEnabled);
    controller.setViperClarityMode(state.viperClarityMode);
    controller.setViperClarityGain(state.viperClarityGain);
    controller.setCureEnabled(state.cureEnabled);
    controller.setCureLevel(state.cureLevel);
    controller.setTubeSimulatorEnabled(state.tubeSimulatorEnabled);
    controller.setAnalogXEnabled(state.analogXEnabled);
    controller.setAnalogXMode(state.analogXMode);
    controller.setOutputVolume(state.outputVolume);
    controller.setOutputPan(state.outputPan);
    controller.setLimiterThreshold(state.limiterThreshold);
    controller.setSpeakerOptimizationEnabled(state.speakerOptimizationEnabled);
    controller.setFETCompressorEnabled(state.fetCompressorEnabled);
    controller.setFETCompressorThreshold(state.fetCompressorThreshold);
    controller.setFETCompressorRatio(state.fetCompressorRatio);
    controller.setFETCompressorKnee(state.fetCompressorKnee);
    controller.setFETCompressorAutoKnee(state.fetCompressorAutoKnee);
    controller.setFETCompressorGain(state.fetCompressorGain);
    controller.setFETCompressorAutoGain(state.fetCompressorAutoGain);
    controller.setFETCompressorAttack(state.fetCompressorAttack);
    controller.setFETCompressorAutoAttack(state.fetCompressorAutoAttack);
    controller.setFETCompressorRelease(state.fetCompressorRelease);
    controller.setFETCompressorAutoRelease(state.fetCompressorAutoRelease);
    controller.setFETCompressorNoClip(state.fetCompressorNoClip);

    console.log('[ViPER] Loaded saved effect state from localStorage');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]); // Only run once when loading completes

  // Update time tracking
  const updateTime = useCallback(() => {
    if (audioContextRef.current && isPlaying) {
      const elapsed = audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current;
      setCurrentTime(Math.min(elapsed, duration));
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }
  }, [isPlaying, duration]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateTime]);

  // Process audio in main thread and send back to worklet
  const processAudioInMainThread = useCallback((inputL: Float32Array, inputR: Float32Array, sequence: number) => {
    if (!viperControllerRef.current || !viperModuleRef.current || !processorMemoryRef.current || !workletNodeRef.current) {
      return;
    }

    const viper = viperControllerRef.current;
    const module = viperModuleRef.current;
    const { inputPtr, outputPtr } = processorMemoryRef.current;
    const frames = inputL.length;

    // Copy input to WASM memory (interleaved stereo)
    for (let i = 0; i < frames; i++) {
      module.setValue(inputPtr + (i * 2) * 4, inputL[i], 'float');
      module.setValue(inputPtr + (i * 2 + 1) * 4, inputR[i], 'float');
    }

    // Process through ViPER
    viper.process(inputPtr, frames, outputPtr);

    // Copy output from WASM memory
    const outputLArray = new Float32Array(frames);
    const outputRArray = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
      outputLArray[i] = module.getValue(outputPtr + (i * 2) * 4, 'float');
      outputRArray[i] = module.getValue(outputPtr + (i * 2 + 1) * 4, 'float');
    }

    // Send processed audio back to worklet
    workletNodeRef.current.port.postMessage({
      type: 'processedAudio',
      outputL: outputLArray,
      outputR: outputRArray,
      sequence
    });
  }, []);

  // Initialize AudioWorklet
  const initAudioWorklet = useCallback(async (ctx: AudioContext): Promise<AudioWorkletNode | null> => {
    if (workletReadyRef.current && workletNodeRef.current) {
      return workletNodeRef.current;
    }

    try {
      // Register the worklet processor
      await ctx.audioWorklet.addModule('/viper-worklet-processor.js');

      // Create the worklet node
      const workletNode = new AudioWorkletNode(ctx, 'viper-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 2,
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers',
      });

      // Handle messages from worklet
      workletNode.port.onmessage = (event) => {
        const data = event.data;
        if (data.type === 'ready') {
          console.log('[ViPER] AudioWorklet ready');
          workletReadyRef.current = true;
        } else if (data.type === 'inputAudio') {
          // Process audio in main thread with WASM
          processAudioInMainThread(data.inputL, data.inputR, data.sequence);
        }
      };

      workletNodeRef.current = workletNode;
      console.log('[ViPER] AudioWorklet initialized');
      return workletNode;
    } catch (err) {
      console.error('[ViPER] AudioWorklet initialization failed:', err);
      return null;
    }
  }, [processAudioInMainThread]);

  // Load audio file
  const loadAudioFile = useCallback(async (file: File) => {
    if (!viperControllerRef.current || !viperModuleRef.current) {
      setError('ViPER not initialized');
      return;
    }

    // Clear any previous errors and set loading state
    setError(null);
    setIsLoadingAudio(true);

    try {
      setAudioFileName(file.name);

      // Create or resume audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Initialize AudioWorklet
      await initAudioWorklet(audioContextRef.current);

      // Decode audio file
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;

      // Set sample rate in ViPER controller
      viperControllerRef.current.setSampleRate(audioBuffer.sampleRate);

      setDuration(audioBuffer.duration);
      setCurrentTime(0);
      pauseTimeRef.current = 0;

      console.log(`[ViPER] Loaded audio: ${file.name}, ${audioBuffer.sampleRate}Hz, ${audioBuffer.duration.toFixed(2)}s`);
    } catch (err) {
      console.error('[ViPER] Error loading audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audio file');
      setAudioFileName(null);
    } finally {
      setIsLoadingAudio(false);
    }
  }, [initAudioWorklet]);

  // Helper to clean up audio nodes
  const cleanupPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    // Reset worklet buffer state
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: 'reset' });
    }
  }, []);

  // Play
  const play = useCallback(async () => {
    if (!audioContextRef.current || !audioBufferRef.current) {
      setError('No audio loaded');
      return;
    }

    // Clean up any existing playback
    cleanupPlayback();

    const ctx = audioContextRef.current;

    // Resume context if suspended
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Ensure worklet is ready
    if (!workletNodeRef.current) {
      await initAudioWorklet(ctx);
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;

    // Connect through worklet
    if (workletNodeRef.current) {
      source.connect(workletNodeRef.current);
      workletNodeRef.current.connect(ctx.destination);
    } else {
      // Fallback: direct connection if worklet failed
      source.connect(ctx.destination);
    }

    source.onended = () => {
      if (isPlayingRef.current) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentTime(duration);
      }
    };

    // Start playback from current position
    const offset = pauseTimeRef.current;
    startTimeRef.current = ctx.currentTime;
    source.start(0, offset);
    sourceNodeRef.current = source;

    isPlayingRef.current = true;
    setIsPlaying(true);
  }, [cleanupPlayback, initAudioWorklet, duration]);

  // Pause
  const pause = useCallback(() => {
    if (sourceNodeRef.current && audioContextRef.current) {
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current;
    }
    cleanupPlayback();
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [cleanupPlayback]);

  // Stop
  const stop = useCallback(() => {
    cleanupPlayback();
    pauseTimeRef.current = 0;
    setCurrentTime(0);
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [cleanupPlayback]);

  // Seek
  const seek = useCallback((time: number) => {
    const wasPlaying = isPlayingRef.current;

    if (wasPlaying) {
      cleanupPlayback();
      isPlayingRef.current = false;
      setIsPlaying(false);
    }

    pauseTimeRef.current = time;
    setCurrentTime(time);

    if (wasPlaying) {
      // Use setTimeout to ensure state is updated before playing again
      setTimeout(() => {
        play();
      }, 10);
    }
  }, [cleanupPlayback, play]);

  // Update effect
  const updateEffect = useCallback(<K extends keyof ViperEffectState>(key: K, value: ViperEffectState[K]) => {
    setEffectState(prev => ({ ...prev, [key]: value }));

    const controller = viperControllerRef.current;
    if (!controller) return;

    // Apply the effect change to the ViPER controller
    switch (key) {
      case 'enabled':
        controller.setEnabled(value as boolean);
        // Also notify worklet
        if (workletNodeRef.current) {
          workletNodeRef.current.port.postMessage({ type: 'setEnabled', value });
        }
        break;
      case 'convolverEnabled':
        controller.setConvolverEnabled(value as boolean);
        break;
      case 'convolverCrossChannel':
        controller.setConvolverCrossChannel(value as number);
        break;
      case 'vheEnabled':
        controller.setVHEEnabled(value as boolean);
        break;
      case 'vheLevel':
        controller.setVHELevel(value as number);
        break;
      case 'ddcEnabled':
        controller.setDDCEnabled(value as boolean);
        break;
      case 'spectrumExtendEnabled':
        controller.setSpectrumExtendEnabled(value as boolean);
        break;
      case 'spectrumExtendBark':
        controller.setSpectrumExtendBark(value as number);
        break;
      case 'spectrumExtendBarkReconstruct':
        controller.setSpectrumExtendBarkReconstruct(value as number);
        break;
      case 'firEqualizerEnabled':
        controller.setFIREqualizerEnabled(value as boolean);
        break;
      case 'firEqualizerBands':
        // Update all bands when the array is replaced
        (value as number[]).forEach((gain, index) => {
          controller.setFIREqualizerBand(index, gain);
        });
        break;
      case 'fieldSurroundEnabled':
        controller.setFieldSurroundEnabled(value as boolean);
        break;
      case 'fieldSurroundWidening':
        controller.setFieldSurroundWidening(value as number);
        break;
      case 'fieldSurroundMidImage':
        controller.setFieldSurroundMidImage(value as number);
        break;
      case 'fieldSurroundDepth':
        controller.setFieldSurroundDepth(value as number);
        break;
      case 'diffSurroundEnabled':
        controller.setDiffSurroundEnabled(value as boolean);
        break;
      case 'diffSurroundDelay':
        controller.setDiffSurroundDelay(value as number);
        break;
      case 'reverbEnabled':
        controller.setReverbEnabled(value as boolean);
        break;
      case 'reverbRoomSize':
        controller.setReverbRoomSize(value as number);
        break;
      case 'reverbRoomWidth':
        controller.setReverbRoomWidth(value as number);
        break;
      case 'reverbDampening':
        controller.setReverbDampening(value as number);
        break;
      case 'reverbWetSignal':
        controller.setReverbWetSignal(value as number);
        break;
      case 'reverbDrySignal':
        controller.setReverbDrySignal(value as number);
        break;
      case 'agcEnabled':
        controller.setAGCEnabled(value as boolean);
        break;
      case 'agcRatio':
        controller.setAGCRatio(value as number);
        break;
      case 'agcVolume':
        controller.setAGCVolume(value as number);
        break;
      case 'agcMaxScaler':
        controller.setAGCMaxScaler(value as number);
        break;
      case 'dynamicSystemEnabled':
        controller.setDynamicSystemEnabled(value as boolean);
        break;
      case 'dynamicSystemStrength':
        controller.setDynamicSystemStrength(value as number);
        break;
      case 'viperBassEnabled':
        controller.setViperBassEnabled(value as boolean);
        break;
      case 'viperBassMode':
        controller.setViperBassMode(value as number);
        break;
      case 'viperBassFrequency':
        controller.setViperBassFrequency(value as number);
        break;
      case 'viperBassGain':
        controller.setViperBassGain(value as number);
        break;
      case 'viperClarityEnabled':
        controller.setViperClarityEnabled(value as boolean);
        break;
      case 'viperClarityMode':
        controller.setViperClarityMode(value as number);
        break;
      case 'viperClarityGain':
        controller.setViperClarityGain(value as number);
        break;
      case 'cureEnabled':
        controller.setCureEnabled(value as boolean);
        break;
      case 'cureLevel':
        controller.setCureLevel(value as number);
        break;
      case 'tubeSimulatorEnabled':
        controller.setTubeSimulatorEnabled(value as boolean);
        break;
      case 'analogXEnabled':
        controller.setAnalogXEnabled(value as boolean);
        break;
      case 'analogXMode':
        controller.setAnalogXMode(value as number);
        break;
      case 'outputVolume':
        controller.setOutputVolume(value as number);
        break;
      case 'outputPan':
        controller.setOutputPan(value as number);
        break;
      case 'limiterThreshold':
        controller.setLimiterThreshold(value as number);
        break;
      case 'speakerOptimizationEnabled':
        controller.setSpeakerOptimizationEnabled(value as boolean);
        break;
      case 'fetCompressorEnabled':
        controller.setFETCompressorEnabled(value as boolean);
        break;
      case 'fetCompressorThreshold':
        controller.setFETCompressorThreshold(value as number);
        break;
      case 'fetCompressorRatio':
        controller.setFETCompressorRatio(value as number);
        break;
      case 'fetCompressorKnee':
        controller.setFETCompressorKnee(value as number);
        break;
      case 'fetCompressorAutoKnee':
        controller.setFETCompressorAutoKnee(value as boolean);
        break;
      case 'fetCompressorGain':
        controller.setFETCompressorGain(value as number);
        break;
      case 'fetCompressorAutoGain':
        controller.setFETCompressorAutoGain(value as boolean);
        break;
      case 'fetCompressorAttack':
        controller.setFETCompressorAttack(value as number);
        break;
      case 'fetCompressorAutoAttack':
        controller.setFETCompressorAutoAttack(value as boolean);
        break;
      case 'fetCompressorRelease':
        controller.setFETCompressorRelease(value as number);
        break;
      case 'fetCompressorAutoRelease':
        controller.setFETCompressorAutoRelease(value as boolean);
        break;
      case 'fetCompressorNoClip':
        controller.setFETCompressorNoClip(value as boolean);
        break;
    }
  }, []);

  // Update a single equalizer band
  const updateEqualizerBand = useCallback((bandIndex: number, gain: number) => {
    setEffectState(prev => {
      const newBands = [...prev.firEqualizerBands];
      newBands[bandIndex] = gain;
      return { ...prev, firEqualizerBands: newBands };
    });

    const controller = viperControllerRef.current;
    if (controller) {
      controller.setFIREqualizerBand(bandIndex, gain);
    }
  }, []);

  // Reset effects
  const resetEffects = useCallback(() => {
    setEffectState(defaultEffectState);
    if (viperControllerRef.current) {
      viperControllerRef.current.resetAllEffects();
    }
  }, []);

  return {
    isLoading,
    isLoadingAudio,
    isPlaying,
    error,
    effectState,
    version,
    architecture,
    currentTime,
    duration,
    audioFileName,
    loadAudioFile,
    play,
    pause,
    stop,
    seek,
    updateEffect,
    updateEqualizerBand,
    resetEffects,
  };
}
