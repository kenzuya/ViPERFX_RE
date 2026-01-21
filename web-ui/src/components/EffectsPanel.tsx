import { ViperEffectState } from '../types/viper';
import { EffectCard, Slider, Select } from './Controls';
import { Equalizer } from './Equalizer';

interface EffectsPanelProps {
  effectState: ViperEffectState;
  onUpdateEffect: <K extends keyof ViperEffectState>(key: K, value: ViperEffectState[K]) => void;
  onUpdateEqualizerBand: (bandIndex: number, gain: number) => void;
}

// Icons as components
const BassIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </svg>
);

const ReverbIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>
);

const SurroundIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
  </svg>
);

const CompressorIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M7 18h10v-2H7v2zM7 13h10v-2H7v2zM7 6v2h10V6H7z"/>
  </svg>
);

const TubeIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
  </svg>
);

const VolumeIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 9v6h4l5 5V4L7 9H3z"/>
  </svg>
);

const EqualizerIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z"/>
  </svg>
);

const DynamicBassIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 3v9.28a4.5 4.5 0 1 0 2 3.72V7h4V3h-6zM6 12h2v8H6zm4-4h2v12h-2zm8 0h2v12h-2z"/>
  </svg>
);

export function EffectsPanel({ effectState, onUpdateEffect, onUpdateEqualizerBand }: EffectsPanelProps) {
  return (
    <div className="space-y-6">
      {/* FIR Equalizer - Full width */}
      <EffectCard
        title="10-Band Equalizer"
        enabled={effectState.firEqualizerEnabled}
        onToggle={(enabled) => onUpdateEffect('firEqualizerEnabled', enabled)}
        icon={<EqualizerIcon />}
      >
        <Equalizer
          bands={effectState.firEqualizerBands}
          onChange={onUpdateEqualizerBand}
          disabled={!effectState.firEqualizerEnabled}
        />
      </EffectCard>

      {/* Other effects grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* ViPER Bass */}
      <EffectCard
        title="ViPER Bass"
        enabled={effectState.viperBassEnabled}
        onToggle={(enabled) => onUpdateEffect('viperBassEnabled', enabled)}
        icon={<BassIcon />}
      >
        <Select
          label="Mode"
          value={effectState.viperBassMode}
          onChange={(value) => onUpdateEffect('viperBassMode', value)}
          options={[
            { value: 0, label: 'Natural Bass' },
            { value: 1, label: 'Pure Bass+' },
            { value: 2, label: 'Subwoofer' },
          ]}
        />
        <Slider
          label="Frequency"
          value={effectState.viperBassFrequency}
          min={20}
          max={200}
          unit="Hz"
          onChange={(value) => onUpdateEffect('viperBassFrequency', value)}
        />
        <Slider
          label="Gain"
          value={effectState.viperBassGain}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('viperBassGain', value)}
        />
      </EffectCard>

      {/* ViPER Clarity */}
      <EffectCard
        title="ViPER Clarity"
        enabled={effectState.viperClarityEnabled}
        onToggle={(enabled) => onUpdateEffect('viperClarityEnabled', enabled)}
        icon={<BassIcon />}
      >
        <Select
          label="Mode"
          value={effectState.viperClarityMode}
          onChange={(value) => onUpdateEffect('viperClarityMode', value)}
          options={[
            { value: 0, label: 'Natural' },
            { value: 1, label: 'OZone+' },
            { value: 2, label: 'XHiFi' },
          ]}
        />
        <Slider
          label="Gain"
          value={effectState.viperClarityGain}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('viperClarityGain', value)}
        />
      </EffectCard>

      {/* Dynamic System (Dynamic Bass) */}
      <EffectCard
        title="Dynamic Bass"
        enabled={effectState.dynamicSystemEnabled}
        onToggle={(enabled) => onUpdateEffect('dynamicSystemEnabled', enabled)}
        icon={<DynamicBassIcon />}
      >
        <Slider
          label="Bass Gain"
          value={effectState.dynamicSystemBassGain}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('dynamicSystemBassGain', value)}
        />
        <Slider
          label="X Side Gain"
          value={effectState.dynamicSystemSideGainX}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('dynamicSystemSideGainX', value)}
        />
        <Slider
          label="Y Side Gain"
          value={effectState.dynamicSystemSideGainY}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('dynamicSystemSideGainY', value)}
        />
        <Slider
          label="X Low Freq"
          value={effectState.dynamicSystemXLowFreq}
          min={10}
          max={200}
          unit="Hz"
          onChange={(value) => onUpdateEffect('dynamicSystemXLowFreq', value)}
        />
        <Slider
          label="X High Freq"
          value={effectState.dynamicSystemXHighFreq}
          min={50}
          max={500}
          unit="Hz"
          onChange={(value) => onUpdateEffect('dynamicSystemXHighFreq', value)}
        />
        <Slider
          label="Y Low Freq"
          value={effectState.dynamicSystemYLowFreq}
          min={50}
          max={500}
          unit="Hz"
          onChange={(value) => onUpdateEffect('dynamicSystemYLowFreq', value)}
        />
        <Slider
          label="Y High Freq"
          value={effectState.dynamicSystemYHighFreq}
          min={100}
          max={1000}
          unit="Hz"
          onChange={(value) => onUpdateEffect('dynamicSystemYHighFreq', value)}
        />
      </EffectCard>

      {/* Reverberation */}
      <EffectCard
        title="Reverb"
        enabled={effectState.reverbEnabled}
        onToggle={(enabled) => onUpdateEffect('reverbEnabled', enabled)}
        icon={<ReverbIcon />}
      >
        <Slider
          label="Room Size"
          value={effectState.reverbRoomSize}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('reverbRoomSize', value)}
        />
        <Slider
          label="Room Width"
          value={effectState.reverbRoomWidth}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('reverbRoomWidth', value)}
        />
        <Slider
          label="Dampening"
          value={effectState.reverbDampening}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('reverbDampening', value)}
        />
        <Slider
          label="Wet"
          value={effectState.reverbWetSignal}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('reverbWetSignal', value)}
        />
        <Slider
          label="Dry"
          value={effectState.reverbDrySignal}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('reverbDrySignal', value)}
        />
      </EffectCard>

      {/* Field Surround */}
      <EffectCard
        title="Field Surround"
        enabled={effectState.fieldSurroundEnabled}
        onToggle={(enabled) => onUpdateEffect('fieldSurroundEnabled', enabled)}
        icon={<SurroundIcon />}
      >
        <Slider
          label="Widening"
          value={effectState.fieldSurroundWidening}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('fieldSurroundWidening', value)}
        />
        <Slider
          label="Mid Image"
          value={effectState.fieldSurroundMidImage}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('fieldSurroundMidImage', value)}
        />
        <Slider
          label="Depth"
          value={effectState.fieldSurroundDepth}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('fieldSurroundDepth', value)}
        />
      </EffectCard>

      {/* VHE (Headphone Engine) */}
      <EffectCard
        title="Headphone Engine"
        enabled={effectState.vheEnabled}
        onToggle={(enabled) => onUpdateEffect('vheEnabled', enabled)}
        icon={<SurroundIcon />}
      >
        <Select
          label="Level"
          value={effectState.vheLevel}
          onChange={(value) => onUpdateEffect('vheLevel', value)}
          options={[
            { value: 0, label: 'Level 0 (Subtle)' },
            { value: 1, label: 'Level 1' },
            { value: 2, label: 'Level 2' },
            { value: 3, label: 'Level 3' },
            { value: 4, label: 'Level 4 (Strong)' },
          ]}
        />
      </EffectCard>

      {/* Differential Surround */}
      <EffectCard
        title="Diff Surround"
        enabled={effectState.diffSurroundEnabled}
        onToggle={(enabled) => onUpdateEffect('diffSurroundEnabled', enabled)}
        icon={<SurroundIcon />}
      >
        <Slider
          label="Delay"
          value={effectState.diffSurroundDelay}
          min={0}
          max={100}
          unit="ms"
          onChange={(value) => onUpdateEffect('diffSurroundDelay', value)}
        />
      </EffectCard>

      {/* Cure (Crossfeed) */}
      <EffectCard
        title="Cure (Crossfeed)"
        enabled={effectState.cureEnabled}
        onToggle={(enabled) => onUpdateEffect('cureEnabled', enabled)}
        icon={<SurroundIcon />}
      >
        <Select
          label="Strength"
          value={effectState.cureLevel}
          onChange={(value) => onUpdateEffect('cureLevel', value)}
          options={[
            { value: 0, label: 'Mid' },
            { value: 1, label: 'Strong' },
            { value: 2, label: 'Super Strong' },
          ]}
        />
      </EffectCard>

      {/* Tube Simulator */}
      <EffectCard
        title="Tube Simulator"
        enabled={effectState.tubeSimulatorEnabled}
        onToggle={(enabled) => onUpdateEffect('tubeSimulatorEnabled', enabled)}
        icon={<TubeIcon />}
      >
        <p className="text-sm text-dark-400">Adds warm tube-like harmonics to the audio.</p>
      </EffectCard>

      {/* AnalogX */}
      <EffectCard
        title="AnalogX"
        enabled={effectState.analogXEnabled}
        onToggle={(enabled) => onUpdateEffect('analogXEnabled', enabled)}
        icon={<TubeIcon />}
      >
        <Select
          label="Mode"
          value={effectState.analogXMode}
          onChange={(value) => onUpdateEffect('analogXMode', value)}
          options={[
            { value: 0, label: 'Mode 0' },
            { value: 1, label: 'Mode 1' },
            { value: 2, label: 'Mode 2' },
          ]}
        />
      </EffectCard>

      {/* Spectrum Extension */}
      <EffectCard
        title="Spectrum Extend"
        enabled={effectState.spectrumExtendEnabled}
        onToggle={(enabled) => onUpdateEffect('spectrumExtendEnabled', enabled)}
        icon={<BassIcon />}
      >
        <Slider
          label="Bark"
          value={effectState.spectrumExtendBark}
          min={0}
          max={100}
          onChange={(value) => onUpdateEffect('spectrumExtendBark', value)}
        />
        <Slider
          label="Reconstruct"
          value={effectState.spectrumExtendBarkReconstruct}
          min={0}
          max={100}
          onChange={(value) => onUpdateEffect('spectrumExtendBarkReconstruct', value)}
        />
      </EffectCard>

      {/* FET Compressor */}
      <EffectCard
        title="FET Compressor"
        enabled={effectState.fetCompressorEnabled}
        onToggle={(enabled) => onUpdateEffect('fetCompressorEnabled', enabled)}
        icon={<CompressorIcon />}
      >
        <Slider
          label="Threshold"
          value={effectState.fetCompressorThreshold}
          min={-60}
          max={0}
          unit="dB"
          onChange={(value) => onUpdateEffect('fetCompressorThreshold', value)}
        />
        <Slider
          label="Ratio"
          value={effectState.fetCompressorRatio}
          min={1}
          max={20}
          unit=":1"
          onChange={(value) => onUpdateEffect('fetCompressorRatio', value)}
        />
        <Slider
          label="Attack"
          value={effectState.fetCompressorAttack}
          min={0}
          max={100}
          unit="ms"
          onChange={(value) => onUpdateEffect('fetCompressorAttack', value)}
        />
        <Slider
          label="Release"
          value={effectState.fetCompressorRelease}
          min={0}
          max={500}
          unit="ms"
          onChange={(value) => onUpdateEffect('fetCompressorRelease', value)}
        />
        <Slider
          label="Gain"
          value={effectState.fetCompressorGain}
          min={0}
          max={30}
          unit="dB"
          onChange={(value) => onUpdateEffect('fetCompressorGain', value)}
        />
      </EffectCard>

      {/* Output Controls */}
      <EffectCard
        title="Output"
        enabled={true}
        onToggle={() => {}}
        icon={<VolumeIcon />}
      >
        <Slider
          label="Volume"
          value={effectState.outputVolume}
          min={0}
          max={200}
          unit="%"
          onChange={(value) => onUpdateEffect('outputVolume', value)}
        />
        <Slider
          label="Pan"
          value={effectState.outputPan}
          min={-100}
          max={100}
          onChange={(value) => onUpdateEffect('outputPan', value)}
        />
        <Slider
          label="Limiter"
          value={effectState.limiterThreshold}
          min={0}
          max={100}
          unit="%"
          onChange={(value) => onUpdateEffect('limiterThreshold', value)}
        />
      </EffectCard>
    </div>
    </div>
  );
}
