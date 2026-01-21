/**
 * ViPER4Web TypeScript Types
 * These types mirror the C++ ViperController class exposed via Embind
 */

export interface ViperController {
  // Core
  process(inputPtr: number, frameCount: number, outputPtr: number): void;
  setSampleRate(rate: number): void;
  getSampleRate(): number;
  setEnabled(enable: boolean): void;
  isEnabled(): boolean;
  resetAllEffects(): void;
  getVersion(): string;
  getArchitecture(): string;

  // Convolver
  setConvolverEnabled(enable: boolean): void;
  setConvolverCrossChannel(value: number): void;

  // VHE
  setVHEEnabled(enable: boolean): void;
  setVHELevel(level: number): void;

  // DDC
  setDDCEnabled(enable: boolean): void;

  // Spectrum Extension
  setSpectrumExtendEnabled(enable: boolean): void;
  setSpectrumExtendBark(bark: number): void;
  setSpectrumExtendBarkReconstruct(reconstruct: number): void;

  // FIR Equalizer
  setFIREqualizerEnabled(enable: boolean): void;
  setFIREqualizerBand(band: number, level: number): void;

  // Field Surround
  setFieldSurroundEnabled(enable: boolean): void;
  setFieldSurroundWidening(value: number): void;
  setFieldSurroundMidImage(value: number): void;
  setFieldSurroundDepth(value: number): void;

  // Differential Surround
  setDiffSurroundEnabled(enable: boolean): void;
  setDiffSurroundDelay(delay: number): void;

  // Reverb
  setReverbEnabled(enable: boolean): void;
  setReverbRoomSize(size: number): void;
  setReverbRoomWidth(width: number): void;
  setReverbDampening(dampening: number): void;
  setReverbWetSignal(wet: number): void;
  setReverbDrySignal(dry: number): void;

  // AGC
  setAGCEnabled(enable: boolean): void;
  setAGCRatio(ratio: number): void;
  setAGCVolume(volume: number): void;
  setAGCMaxScaler(maxScaler: number): void;

  // Dynamic System
  setDynamicSystemEnabled(enable: boolean): void;
  setDynamicSystemSideGain(sideGain1: number, sideGain2: number): void;
  setDynamicSystemStrength(strength: number): void;

  // ViPER Bass
  setViperBassEnabled(enable: boolean): void;
  setViperBassMode(mode: number): void;
  setViperBassFrequency(freq: number): void;
  setViperBassGain(gain: number): void;

  // ViPER Clarity
  setViperClarityEnabled(enable: boolean): void;
  setViperClarityMode(mode: number): void;
  setViperClarityGain(gain: number): void;

  // Cure
  setCureEnabled(enable: boolean): void;
  setCureLevel(level: number): void;

  // Tube Simulator
  setTubeSimulatorEnabled(enable: boolean): void;

  // AnalogX
  setAnalogXEnabled(enable: boolean): void;
  setAnalogXMode(mode: number): void;

  // Output
  setOutputVolume(volume: number): void;
  setOutputPan(pan: number): void;
  setLimiterThreshold(threshold: number): void;

  // Speaker Optimization
  setSpeakerOptimizationEnabled(enable: boolean): void;

  // FET Compressor
  setFETCompressorEnabled(enable: boolean): void;
  setFETCompressorThreshold(threshold: number): void;
  setFETCompressorRatio(ratio: number): void;
  setFETCompressorKnee(knee: number): void;
  setFETCompressorAutoKnee(enable: boolean): void;
  setFETCompressorGain(gain: number): void;
  setFETCompressorAutoGain(enable: boolean): void;
  setFETCompressorAttack(attack: number): void;
  setFETCompressorAutoAttack(enable: boolean): void;
  setFETCompressorRelease(release: number): void;
  setFETCompressorAutoRelease(enable: boolean): void;
  setFETCompressorNoClip(enable: boolean): void;

  // Generic
  setParameter(param: number, val1: number, val2: number, val3: number, val4: number): void;
  setParameter2(param: number, val1: number): void;
  setParameter3(param: number, val1: number, val2: number): void;

  // Destructor
  delete(): void;
}

export interface ViperModule {
  ViperController: new () => ViperController;
  _malloc(size: number): number;
  _free(ptr: number): void;
  HEAPF32: Float32Array;
  HEAP8: Int8Array;
  HEAPU8: Uint8Array;
  setValue(ptr: number, value: number, type: string): void;
  getValue(ptr: number, type: string): number;
}

export interface ViperEffectState {
  // Master
  enabled: boolean;

  // Convolver
  convolverEnabled: boolean;
  convolverCrossChannel: number;

  // VHE
  vheEnabled: boolean;
  vheLevel: number;

  // DDC
  ddcEnabled: boolean;

  // Spectrum Extension
  spectrumExtendEnabled: boolean;
  spectrumExtendBark: number;
  spectrumExtendBarkReconstruct: number;

  // FIR Equalizer
  firEqualizerEnabled: boolean;
  firEqualizerBands: number[];

  // Field Surround
  fieldSurroundEnabled: boolean;
  fieldSurroundWidening: number;
  fieldSurroundMidImage: number;
  fieldSurroundDepth: number;

