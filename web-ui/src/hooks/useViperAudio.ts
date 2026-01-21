import { useState, useEffect, useCallback, useRef } from 'react';
import { ViperController, ViperModule, ViperEffectState, defaultEffectState } from '../types/viper';

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
  resetEffects: () => void;
}

export function useViperAudio(): UseViperAudioResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [effectState, setEffectState] = useState<ViperEffectState>(defaultEffectState);
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
  // Reserved for future AudioWorklet implementation
  const _workletNodeRef = useRef<AudioWorkletNode | null>(null);
  void _workletNodeRef; // Suppress unused warning
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

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

  // Load audio file
  const loadAudioFile = useCallback(async (file: File) => {
    if (!viperControllerRef.current || !viperModuleRef.current) {
      setError('ViPER not initialized');
      return;
    }

    try {
      setAudioFileName(file.name);

      // Create or resume audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Decode audio file
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;

      // Set sample rate in ViPER
      viperControllerRef.current.setSampleRate(audioBuffer.sampleRate);

      setDuration(audioBuffer.duration);
      setCurrentTime(0);
      pauseTimeRef.current = 0;

      console.log(`[ViPER] Loaded audio: ${file.name}, ${audioBuffer.sampleRate}Hz, ${audioBuffer.duration.toFixed(2)}s`);
    } catch (err) {
      console.error('[ViPER] Error loading audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audio file');
    }
  }, []);

  // Create a processor that applies ViPER effects
  const createViperProcessor = useCallback(() => {
    if (!audioContextRef.current || !viperControllerRef.current || !viperModuleRef.current) {
      return null;
    }

    const ctx = audioContextRef.current;
    const viper = viperControllerRef.current;
    const module = viperModuleRef.current;
    const bufferSize = 2048;

    // Create a ScriptProcessorNode (deprecated but widely supported)
    // In production, you'd use AudioWorklet
    const processor = ctx.createScriptProcessor(bufferSize, 2, 2);

    // Allocate memory for input and output
    const inputPtr = module._malloc(bufferSize * 2 * 4); // stereo float32
    const outputPtr = module._malloc(bufferSize * 2 * 4);

    processor.onaudioprocess = (event) => {
      const inputL = event.inputBuffer.getChannelData(0);
      const inputR = event.inputBuffer.getChannelData(1);
      const outputL = event.outputBuffer.getChannelData(0);
      const outputR = event.outputBuffer.getChannelData(1);

      // Interleave input samples
      for (let i = 0; i < bufferSize; i++) {
        module.HEAPF32[(inputPtr >> 2) + i * 2] = inputL[i];
        module.HEAPF32[(inputPtr >> 2) + i * 2 + 1] = inputR[i];
      }

      // Process through ViPER
      viper.process(inputPtr, bufferSize, outputPtr);

      // Deinterleave output samples
      for (let i = 0; i < bufferSize; i++) {
        outputL[i] = module.HEAPF32[(outputPtr >> 2) + i * 2];
        outputR[i] = module.HEAPF32[(outputPtr >> 2) + i * 2 + 1];
      }
    };

    // Store cleanup function
    (processor as unknown as { cleanup?: () => void }).cleanup = () => {
      module._free(inputPtr);
      module._free(outputPtr);
    };

    return processor;
  }, []);

  // Play
  const play = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) {
      setError('No audio loaded');
      return;
    }

    // Stop any existing playback
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }

    const ctx = audioContextRef.current;
    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;

    // Create processor
    const processor = createViperProcessor();
    if (processor) {
      source.connect(processor);
      processor.connect(ctx.destination);
    } else {
      source.connect(ctx.destination);
    }

    source.onended = () => {
      if (isPlaying) {
        setIsPlaying(false);
        setCurrentTime(duration);
      }
    };

    // Start playback from current position
    const offset = pauseTimeRef.current;
    startTimeRef.current = ctx.currentTime;
    source.start(0, offset);
    sourceNodeRef.current = source;

    setIsPlaying(true);
  }, [createViperProcessor, duration, isPlaying]);

  // Pause
  const pause = useCallback(() => {
    if (sourceNodeRef.current && audioContextRef.current) {
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current;
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Stop
  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    pauseTimeRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  // Seek
  const seek = useCallback((time: number) => {
    pauseTimeRef.current = time;
    setCurrentTime(time);

    if (isPlaying) {
      pause();
      play();
    }
  }, [isPlaying, pause, play]);

  // Update effect
  const updateEffect = useCallback(<K extends keyof ViperEffectState>(key: K, value: ViperEffectState[K]) => {
    setEffectState(prev => ({ ...prev, [key]: value }));

    const controller = viperControllerRef.current;
    if (!controller) return;

    // Apply the effect change to the ViPER controller
    switch (key) {
      case 'enabled':
        controller.setEnabled(value as boolean);
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

  // Reset effects
  const resetEffects = useCallback(() => {
    setEffectState(defaultEffectState);
    if (viperControllerRef.current) {
      viperControllerRef.current.resetAllEffects();
    }
  }, []);

  return {
    isLoading,
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
    resetEffects,
  };
}
