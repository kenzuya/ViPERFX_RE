<script lang="ts">
	/**
	 * Equalizer - 10-band parametric equalizer component
	 *
	 * Provides vertical sliders for each frequency band with gain display,
	 * frequency labels, and preset buttons for common EQ curves.
	 */

	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { VerticalSlider } from '$lib/components/ui/vertical-slider';

	// Equalizer frequency bands in Hz
	export const EQ_BANDS = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
	export const EQ_MIN_GAIN = -12;
	export const EQ_MAX_GAIN = 12;

	interface Props {
		/** Array of 10 gain values, one for each frequency band */
		bands: number[];
		/** Callback when a band value changes */
		onChange?: (bandIndex: number, value: number) => void;
		/** Whether the equalizer is disabled */
		disabled?: boolean;
		/** Additional CSS classes */
		class?: string;
	}

	let { bands = $bindable([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), onChange, disabled = false, class: className }: Props =
		$props();

	function formatFrequency(freq: number): string {
		if (freq >= 1000) {
			return `${freq / 1000}k`;
		}
		return `${freq}`;
	}

	function handleBandChange(index: number, value: number) {
		if (!disabled) {
			bands[index] = value;
			onChange?.(index, value);
		}
	}

	function applyPreset(preset: 'flat' | 'bass' | 'treble' | 'vshape') {
		if (disabled) return;

		const presets: Record<string, number[]> = {
			flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			bass: [6, 5, 3, 1, 0, 0, 0, 0, 0, 0],
			treble: [0, 0, 0, 0, 0, 0, 1, 3, 5, 6],
			vshape: [5, 3, 1, -1, -2, -2, -1, 1, 3, 5]
		};

		const values = presets[preset];
		values.forEach((value, index) => {
			handleBandChange(index, value);
		});
	}

	function getGainColor(gain: number): string {
		if (gain > 0) return 'text-green-400';
		if (gain < 0) return 'text-red-400';
		return 'text-muted-foreground';
	}
</script>

<div class={cn('w-full', disabled && 'opacity-50 pointer-events-none', className)}>
	<!-- Gain labels -->
	<div class="flex justify-between text-xs text-muted-foreground mb-2 px-1">
		<span>+{EQ_MAX_GAIN}dB</span>
		<span>0dB</span>
		<span>{EQ_MIN_GAIN}dB</span>
	</div>

	<!-- Equalizer bands -->
	<div
		class="flex items-stretch justify-between gap-1 bg-muted/30 rounded-lg p-3 relative overflow-hidden"
	>
		{#each bands as gain, index (EQ_BANDS[index])}
			<div class="flex flex-col items-center flex-1 min-w-0 z-10">
				<!-- Vertical Slider -->
				<VerticalSlider
					value={gain}
					min={EQ_MIN_GAIN}
					max={EQ_MAX_GAIN}
					step={0.5}
					height={180}
					{disabled}
					onValueChange={(value) => handleBandChange(index, value)}
				/>
				<!-- Frequency label -->
				<span class="text-[10px] text-muted-foreground mt-2 font-mono whitespace-nowrap">
					{formatFrequency(EQ_BANDS[index])}
				</span>
			</div>
		{/each}
	</div>

	<!-- Current values display -->
	<div class="flex justify-between mt-2 gap-1">
		{#each bands as gain, index (`val-${index}`)}
			<div class="flex-1 text-center">
				<span class={cn('text-[10px] font-mono', getGainColor(gain))}>
					{gain > 0 ? '+' : ''}{gain.toFixed(1)}
				</span>
			</div>
		{/each}
	</div>

	<!-- Preset buttons -->
	<div class="flex gap-2 mt-3 flex-wrap">
		<Button variant="secondary" size="sm" onclick={() => applyPreset('flat')} {disabled}>
			Flat
		</Button>
		<Button variant="secondary" size="sm" onclick={() => applyPreset('bass')} {disabled}>
			Bass Boost
		</Button>
		<Button variant="secondary" size="sm" onclick={() => applyPreset('treble')} {disabled}>
			Treble Boost
		</Button>
		<Button variant="secondary" size="sm" onclick={() => applyPreset('vshape')} {disabled}>
			V-Shape
		</Button>
	</div>
</div>
