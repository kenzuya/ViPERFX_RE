<script lang="ts">
	/**
	 * VerticalSlider - A vertical orientation slider component
	 *
	 * Designed specifically for equalizer bands and other vertical slider use cases.
	 * Uses CSS transforms for better cross-browser support than writing-mode.
	 */

	import { cn } from '$lib/utils';

	interface Props {
		/** Current value */
		value: number;
		/** Minimum value */
		min?: number;
		/** Maximum value */
		max?: number;
		/** Step increment */
		step?: number;
		/** Height of the slider track (becomes width visually) */
		height?: number;
		/** Whether the slider is disabled */
		disabled?: boolean;
		/** Callback when value changes */
		onValueChange?: (value: number) => void;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		value = $bindable(0),
		min = -12,
		max = 12,
		step = 0.5,
		height = 160,
		disabled = false,
		onValueChange,
		class: className
	}: Props = $props();

	// Calculate the percentage for styling
	let percentage = $derived(((value - min) / (max - min)) * 100);

	// Container ref for mouse calculations
	let sliderContainer: HTMLDivElement;
	let isDragging = $state(false);

	function calculateValueFromY(clientY: number): number {
		if (!sliderContainer) return value;

		const rect = sliderContainer.getBoundingClientRect();
		// Invert Y axis - bottom is min, top is max
		const relativeY = rect.bottom - clientY;
		const percent = Math.max(0, Math.min(1, relativeY / rect.height));
		const newValue = min + percent * (max - min);

		// Snap to step
		const steppedValue = Math.round(newValue / step) * step;
		return Math.max(min, Math.min(max, steppedValue));
	}

	function handleMouseDown(e: MouseEvent) {
		if (disabled) return;
		e.preventDefault();
		isDragging = true;
		updateValueFromEvent(e);
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging || disabled) return;
		updateValueFromEvent(e);
	}

	function handleMouseUp() {
		isDragging = false;
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	}

	function handleTouchStart(e: TouchEvent) {
		if (disabled || e.touches.length === 0) return;
		e.preventDefault();
		isDragging = true;
		updateValueFromTouchEvent(e);
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging || disabled || e.touches.length === 0) return;
		e.preventDefault();
		updateValueFromTouchEvent(e);
	}

	function handleTouchEnd() {
		isDragging = false;
	}

	function updateValueFromEvent(e: MouseEvent) {
		const newValue = calculateValueFromY(e.clientY);
		if (newValue !== value) {
			value = newValue;
			onValueChange?.(newValue);
		}
	}

	function updateValueFromTouchEvent(e: TouchEvent) {
		if (e.touches.length === 0) return;
		const touch = e.touches[0];
		const newValue = calculateValueFromY(touch.clientY);
		if (newValue !== value) {
			value = newValue;
			onValueChange?.(newValue);
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (disabled) return;

		let newValue = value;

		switch (e.key) {
			case 'ArrowUp':
			case 'ArrowRight':
				e.preventDefault();
				newValue = Math.min(max, value + step);
				break;
			case 'ArrowDown':
			case 'ArrowLeft':
				e.preventDefault();
				newValue = Math.max(min, value - step);
				break;
			case 'Home':
				e.preventDefault();
				newValue = max;
				break;
			case 'End':
				e.preventDefault();
				newValue = min;
				break;
			default:
				return;
		}

		if (newValue !== value) {
			value = newValue;
			onValueChange?.(newValue);
		}
	}
</script>

<div
	bind:this={sliderContainer}
	class={cn(
		'vertical-slider relative flex items-center justify-center cursor-pointer',
		disabled && 'opacity-50 cursor-not-allowed',
		isDragging && 'cursor-grabbing',
		className
	)}
	style="height: {height}px; width: 32px;"
	role="slider"
	tabindex={disabled ? -1 : 0}
	aria-valuemin={min}
	aria-valuemax={max}
	aria-valuenow={value}
	aria-disabled={disabled}
	onmousedown={handleMouseDown}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	onkeydown={handleKeyDown}
>
	<!-- Track background -->
	<div
		class="absolute w-1.5 rounded-full bg-muted"
		style="height: {height}px;"
	></div>

	<!-- Track fill (from center/zero point) -->
	{#if value >= 0}
		<!-- Positive value: fill from center upward -->
		<div
			class="absolute w-1.5 rounded-full bg-viper-500 transition-all"
			style="
				height: {((value / max) * 50)}%;
				bottom: 50%;
			"
		></div>
	{:else}
		<!-- Negative value: fill from center downward -->
		<div
			class="absolute w-1.5 rounded-full bg-viper-500 transition-all"
			style="
				height: {((Math.abs(value) / Math.abs(min)) * 50)}%;
				top: 50%;
			"
		></div>
	{/if}

	<!-- Center line (0dB indicator) -->
	<div
		class="absolute left-1/2 -translate-x-1/2 w-4 h-0.5 bg-border z-10"
	></div>

	<!-- Thumb -->
	<div
		class={cn(
			'absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-viper-500 border-2 border-viper-400 shadow-md shadow-viper-500/30 transition-transform z-20',
			isDragging && 'scale-110 bg-viper-400',
			!disabled && 'hover:scale-110 hover:bg-viper-400'
		)}
		style="bottom: calc({percentage}% - 8px);"
	></div>
</div>

<style>
	.vertical-slider:focus {
		outline: none;
	}

	.vertical-slider:focus-visible > div:last-child {
		box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.4);
	}
</style>