  // Differential Surround
  diffSurroundEnabled: boolean;
  diffSurroundDelay: number;

  // Reverb
  reverbEnabled: boolean;
  reverbRoomSize: number;
  reverbRoomWidth: number;
  reverbDampening: number;
  reverbWetSignal: number;
  reverbDrySignal: number;

  // AGC
  agcEnabled: boolean;
  agcRatio: number;
  agcVolume: number;
  agcMaxScaler: number;

  // Dynamic System
  dynamicSystemEnabled: boolean;
  dynamicSystemSideGain1: number;
  dynamicSystemSideGain2: number;
  dynamicSystemStrength: number;

  // ViPER Bass
  viperBassEnabled: boolean;
  viperBassMode: number;
  viperBassFrequency: number;
  viperBassGain: number;

  // ViPER Clarity
  viperClarityEnabled: boolean;
  viperClarityMode: number;
  viperClarityGain: number;

  // Cure
  cureEnabled: boolean;
  cureLevel: number;

  // Tube Simulator
  tubeSimulatorEnabled: boolean;

  // AnalogX
  analogXEnabled: boolean;
  analogXMode: number;

  // Output
  outputVolume: number;
  outputPan: number;
  limiterThreshold: number;

  // Speaker Optimization
  speakerOptimizationEnabled: boolean;

  // FET Compressor
  fetCompressorEnabled: boolean;
  fetCompressorThreshold: number;
  fetCompressorRatio: number;
  fetCompressorKnee: number;
  fetCompressorAutoKnee: boolean;
  fetCompressorGain: number;
  fetCompressorAutoGain: boolean;
  fetCompressorAttack: number;
  fetCompressorAutoAttack: boolean;
  fetCompressorRelease: number;
  fetCompressorAutoRelease: boolean;
  fetCompressorNoClip: boolean;
}

// localStorage key for persisting effect state
export const VIPER_STORAGE_KEY = 'viper4web-effect-state';

// Save effect state to localStorage
export function saveEffectState(state: ViperEffectState): void {
  try {
    localStorage.setItem(VIPER_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[ViPER] Failed to save effect state to localStorage:', err);
  }
}

// Load effect state from localStorage
export function loadEffectState(): ViperEffectState | null {
  try {
    const saved = localStorage.getItem(VIPER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate that it has the expected structure by checking a few key properties
      if (typeof parsed === 'object' && parsed !== null && 'enabled' in parsed) {
        return parsed as ViperEffectState;
      }
    }
  } catch (err) {
    console.warn('[ViPER] Failed to load effect state from localStorage:', err);
  }
  return null;
}

// Get initial effect state (from localStorage or defaults)
export function getInitialEffectState(): ViperEffectState {
  const saved = loadEffectState();
  if (saved) {
    // Merge with defaults to ensure all fields exist (in case new fields were added)
    return { ...defaultEffectState, ...saved };
  }
  return defaultEffectState;
}

export const defaultEffectState: ViperEffectState = {
  enabled: true,

  convolverEnabled: false,
  convolverCrossChannel: 0,

  vheEnabled: false,
  vheLevel: 0,

  ddcEnabled: false,

  spectrumExtendEnabled: false,
  spectrumExtendBark: 0,
  spectrumExtendBarkReconstruct: 0,

  firEqualizerEnabled: false,
  firEqualizerBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],

  fieldSurroundEnabled: false,
  fieldSurroundWidening: 0,
  fieldSurroundMidImage: 0,
  fieldSurroundDepth: 0,

  diffSurroundEnabled: false,
  diffSurroundDelay: 0,

  reverbEnabled: false,
  reverbRoomSize: 50,
  reverbRoomWidth: 50,
  reverbDampening: 50,
  reverbWetSignal: 0,
  reverbDrySignal: 100,

  agcEnabled: false,
  agcRatio: 50,
  agcVolume: 100,
  agcMaxScaler: 400,

  dynamicSystemEnabled: false,
  dynamicSystemSideGain1: 0,
  dynamicSystemSideGain2: 0,
  dynamicSystemStrength: 0,

  viperBassEnabled: false,
  viperBassMode: 0,
  viperBassFrequency: 40,
  viperBassGain: 0,

  viperClarityEnabled: false,
  viperClarityMode: 0,
  viperClarityGain: 0,

  cureEnabled: false,
  cureLevel: 0,

  tubeSimulatorEnabled: false,

  analogXEnabled: false,
  analogXMode: 0,

  outputVolume: 100,
  outputPan: 0,
  limiterThreshold: 100,

  speakerOptimizationEnabled: false,

  fetCompressorEnabled: false,
  fetCompressorThreshold: 0,
  fetCompressorRatio: 4,
  fetCompressorKnee: 0,
  fetCompressorAutoKnee: false,
  fetCompressorGain: 0,
  fetCompressorAutoGain: true,
  fetCompressorAttack: 10,
  fetCompressorAutoAttack: false,
  fetCompressorRelease: 100,
  fetCompressorAutoRelease: false,
  fetCompressorNoClip: true,
};
