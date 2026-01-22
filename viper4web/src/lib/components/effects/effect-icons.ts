/**
 * SVG icon definitions for audio effects
 * Used in EffectCard components to visually identify each effect type
 */

export interface IconProps {
	class?: string;
}

/**
 * Icon data structure containing SVG path and optional additional elements
 */
export interface IconData {
	viewBox: string;
	paths: string[];
	circles?: Array<{ cx: number; cy: number; r: number }>;
}

/**
 * Bass effect icon - Musical note symbol
 */
export const BassIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: ['M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z']
};

/**
 * Reverb effect icon - Speaker with sound waves
 */
export const ReverbIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: [
		'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'
	]
};

/**
 * Surround effect icon - Concentric circles
 */
export const SurroundIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: [
		'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'
	],
	circles: [{ cx: 12, cy: 12, r: 3 }]
};

/**
 * Compressor effect icon - Horizontal compression bars
 */
export const CompressorIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: ['M7 18h10v-2H7v2zM7 13h10v-2H7v2zM7 6v2h10V6H7z']
};

/**
 * Tube simulator effect icon - Video/warm tube symbol
 */
export const TubeIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: [
		'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z'
	]
};

/**
 * Volume control icon - Simple speaker
 */
export const VolumeIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: ['M3 9v6h4l5 5V4L7 9H3z']
};

/**
 * Speaker optimization icon - Speaker driver
 */
export const SpeakerIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: [
		'M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z'
	]
};

/**
 * Equalizer icon - Vertical bars
 */
export const EqualizerIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: ['M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z']
};

/**
 * Dynamic bass icon - Note with bars
 */
export const DynamicBassIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: ['M12 3v9.28a4.5 4.5 0 1 0 2 3.72V7h4V3h-6zM6 12h2v8H6zm4-4h2v12h-2zm8 0h2v12h-2z']
};

/**
 * Clarity effect icon - Sparkle/star symbol
 */
export const ClarityIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: [
		'M14 2l-1.5 5.5L7 9l5.5 1.5L14 16l1.5-5.5L21 9l-5.5-1.5z',
		'M6 14l-1 3.5L1.5 19 5 20l1 3.5L7 20l3.5-1L7 18z'
	]
};

/**
 * Headphone icon - For VHE/headphone engine
 */
export const HeadphoneIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: [
		'M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z'
	]
};

/**
 * Crossfeed/Cure icon - Crossed arrows
 */
export const CrossfeedIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: [
		'M16 4l-1.41 1.41L18.17 9H4v2h14.17l-3.58 3.59L16 16l6-6z',
		'M8 20l1.41-1.41L5.83 15H20v-2H5.83l3.58-3.59L8 8l-6 6z'
	]
};

/**
 * Spectrum/wave icon - For spectrum extension
 */
export const SpectrumIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: [
		'M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z'
	]
};

/**
 * AnalogX icon - Waveform symbol
 */
export const AnalogIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: [
		'M2 12h2l2-3 3 6 4-12 3 9 2-3h4'
	]
};

/**
 * Limiter icon - Signal with ceiling
 */
export const LimiterIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: [
		'M3 17h18v2H3v-2zm0-5h3v4H3v-4zm5 0h3v4H8v-4zm5 0h3v4h-3v-4zm5 0h3v4h-3v-4zM3 5h18v2H3V5z'
	]
};

/**
 * Pan icon - Left-right arrows
 */
export const PanIcon: IconData = {
	viewBox: '0 0 24 24',
	paths: [
		'M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z'
	]
};

/**
 * Helper function to render an icon as an SVG string
 * Can be used with {@html} directive in Svelte
 */
export function renderIcon(icon: IconData, className: string = 'w-5 h-5'): string {
	const circles = icon.circles
		?.map((c) => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>`)
		.join('') ?? '';
	const paths = icon.paths.map((d) => `<path d="${d}"/>`).join('');

	return `<svg class="${className}" fill="currentColor" viewBox="${icon.viewBox}">${circles}${paths}</svg>`;
}

/**
 * Map of effect types to their corresponding icons
 */
export const effectIconMap: Record<string, IconData> = {
	bass: BassIcon,
	viperBass: BassIcon,
	viperClarity: ClarityIcon,
	clarity: ClarityIcon,
	dynamicBass: DynamicBassIcon,
	dynamicSystem: DynamicBassIcon,
	reverb: ReverbIcon,
	reverberation: ReverbIcon,
	surround: SurroundIcon,
	fieldSurround: SurroundIcon,
	vhe: HeadphoneIcon,
	headphone: HeadphoneIcon,
	diffSurround: SurroundIcon,
	cure: CrossfeedIcon,
	crossfeed: CrossfeedIcon,
	tube: TubeIcon,
	tubeSimulator: TubeIcon,
	analogX: AnalogIcon,
	analog: AnalogIcon,
	spectrumExtend: SpectrumIcon,
	spectrum: SpectrumIcon,
	fetCompressor: CompressorIcon,
	compressor: CompressorIcon,
	speaker: SpeakerIcon,
	speakerOptimization: SpeakerIcon,
	volume: VolumeIcon,
	output: VolumeIcon,
	equalizer: EqualizerIcon,
	firEqualizer: EqualizerIcon,
	limiter: LimiterIcon,
	pan: PanIcon
};

/**
 * Get icon for a given effect type
 */
export function getEffectIcon(effectType: string): IconData {
	return effectIconMap[effectType] ?? EqualizerIcon;
}
