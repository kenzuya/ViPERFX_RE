<script lang="ts">
	/**
	 * Header - Main application header component
	 *
	 * Displays the app logo, title, version, architecture info,
	 * master toggle switch, and reset button.
	 */

	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { effectState } from '$lib/stores/effect-state';

	interface Props {
		/** Version string to display */
		version?: string;
		/** Architecture string (e.g., "wasm32") */
		architecture?: string;
		/** Additional CSS classes for the header */
		class?: string;
	}

	let { version, architecture, class: className }: Props = $props();

	function handleMasterToggle(checked: boolean) {
		effectState.updateEffect('enabled', checked);
	}

	function handleResetAll() {
		effectState.reset();
	}
</script>

<header
	class={cn(
		'sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60',
		className
	)}
>
	<div class="mx-auto max-w-7xl px-4 py-4">
		<div class="flex items-center justify-between">
			<!-- Logo and Title -->
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600"
				>
					<svg class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
						/>
					</svg>
				</div>
				<div>
					<h1 class="text-xl font-bold text-foreground">ViPER4Web</h1>
					<p class="text-xs text-muted-foreground">
						{#if version}v{version}{/if}
						{#if architecture}({architecture}){/if}
					</p>
				</div>
			</div>

			<!-- Controls -->
			<div class="flex items-center gap-4">
				<!-- Master Toggle -->
				<div class="flex items-center gap-2">
					<span class="text-sm text-muted-foreground">Master</span>
					<Switch
						checked={$effectState.enabled}
						onCheckedChange={handleMasterToggle}
					/>
				</div>

				<!-- Reset Button -->
				<Button variant="secondary" size="sm" onclick={handleResetAll}>
					Reset All
				</Button>
			</div>
		</div>
	</div>
</header>
