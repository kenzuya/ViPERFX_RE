# ViPER4Web UI

A React-based web interface for ViPER4Web audio effects processor.

## Prerequisites

- Node.js 18+ and npm
- Emscripten SDK (for building the WASM module)

## Quick Start

1. **Build the WASM module** (from the project root):
   ```bash
   ./build-web.sh
   ```

2. **Install dependencies**:
   ```bash
   cd web-ui
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

## Features

- **Music Player**: Load and play audio files (MP3, WAV, FLAC, OGG)
- **Real-time Effects**: All ViPER effects processed through WebAssembly
- **Effect Controls**:
  - ViPER Bass - Bass enhancement with multiple modes
  - ViPER Clarity - Audio clarity enhancement
  - Reverb - Room simulation
  - Field Surround - Stereo widening
  - Headphone Engine (VHE) - Headphone surround
  - Differential Surround - 3D audio effect
  - Cure (Crossfeed) - Headphone crossfeed
  - Tube Simulator - Warm tube harmonics
  - AnalogX - Analog sound simulation
  - Spectrum Extension - High frequency extension
  - FET Compressor - Dynamic range compression
  - Output Controls - Volume, Pan, Limiter

## Project Structure

```
web-ui/
├── public/
│   ├── viper.svg          # App icon
│   └── wasm/              # Built WASM files (from build-web.sh)
│       ├── viper4web.js
│       └── viper4web.wasm
├── src/
│   ├── components/        # React components
│   │   ├── Controls.tsx   # Slider, Toggle, Select components
│   │   ├── EffectsPanel.tsx
│   │   └── MusicPlayer.tsx
│   ├── hooks/
│   │   └── useViperAudio.ts  # ViPER audio processing hook
│   ├── types/
│   │   └── viper.ts       # TypeScript types
│   ├── App.tsx            # Main app component
│   ├── index.css          # Tailwind CSS styles
│   └── main.tsx           # Entry point
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

## License

Same as ViPER4Android - see project root for license information.
