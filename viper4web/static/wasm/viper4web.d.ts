// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
declare namespace RuntimeExports {
    /**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Array=} args
     * @param {Object=} opts
     */
    function ccall(ident: any, returnType?: (string | null) | undefined, argTypes?: any[] | undefined, args?: any[] | undefined, opts?: any | undefined): any;
    /**
     * @param {string=} returnType
     * @param {Array=} argTypes
     * @param {Object=} opts
     */
    function cwrap(ident: any, returnType?: string | undefined, argTypes?: any[] | undefined, opts?: any | undefined): any;
    /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
    function setValue(ptr: number, value: number, type?: string): void;
    /**
     * @param {number} ptr
     * @param {string} type
     */
    function getValue(ptr: number, type?: string): any;
}
interface WasmModule {
  _malloc(_0: number): number;
  _free(_0: number): void;
}

export interface ClassHandle {
  isAliasOf(other: ClassHandle): boolean;
  delete(): void;
  deleteLater(): this;
  isDeleted(): boolean;
  // @ts-ignore - If targeting lower than ESNext, this symbol might not exist.
  [Symbol.dispose](): void;
  clone(): this;
}
export interface ViperController extends ClassHandle {
  resetAllEffects(): void;
  setEnabled(_0: boolean): void;
  isEnabled(): boolean;
  setConvolverEnabled(_0: boolean): void;
  setVHEEnabled(_0: boolean): void;
  setDDCEnabled(_0: boolean): void;
  setSpectrumExtendEnabled(_0: boolean): void;
  setFIREqualizerEnabled(_0: boolean): void;
  setFieldSurroundEnabled(_0: boolean): void;
  setDiffSurroundEnabled(_0: boolean): void;
  setReverbEnabled(_0: boolean): void;
  setAGCEnabled(_0: boolean): void;
  setDynamicSystemEnabled(_0: boolean): void;
  setViperBassEnabled(_0: boolean): void;
  setViperClarityEnabled(_0: boolean): void;
  setCureEnabled(_0: boolean): void;
  setTubeSimulatorEnabled(_0: boolean): void;
  setAnalogXEnabled(_0: boolean): void;
  setSpeakerOptimizationEnabled(_0: boolean): void;
  setFETCompressorEnabled(_0: boolean): void;
  setFETCompressorAutoKnee(_0: boolean): void;
  setFETCompressorAutoGain(_0: boolean): void;
  setFETCompressorAutoAttack(_0: boolean): void;
  setFETCompressorAutoRelease(_0: boolean): void;
  setFETCompressorNoClip(_0: boolean): void;
  setVHELevel(_0: number): void;
  setSpectrumExtendBark(_0: number): void;
  setSpectrumExtendBarkReconstruct(_0: number): void;
  setFieldSurroundWidening(_0: number): void;
  setFieldSurroundMidImage(_0: number): void;
  setFieldSurroundDepth(_0: number): void;
  setDiffSurroundDelay(_0: number): void;
  setReverbRoomSize(_0: number): void;
  setReverbRoomWidth(_0: number): void;
  setReverbDampening(_0: number): void;
  setReverbWetSignal(_0: number): void;
  setReverbDrySignal(_0: number): void;
  setAGCRatio(_0: number): void;
  setAGCVolume(_0: number): void;
  setAGCMaxScaler(_0: number): void;
  setDynamicSystemXCoeffs(_0: number, _1: number): void;
  setDynamicSystemYCoeffs(_0: number, _1: number): void;
  setDynamicSystemSideGain(_0: number, _1: number): void;
  setDynamicSystemBassGain(_0: number): void;
  setViperBassMode(_0: number): void;
  setViperBassFrequency(_0: number): void;
  setViperBassGain(_0: number): void;
  setViperClarityMode(_0: number): void;
  setViperClarityGain(_0: number): void;
  setCureLevel(_0: number): void;
  setAnalogXMode(_0: number): void;
  setOutputVolume(_0: number): void;
  setOutputPan(_0: number): void;
  setLimiterThreshold(_0: number): void;
  setFETCompressorThreshold(_0: number): void;
  setFETCompressorRatio(_0: number): void;
  setFETCompressorKnee(_0: number): void;
  setFETCompressorGain(_0: number): void;
  setFETCompressorAttack(_0: number): void;
  setFETCompressorRelease(_0: number): void;
  setParameter(_0: number, _1: number, _2: number, _3: number, _4: number): void;
  setParameter2(_0: number, _1: number): void;
  setParameter3(_0: number, _1: number, _2: number): void;
  setSampleRate(_0: number): void;
  getSampleRate(): number;
  process(_0: number, _1: number, _2: number): void;
  setConvolverCrossChannel(_0: number): void;
  setFIREqualizerBand(_0: number, _1: number): void;
  getVersion(): string;
  getArchitecture(): string;
}

interface EmbindModule {
  ViperController: {
    new(): ViperController;
  };
}

export type MainModule = WasmModule & typeof RuntimeExports & EmbindModule;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
