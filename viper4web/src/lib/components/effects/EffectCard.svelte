<script lang="ts">
	/**
	 * EffectCard - Wrapper component for audio effect controls
	 *
	 * Provides a consistent card layout with title, icon, enable toggle,
	 * and content slot for effect-specific controls.
	 */

	import { cn } from '$lib/utils';
	import * as Card from '$lib/components/ui/card';
	import { Switch } from '$lib/components/ui/switch';
	import type { Snippet } from 'svelte';
	import type { IconData } from './effect-icons';

	interface Props {
		/** Effect card title */
		title: string;
		/** Whether the effect is enabled */
		enabled?: boolean;
		/** Icon data to display next to the title */
		icon?: IconData;
		/** Callback when the toggle state changes */
		onToggle?: (enabled: boolean) => void;
		/** Content slot for effect controls */
		children?: Snippet;
		/** Additional CSS classes for the card */
		class?: string;
	}

	let {
		title,
		enabled = $bindable(false),
		icon,
		onToggle,
		children,
		class: className
	}: Props = $props();

	function handleToggleChange(checked: boolean) {
		enabled = checked;
		onToggle?.(checked);
	}
</script>

<Card.Root
	class={cn(
		'transition-all duration-200',
		enabled ? 'border-viper-500/50 shadow-md shadow-viper-500/10' : 'border-border/50',
		className
	)}
>
	<Card.Header class="flex flex-row items-center justify-between pb-4">
		<div class="flex items-center gap-2">
			{#if icon}
				<span class="text-viper-400">
					<svg class="w-5 h-5" fill="currentColor" viewBox={icon.viewBox}>
						{#if icon.circles}
							{#each icon.circles as circle, i (i)}
								<circle cx={circle.cx} cy={circle.cy} r={circle.r} />
							{/each}
						{/if}
						{#each icon.paths as path, i (i)}
							<path d={path} />
						{/each}
					</svg>
				</span>
			{/if}
			<Card.Title class="text-base font-medium">{title}</Card.Title>
		</div>
		<Switch checked={enabled} onCheckedChange={handleToggleChange} />
	</Card.Header>
	<Card.Content class={cn('space-y-3', !enabled && 'opacity-50 pointer-events-none')}>
		{@render children?.()}
	</Card.Content>
</Card.Root>
