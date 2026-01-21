import { useCallback } from 'react';

// Equalizer frequency bands in Hz
export const EQ_BANDS = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export const EQ_MIN_GAIN = -12;
export const EQ_MAX_GAIN = 12;

interface EqualizerProps {
  bands: number[];
  onChange: (bandIndex: number, value: number) => void;
  disabled?: boolean;
}

function formatFrequency(freq: number): string {
  if (freq >= 1000) {
    return `${freq / 1000}k`;
  }
  return `${freq}`;
}

export function Equalizer({ bands, onChange, disabled = false }: EqualizerProps) {
  const handleBandChange = useCallback((index: number, value: number) => {
    if (!disabled) {
      onChange(index, value);
    }
  }, [onChange, disabled]);

  return (
    <div className={`w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Gain labels */}
      <div className="flex justify-between text-xs text-dark-400 mb-2 px-1">
        <span>+{EQ_MAX_GAIN}dB</span>
        <span>0dB</span>
        <span>{EQ_MIN_GAIN}dB</span>
      </div>

      {/* Equalizer bands */}
      <div className="flex items-stretch justify-between gap-1 h-52 bg-dark-800/50 rounded-lg p-3 relative overflow-hidden">
        {/* Center line (0dB) */}
        <div className="absolute left-3 right-3 top-1/2 h-px bg-dark-600 z-0" />

        {bands.map((gain, index) => (
          <div key={EQ_BANDS[index]} className="flex flex-col items-center flex-1 min-w-0 h-full z-10">
            {/* Slider container */}
            <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
              <input
                type="range"
                min={EQ_MIN_GAIN}
                max={EQ_MAX_GAIN}
                step={0.5}
                value={gain}
                onChange={(e) => handleBandChange(index, parseFloat(e.target.value))}
                disabled={disabled}
                className="eq-slider"
              />
            </div>
            {/* Frequency label */}
            <span className="text-[10px] text-dark-400 mt-1 font-mono whitespace-nowrap">
              {formatFrequency(EQ_BANDS[index])}
            </span>
          </div>
        ))}
      </div>

      {/* Current values display */}
      <div className="flex justify-between mt-2 gap-1">
        {bands.map((gain, index) => (
          <div key={`val-${index}`} className="flex-1 text-center">
            <span className={`text-[10px] font-mono ${gain > 0 ? 'text-green-400' : gain < 0 ? 'text-red-400' : 'text-dark-400'}`}>
              {gain > 0 ? '+' : ''}{gain.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2 mt-3 flex-wrap">
        <PresetButton
          label="Flat"
          onClick={() => bands.forEach((_, i) => handleBandChange(i, 0))}
          disabled={disabled}
        />
        <PresetButton
          label="Bass Boost"
          onClick={() => {
            handleBandChange(0, 6);
            handleBandChange(1, 5);
            handleBandChange(2, 3);
            handleBandChange(3, 1);
            bands.slice(4).forEach((_, i) => handleBandChange(i + 4, 0));
          }}
          disabled={disabled}
        />
        <PresetButton
          label="Treble Boost"
          onClick={() => {
            bands.slice(0, 6).forEach((_, i) => handleBandChange(i, 0));
            handleBandChange(6, 1);
            handleBandChange(7, 3);
            handleBandChange(8, 5);
            handleBandChange(9, 6);
          }}
          disabled={disabled}
        />
        <PresetButton
          label="V-Shape"
          onClick={() => {
            handleBandChange(0, 5);
            handleBandChange(1, 3);
            handleBandChange(2, 1);
            handleBandChange(3, -1);
            handleBandChange(4, -2);
            handleBandChange(5, -2);
            handleBandChange(6, -1);
            handleBandChange(7, 1);
            handleBandChange(8, 3);
            handleBandChange(9, 5);
          }}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

interface PresetButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function PresetButton({ label, onClick, disabled }: PresetButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2 py-1 text-xs bg-dark-700 hover:bg-dark-600 rounded text-dark-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}
