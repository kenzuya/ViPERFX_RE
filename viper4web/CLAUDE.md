# ViPER4Web Project Documentation

## Overview

This project is the web-based port of ViPER4Android, an audio effects processor. The `viper4web` directory contains a **SvelteKit-based web application** that provides a complete audio player with real-time DSP (Digital Signal Processing) effects powered by WebAssembly.

---

## ⚠️ Development Rules

### ALWAYS Use shadcn-svelte Components

**DO NOT create custom components from scratch.** Always use shadcn-svelte components as the foundation for UI development.

#### shadcn-svelte Documentation Reference

Full docs: https://shadcn-svelte.com/llms.txt

#### Installation Commands

```bash
# Add a new component (using package.json scripts)
bun run ui:add <component-name>

# Or directly with bunx
bunx shadcn-svelte@next add <component-name>

# Examples:
bun run ui:add button
bun run ui:add slider
bun run ui:add switch
bun run ui:add card
bun run ui:add select
bun run ui:add dialog
bun run ui:add tabs
```

#### Component Import Pattern

```svelte
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Slider } from "$lib/components/ui/slider";
  import { Switch } from "$lib/components/ui/switch";
  import * as Card from "$lib/components/ui/card";
  import * as Select from "$lib/components/ui/select";
</script>
```

#### Key Components for Audio Effects UI

| Component | Use Case |
|-----------|----------|
| `Switch` | Enable/disable effects |
| `Slider` | Gain, volume, frequency controls |
| `Card` | Effect panels/containers |
| `Select` | Effect mode selection |
| `Button` | Play/pause, actions |
| `Tabs` | Effect category navigation |
| `Dialog` | Settings modals |
| `Label` | Form labels |

---