<script lang="ts">
	/**
	 * EffectsPanel - Main panel containing all audio effect cards
	 *
	 * Displays a grid layout of effect cards including:
	 * - Equalizer (full width)
	 * - ViPER Bass, Clarity, Dynamic Bass
	 * - Reverb, Field Surround, VHE
	 * - Diff Surround, Cure, Tube
	 * - AnalogX, Spectrum, FET Compressor
	 * - Speaker Optimization, Output
	 */

	import type { ViperEffectState } from '$lib/types/viper';
	import { Label } from '$lib/components/ui/label';
	import { Slider } from '$lib/components/ui/slider';
	import * as Select from '$lib/components/ui/select';
	import EffectCard from './EffectCard.svelte';
	import Equalizer from './Equalizer.svelte';
	import {
		EqualizerIcon,
		BassIcon,
		ClarityIcon,
		DynamicBassIcon,
		ReverbIcon,
		SurroundIcon,
		HeadphoneIcon,
		CrossfeedIcon,
		TubeIcon,
		AnalogIcon,
		SpectrumIcon,
		CompressorIcon,
		SpeakerIcon,
		VolumeIcon
	} from './effect-icons';

	interface Props {
		/** Current effect state */
		effectState: ViperEffectState;
		/** Callback when an effect property changes */
		onUpdateEffect?: <K extends keyof ViperEffectState>(key: K, value: ViperEffectState[K]) => void;
		/** Callback when an equalizer band changes */
		onUpdateEqualizerBand?: (bandIndex: number, gain: number) => void;
	}

	let { effectState, onUpdateEffect, onUpdateEqualizerBand }: Props = $props();

	// Helper to update effect state
	function updateEffect<K extends keyof ViperEffectState>(key: K, value: ViperEffectState[K]) {
		onUpdateEffect?.(key, value);
	}

	// Helper to create slider value handler
	function handleSliderChange<K extends keyof ViperEffectState>(key: K) {
		return (value: number) => {
			updateEffect(key, value as ViperEffectState[K]);
		};
	}

	// Helper to handle select value change
	function handleSelectChange<K extends keyof ViperEffectState>(key: K) {
		return (value: string) => {
			const numValue = parseInt(value, 10);
			if (!isNaN(numValue)) {
				updateEffect(key, numValue as ViperEffectState[K]);
			}
		};
	}

	// Mode options for various effects
	const viperBassModes = [
		{ value: 0, label: 'Natural Bass' },
		{ value: 1, label: 'Pure Bass+' },
		{ value: 2, label: 'Subwoofer' }
	];

	const viperClarityModes = [
		{ value: 0, label: 'Natural' },
		{ value: 1, label: 'OZone+' },
		{ value: 2, label: 'XHiFi' }
	];

	const vheLevels = [
		{ value: 0, label: 'Level 0 (Subtle)' },
		{ value: 1, label: 'Level 1' },
		{ value: 2, label: 'Level 2' },
		{ value: 3, label: 'Level 3' },
		{ value: 4, label: 'Level 4 (Strong)' }
	];

	const cureLevels = [
		{ value: 0, label: 'Mid' },
		{ value: 1, label: 'Strong' },
		{ value: 2, label: 'Super Strong' }
	];

	const analogXModes = [
		{ value: 0, label: 'Mode 0' },
		{ value: 1, label: 'Mode 1' },
		{ value: 2, label: 'Mode 2' }
	];
</script>

<!-- Slider with label component -->
{#snippet LabeledSlider(props: {
	label: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	unit?: string;
	onValueChange: (value: number) => void;
})}
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<Label class="text-sm text-muted-foreground">{props.label}</Label>
			<span class="text-sm font-mono text-foreground">
				{props.value}{props.unit ?? ''}
			</span>
		</div>
		<Slider
			type="single"
			value={props.value}
			min={props.min}
			max={props.max}
			step={props.step ?? 1}
			onValueChange={props.onValueChange}
		/>
	</div>
{/snippet}

