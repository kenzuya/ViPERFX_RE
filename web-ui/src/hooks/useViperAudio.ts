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
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const workletReadyRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Initialize ViPER Module (for version info and main thread controller)
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
      if (workletNodeRef.current) {
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

  // Initialize AudioWorklet
  const initAudioWorklet = useCallback(async (ctx: AudioContext) => {
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
        if (data.type === 'initialized') {
          if (data.success) {
            console.log('[ViPER] AudioWorklet initialized successfully');
            workletReadyRef.current = true;
          } else {
            console.error('[ViPER] AudioWorklet initialization failed:', data.error);
          }
        }
      };

      // Initialize the worklet with WASM module
      workletNode.port.postMessage({
        type: 'init',
        wasmUrl: '/wasm/viper4web.js'
      });

      // Set sample rate
      workletNode.port.postMessage({
        type: 'setSampleRate',
        value: ctx.sampleRate
      });

      workletNodeRef.current = workletNode;

      // Wait for initialization
      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (workletReadyRef.current) {
            resolve();
          } else {
            setTimeout(checkReady, 50);
          }
        };
        // Give it some time then resolve anyway (fallback to main thread processing)
        setTimeout(() => resolve(), 2000);
        checkReady();
      });

      return workletNode;
    } catch (err) {
      console.error('[ViPER] Failed to initialize AudioWorklet:', err);
      throw err;
    }
  }, []);

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

      // Initialize AudioWorklet if not already done
      await initAudioWorklet(audioContextRef.current);

      // Decode audio file
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;

      // Set sample rate in main thread ViPER controller
      viperControllerRef.current.setSampleRate(audioBuffer.sampleRate);

      // Also update worklet's sample rate
      if (workletNodeRef.current) {
        workletNodeRef.current.port.postMessage({
          type: 'setSampleRate',
          value: audioBuffer.sampleRate
        });
      }

      setDuration(audioBuffer.duration);
      setCurrentTime(0);
      pauseTimeRef.current = 0;

      console.log(`[ViPER] Loaded audio: ${file.name}, ${audioBuffer.sampleRate}Hz, ${audioBuffer.duration.toFixed(2)}s`);
    } catch (err) {
      console.error('[ViPER] Error loading audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audio file');
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

    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;

    // Connect through worklet if available, otherwise direct
    if (workletNodeRef.current && workletReadyRef.current) {
      source.connect(workletNodeRef.current);
      workletNodeRef.current.connect(ctx.destination);
    } else if (viperControllerRef.current && viperModuleRef.current) {
      // Fallback: process in main thread using ScriptProcessorNode
      const module = viperModuleRef.current;
      const viper = viperControllerRef.current;
      const bufferSize = 2048;
      const processor = ctx.createScriptProcessor(bufferSize, 2, 2);

      const inputPtr = module._malloc(bufferSize * 2 * 4);
      const outputPtr = module._malloc(bufferSize * 2 * 4);

      processor.onaudioprocess = (event) => {
        const inputL = event.inputBuffer.getChannelData(0);
        const inputR = event.inputBuffer.getChannelData(1);
        const outputL = event.outputBuffer.getChannelData(0);
        const outputR = event.outputBuffer.getChannelData(1);

        for (let i = 0; i < bufferSize; i++) {
          module.setValue(inputPtr + (i * 2) * 4, inputL[i], 'float');
          module.setValue(inputPtr + (i * 2 + 1) * 4, inputR[i], 'float');
        }

        viper.process(inputPtr, bufferSize, outputPtr);

        for (let i = 0; i < bufferSize; i++) {
          outputL[i] = module.getValue(outputPtr + (i * 2) * 4, 'float');
          outputR[i] = module.getValue(outputPtr + (i * 2 + 1) * 4, 'float');
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);
    } else {
      // No processing available, direct connection
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
  }, [cleanupPlayback, duration]);

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
      }, 0);
    }
  }, [cleanupPlayback, play]);

  // Send effect update to worklet
  const sendEffectToWorklet = useCallback((method: string, value: unknown, args?: unknown[]) => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({
        type: 'setEffect',
        method,
        value,
        args
      });
    }
  }, []);

  // Update effect
  const updateEffect = useCallback(<K extends keyof ViperEffectState>(key: K, value: ViperEffectState[K]) => {
    setEffectState(prev => ({ ...prev, [key]: value }));

    const controller = viperControllerRef.current;
    if (!controller) return;

    // Apply the effect change to both main thread and worklet
    switch (key) {
      case 'enabled':
        controller.setEnabled(value as boolean);
        sendEffectToWorklet('setEnabled', value);
        break;
      case 'convolverEnabled':
        controller.setConvolverEnabled(value as boolean);
        sendEffectToWorklet('setConvolverEnabled', value);
        break;
      case 'convolverCrossChannel':
        controller.setConvolverCrossChannel(value as number);
        sendEffectToWorklet('setConvolverCrossChannel', value);
        break;
      case 'vheEnabled':
        controller.setVHEEnabled(value as boolean);
        sendEffectToWorklet('setVHEEnabled', value);
        break;
      case 'vheLevel':
        controller.setVHELevel(value as number);
        sendEffectToWorklet('setVHELevel', value);
        break;
      case 'ddcEnabled':
        controller.setDDCEnabled(value as boolean);
        sendEffectToWorklet('setDDCEnabled', value);
        break;
      case 'spectrumExtendEnabled':
        controller.setSpectrumExtendEnabled(value as boolean);
        sendEffectToWorklet('setSpectrumExtendEnabled', value);
        break;
      case 'spectrumExtendBark':
        controller.setSpectrumExtendBark(value as number);
        sendEffectToWorklet('setSpectrumExtendBark', value);
        break;
      case 'spectrumExtendBarkReconstruct':
        controller.setSpectrumExtendBarkReconstruct(value as number);
        sendEffectToWorklet('setSpectrumExtendBarkReconstruct', value);
        break;
      case 'firEqualizerEnabled':
        controller.setFIREqualizerEnabled(value as boolean);
        sendEffectToWorklet('setFIREqualizerEnabled', value);
        break;
      case 'fieldSurroundEnabled':
        controller.setFieldSurroundEnabled(value as boolean);
        sendEffectToWorklet('setFieldSurroundEnabled', value);
        break;
      case 'fieldSurroundWidening':
        controller.setFieldSurroundWidening(value as number);
        sendEffectToWorklet('setFieldSurroundWidening', value);
        break;
      case 'fieldSurroundMidImage':
        controller.setFieldSurroundMidImage(value as number);
        sendEffectToWorklet('setFieldSurroundMidImage', value);
        break;
      case 'fieldSurroundDepth':
        controller.setFieldSurroundDepth(value as number);
        sendEffectToWorklet('setFieldSurroundDepth', value);
        break;
      case 'diffSurroundEnabled':
        controller.setDiffSurroundEnabled(value as boolean);
        sendEffectToWorklet('setDiffSurroundEnabled', value);
        break;
      case 'diffSurroundDelay':
        controller.setDiffSurroundDelay(value as number);
        sendEffectToWorklet('setDiffSurroundDelay', value);
        break;
      case 'reverbEnabled':
        controller.setReverbEnabled(value as boolean);
        sendEffectToWorklet('setReverbEnabled', value);
        break;
      case 'reverbRoomSize':
        controller.setReverbRoomSize(value as number);
        sendEffectToWorklet('setReverbRoomSize', value);
        break;
      case 'reverbRoomWidth':
        controller.setReverbRoomWidth(value as number);
        sendEffectToWorklet('setReverbRoomWidth', value);
        break;
      case 'reverbDampening':
        controller.setReverbDampening(value as number);
        sendEffectToWorklet('setReverbDampening', value);
        break;
      case 'reverbWetSignal':
        controller.setReverbWetSignal(value as number);
        sendEffectToWorklet('setReverbWetSignal', value);
        break;
      case 'reverbDrySignal':
        controller.setReverbDrySignal(value as number);
        sendEffectToWorklet('setReverbDrySignal', value);
        break;
      case 'agcEnabled':
        controller.setAGCEnabled(value as boolean);
        sendEffectToWorklet('setAGCEnabled', value);
        break;
      case 'agcRatio':
        controller.setAGCRatio(value as number);
        sendEffectToWorklet('setAGCRatio', value);
        break;
      case 'agcVolume':
        controller.setAGCVolume(value as number);
        sendEffectToWorklet('setAGCVolume', value);
        break;
      case 'agcMaxScaler':
        controller.setAGCMaxScaler(value as number);
        sendEffectToWorklet('setAGCMaxScaler', value);
        break;
      case 'dynamicSystemEnabled':
        controller.setDynamicSystemEnabled(value as boolean);
        sendEffectToWorklet('setDynamicSystemEnabled', value);
        break;
      case 'dynamicSystemStrength':
        controller.setDynamicSystemStrength(value as number);
        sendEffectToWorklet('setDynamicSystemStrength', value);
        break;
      case 'viperBassEnabled':
        controller.setViperBassEnabled(value as boolean);
        sendEffectToWorklet('setViperBassEnabled', value);
        break;
      case 'viperBassMode':
        controller.setViperBassMode(value as number);
        sendEffectToWorklet('setViperBassMode', value);
        break;
      case 'viperBassFrequency':
        controller.setViperBassFrequency(value as number);
        sendEffectToWorklet('setViperBassFrequency', value);
        break;
      case 'viperBassGain':
        controller.setViperBassGain(value as number);
        sendEffectToWorklet('setViperBassGain', value);
        break;
      case 'viperClarityEnabled':
        controller.setViperClarityEnabled(value as boolean);
        sendEffectToWorklet('setViperClarityEnabled', value);
        break;
      case 'viperClarityMode':
        controller.setViperClarityMode(value as number);
        sendEffectToWorklet('setViperClarityMode', value);
        break;
      case 'viperClarityGain':
        controller.setViperClarityGain(value as number);
        sendEffectToWorklet('setViperClarityGain', value);
        break;
      case 'cureEnabled':
        controller.setCureEnabled(value as boolean);
        sendEffectToWorklet('setCureEnabled', value);
        break;
      case 'cureLevel':
        controller.setCureLevel(value as number);
        sendEffectToWorklet('setCureLevel', value);
        break;
      case 'tubeSimulatorEnabled':
        controller.setTubeSimulatorEnabled(value as boolean);
        sendEffectToWorklet('setTubeSimulatorEnabled', value);
        break;
      case 'analogXEnabled':
        controller.setAnalogXEnabled(value as boolean);
        sendEffectToWorklet('setAnalogXEnabled', value);
        break;
      case 'analogXMode':
        controller.setAnalogXMode(value as number);
        sendEffectToWorklet('setAnalogXMode', value);
        break;
      case 'outputVolume':
        controller.setOutputVolume(value as number);
        sendEffectToWorklet('setOutputVolume', value);
        break;
      case 'outputPan':
        controller.setOutputPan(value as number);
        sendEffectToWorklet('setOutputPan', value);
        break;
      case 'limiterThreshold':
        controller.setLimiterThreshold(value as number);
        sendEffectToWorklet('setLimiterThreshold', value);
        break;
      case 'speakerOptimizationEnabled':
        controller.setSpeakerOptimizationEnabled(value as boolean);
        sendEffectToWorklet('setSpeakerOptimizationEnabled', value);
        break;
      case 'fetCompressorEnabled':
        controller.setFETCompressorEnabled(value as boolean);
        sendEffectToWorklet('setFETCompressorEnabled', value);
        break;
      case 'fetCompressorThreshold':
        controller.setFETCompressorThreshold(value as number);
        sendEffectToWorklet('setFETCompressorThreshold', value);
        break;
      case 'fetCompressorRatio':
        controller.setFETCompressorRatio(value as number);
        sendEffectToWorklet('setFETCompressorRatio', value);
        break;
      case 'fetCompressorKnee':
        controller.setFETCompressorKnee(value as number);
        sendEffectToWorklet('setFETCompressorKnee', value);
        break;
      case 'fetCompressorAutoKnee':
        controller.setFETCompressorAutoKnee(value as boolean);
        sendEffectToWorklet('setFETCompressorAutoKnee', value);
        break;
      case 'fetCompressorGain':
        controller.setFETCompressorGain(value as number);
        sendEffectToWorklet('setFETCompressorGain', value);
        break;
      case 'fetCompressorAutoGain':
        controller.setFETCompressorAutoGain(value as boolean);
        sendEffectToWorklet('setFETCompressorAutoGain', value);
        break;
      case 'fetCompressorAttack':
        controller.setFETCompressorAttack(value as number);
        sendEffectToWorklet('setFETCompressorAttack', value);
        break;
      case 'fetCompressorAutoAttack':
        controller.setFETCompressorAutoAttack(value as boolean);
        sendEffectToWorklet('setFETCompressorAutoAttack', value);
        break;
      case 'fetCompressorRelease':
        controller.setFETCompressorRelease(value as number);
        sendEffectToWorklet('setFETCompressorRelease', value);
        break;
      case 'fetCompressorAutoRelease':
        controller.setFETCompressorAutoRelease(value as boolean);
        sendEffectToWorklet('setFETCompressorAutoRelease', value);
        break;
      case 'fetCompressorNoClip':
        controller.setFETCompressorNoClip(value as boolean);
        sendEffectToWorklet('setFETCompressorNoClip', value);
        break;
    }
  }, [sendEffectToWorklet]);

  // Reset effects
  const resetEffects = useCallback(() => {
    setEffectState(defaultEffectState);
    if (viperControllerRef.current) {
      viperControllerRef.current.resetAllEffects();
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: 'resetEffects' });
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
