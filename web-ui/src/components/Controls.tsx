import { ReactNode } from 'react';

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({ enabled, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      className={`toggle-switch ${enabled ? 'toggle-switch-enabled' : 'toggle-switch-disabled'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      disabled={disabled}
    >
      <span className={`toggle-switch-knob ${enabled ? 'toggle-switch-knob-enabled' : 'toggle-switch-knob-disabled'}`} />
    </button>
  );
}

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  unit?: string;
  disabled?: boolean;
}

export function Slider({ value, min, max, step = 1, onChange, label, unit = '', disabled = false }: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-dark-300">{label}</span>
          <span className="text-viper-400 font-mono">{value}{unit}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={`w-full ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
  );
}

interface SelectProps {
  value: number;
  options: { value: number; label: string }[];
  onChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
}

export function Select({ value, options, onChange, label, disabled = false }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-sm text-dark-300">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={`bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:border-viper-500 focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface EffectCardProps {
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: ReactNode;
  icon?: ReactNode;
}

export function EffectCard({ title, enabled, onToggle, children, icon }: EffectCardProps) {
  return (
    <div className={`effect-card ${enabled ? 'border-viper-500/50' : ''}`}>
      <div className="effect-card-header">
        <div className="flex items-center gap-2">
          {icon && <span className="text-viper-400">{icon}</span>}
          <h3 className="effect-card-title">{title}</h3>
        </div>
        <ToggleSwitch enabled={enabled} onChange={onToggle} />
      </div>
      <div className={`space-y-3 ${enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        {children}
      </div>
    </div>
  );
}