<!-- Select with label component -->
{#snippet LabeledSelect(props: {
	label: string;
	value: number;
	options: Array<{ value: number; label: string }>;
	onSelectedChange: (value: string) => void;
})}
	<div class="space-y-2">
		<Label class="text-sm text-muted-foreground">{props.label}</Label>
		<Select.Root
			type="single"
			value={String(props.value)}
			onValueChange={props.onSelectedChange}
		>
			<Select.Trigger class="w-full">
				{props.options.find((o) => o.value === props.value)?.label ?? 'Select...'}
			</Select.Trigger>
			<Select.Content>
				{#each props.options as option (option.value)}
					<Select.Item value={String(option.value)} label={option.label} />
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
{/snippet}

<div class="space-y-6">
	<!-- 10-Band Equalizer - Full width -->
	<EffectCard
		title="10-Band Equalizer"
		enabled={effectState.firEqualizerEnabled}
		onToggle={(enabled) => updateEffect('firEqualizerEnabled', enabled)}
		icon={EqualizerIcon}
	>
		<Equalizer
			bands={effectState.firEqualizerBands}
			onChange={onUpdateEqualizerBand}
			disabled={!effectState.firEqualizerEnabled}
		/>
	</EffectCard>

	<!-- Effects Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		<!-- ViPER Bass -->
		<EffectCard
			title="ViPER Bass"
			enabled={effectState.viperBassEnabled}
			onToggle={(enabled) => updateEffect('viperBassEnabled', enabled)}
			icon={BassIcon}
		>
			{@render LabeledSelect({
				label: 'Mode',
				value: effectState.viperBassMode,
				options: viperBassModes,
				onSelectedChange: handleSelectChange('viperBassMode')
			})}
			{@render LabeledSlider({
				label: 'Frequency',
				value: effectState.viperBassFrequency,
				min: 20,
				max: 200,
				unit: 'Hz',
				onValueChange: handleSliderChange('viperBassFrequency')
			})}
			{@render LabeledSlider({
				label: 'Gain',
				value: effectState.viperBassGain,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('viperBassGain')
			})}
		</EffectCard>

		<!-- ViPER Clarity -->
		<EffectCard
			title="ViPER Clarity"
			enabled={effectState.viperClarityEnabled}
			onToggle={(enabled) => updateEffect('viperClarityEnabled', enabled)}
			icon={ClarityIcon}
		>
			{@render LabeledSelect({
				label: 'Mode',
				value: effectState.viperClarityMode,
				options: viperClarityModes,
				onSelectedChange: handleSelectChange('viperClarityMode')
			})}
			{@render LabeledSlider({
				label: 'Gain',
				value: effectState.viperClarityGain,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('viperClarityGain')
			})}
		</EffectCard>

		<!-- Dynamic Bass -->
		<EffectCard
			title="Dynamic Bass"
			enabled={effectState.dynamicSystemEnabled}
			onToggle={(enabled) => updateEffect('dynamicSystemEnabled', enabled)}
			icon={DynamicBassIcon}
		>
			{@render LabeledSlider({
				label: 'Bass Gain',
				value: effectState.dynamicSystemBassGain,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('dynamicSystemBassGain')
			})}
			{@render LabeledSlider({
				label: 'X Side Gain',
				value: effectState.dynamicSystemSideGainX,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('dynamicSystemSideGainX')
			})}
			{@render LabeledSlider({
				label: 'Y Side Gain',
				value: effectState.dynamicSystemSideGainY,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('dynamicSystemSideGainY')
			})}
			{@render LabeledSlider({
				label: 'X Low Freq',
				value: effectState.dynamicSystemXLowFreq,
				min: 10,
				max: 200,
				unit: 'Hz',
				onValueChange: handleSliderChange('dynamicSystemXLowFreq')
			})}
			{@render LabeledSlider({
				label: 'X High Freq',
				value: effectState.dynamicSystemXHighFreq,
				min: 50,
				max: 500,
				unit: 'Hz',
				onValueChange: handleSliderChange('dynamicSystemXHighFreq')
			})}
			{@render LabeledSlider({
				label: 'Y Low Freq',
				value: effectState.dynamicSystemYLowFreq,
				min: 50,
				max: 500,
				unit: 'Hz',
				onValueChange: handleSliderChange('dynamicSystemYLowFreq')
			})}
			{@render LabeledSlider({
				label: 'Y High Freq',
				value: effectState.dynamicSystemYHighFreq,
				min: 100,
				max: 1000,
				unit: 'Hz',
				onValueChange: handleSliderChange('dynamicSystemYHighFreq')
			})}
		</EffectCard>

		<!-- Reverb -->
		<EffectCard
			title="Reverb"
			enabled={effectState.reverbEnabled}
			onToggle={(enabled) => updateEffect('reverbEnabled', enabled)}
			icon={ReverbIcon}
		>
			{@render LabeledSlider({
				label: 'Room Size',
				value: effectState.reverbRoomSize,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('reverbRoomSize')
			})}
			{@render LabeledSlider({
				label: 'Room Width',
				value: effectState.reverbRoomWidth,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('reverbRoomWidth')
			})}
			{@render LabeledSlider({
				label: 'Dampening',
				value: effectState.reverbDampening,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('reverbDampening')
			})}
			{@render LabeledSlider({
				label: 'Wet',
				value: effectState.reverbWetSignal,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('reverbWetSignal')
			})}
			{@render LabeledSlider({
				label: 'Dry',
				value: effectState.reverbDrySignal,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('reverbDrySignal')
			})}
		</EffectCard>

		<!-- Field Surround -->
		<EffectCard
			title="Field Surround"
			enabled={effectState.fieldSurroundEnabled}
			onToggle={(enabled) => updateEffect('fieldSurroundEnabled', enabled)}
			icon={SurroundIcon}
		>
			{@render LabeledSlider({
				label: 'Widening',
				value: effectState.fieldSurroundWidening,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('fieldSurroundWidening')
			})}
			{@render LabeledSlider({
				label: 'Mid Image',
				value: effectState.fieldSurroundMidImage,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('fieldSurroundMidImage')
			})}
			{@render LabeledSlider({
				label: 'Depth',
				value: effectState.fieldSurroundDepth,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('fieldSurroundDepth')
			})}
		</EffectCard>

		<!-- VHE (Headphone Engine) -->
		<EffectCard
			title="Headphone Engine"
			enabled={effectState.vheEnabled}
			onToggle={(enabled) => updateEffect('vheEnabled', enabled)}
			icon={HeadphoneIcon}
		>
			{@render LabeledSelect({
				label: 'Level',
				value: effectState.vheLevel,
				options: vheLevels,
				onSelectedChange: handleSelectChange('vheLevel')
			})}
		</EffectCard>

		<!-- Differential Surround -->
		<EffectCard
			title="Diff Surround"
			enabled={effectState.diffSurroundEnabled}
			onToggle={(enabled) => updateEffect('diffSurroundEnabled', enabled)}
			icon={SurroundIcon}
		>
			{@render LabeledSlider({
				label: 'Delay',
				value: effectState.diffSurroundDelay,
				min: 0,
				max: 100,
				unit: 'ms',
				onValueChange: handleSliderChange('diffSurroundDelay')
			})}
		</EffectCard>

		<!-- Cure (Crossfeed) -->
		<EffectCard
			title="Cure (Crossfeed)"
			enabled={effectState.cureEnabled}
			onToggle={(enabled) => updateEffect('cureEnabled', enabled)}
			icon={CrossfeedIcon}
		>
			{@render LabeledSelect({
				label: 'Strength',
				value: effectState.cureLevel,
				options: cureLevels,
				onSelectedChange: handleSelectChange('cureLevel')
			})}
		</EffectCard>

		<!-- Tube Simulator -->
		<EffectCard
			title="Tube Simulator"
			enabled={effectState.tubeSimulatorEnabled}
			onToggle={(enabled) => updateEffect('tubeSimulatorEnabled', enabled)}
			icon={TubeIcon}
		>
			<p class="text-sm text-muted-foreground">
				Adds warm tube-like harmonics to the audio.
			</p>
		</EffectCard>

		<!-- AnalogX -->
		<EffectCard
			title="AnalogX"
			enabled={effectState.analogXEnabled}
			onToggle={(enabled) => updateEffect('analogXEnabled', enabled)}
			icon={AnalogIcon}
		>
			{@render LabeledSelect({
				label: 'Mode',
				value: effectState.analogXMode,
				options: analogXModes,
				onSelectedChange: handleSelectChange('analogXMode')
			})}
		</EffectCard>

		<!-- Spectrum Extension -->
		<EffectCard
			title="Spectrum Extend"
			enabled={effectState.spectrumExtendEnabled}
			onToggle={(enabled) => updateEffect('spectrumExtendEnabled', enabled)}
			icon={SpectrumIcon}
		>
			{@render LabeledSlider({
				label: 'Bark',
				value: effectState.spectrumExtendBark,
				min: 0,
				max: 100,
				onValueChange: handleSliderChange('spectrumExtendBark')
			})}
			{@render LabeledSlider({
				label: 'Reconstruct',
				value: effectState.spectrumExtendBarkReconstruct,
				min: 0,
				max: 100,
				onValueChange: handleSliderChange('spectrumExtendBarkReconstruct')
			})}
		</EffectCard>

		<!-- FET Compressor -->
		<EffectCard
			title="FET Compressor"
			enabled={effectState.fetCompressorEnabled}
			onToggle={(enabled) => updateEffect('fetCompressorEnabled', enabled)}
			icon={CompressorIcon}
		>
			{@render LabeledSlider({
				label: 'Threshold',
				value: effectState.fetCompressorThreshold,
				min: -60,
				max: 0,
				unit: 'dB',
				onValueChange: handleSliderChange('fetCompressorThreshold')
			})}
			{@render LabeledSlider({
				label: 'Ratio',
				value: effectState.fetCompressorRatio,
				min: 1,
				max: 20,
				unit: ':1',
				onValueChange: handleSliderChange('fetCompressorRatio')
			})}
			{@render LabeledSlider({
				label: 'Attack',
				value: effectState.fetCompressorAttack,
				min: 0,
				max: 100,
				unit: 'ms',
				onValueChange: handleSliderChange('fetCompressorAttack')
			})}
			{@render LabeledSlider({
				label: 'Release',
				value: effectState.fetCompressorRelease,
				min: 0,
				max: 500,
				unit: 'ms',
				onValueChange: handleSliderChange('fetCompressorRelease')
			})}
			{@render LabeledSlider({
				label: 'Gain',
				value: effectState.fetCompressorGain,
				min: 0,
				max: 30,
				unit: 'dB',
				onValueChange: handleSliderChange('fetCompressorGain')
			})}
		</EffectCard>

		<!-- Speaker Optimization -->
		<EffectCard
			title="Speaker Optimization"
			enabled={effectState.speakerOptimizationEnabled}
			onToggle={(enabled) => updateEffect('speakerOptimizationEnabled', enabled)}
			icon={SpeakerIcon}
		>
			<p class="text-sm text-muted-foreground">
				Optimizes audio output for built-in speakers by enhancing clarity and presence.
			</p>
		</EffectCard>

		<!-- Output Controls -->
		<EffectCard
			title="Output"
			enabled={true}
			icon={VolumeIcon}
		>
			{@render LabeledSlider({
				label: 'Volume',
				value: effectState.outputVolume,
				min: 0,
				max: 200,
				unit: '%',
				onValueChange: handleSliderChange('outputVolume')
			})}
			{@render LabeledSlider({
				label: 'Pan',
				value: effectState.outputPan,
				min: -100,
				max: 100,
				onValueChange: handleSliderChange('outputPan')
			})}
			{@render LabeledSlider({
				label: 'Limiter',
				value: effectState.limiterThreshold,
				min: 0,
				max: 100,
				unit: '%',
				onValueChange: handleSliderChange('limiterThreshold')
			})}
		</EffectCard>
	</div>
</div>
