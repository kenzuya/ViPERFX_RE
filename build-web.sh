#!/bin/bash

# ViPER4Web Build Script
# Prerequisites: Emscripten SDK installed and activated (source emsdk_env.sh)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build-web"
OUTPUT_DIR="$SCRIPT_DIR/web-ui/public/wasm"

echo "================================================"
echo "Building ViPER4Web (Emscripten/WebAssembly)"
echo "================================================"

# Check if emcc is available
if ! command -v emcc &> /dev/null; then
    echo "Error: Emscripten compiler (emcc) not found!"
    echo "Please install Emscripten SDK and run 'source emsdk_env.sh'"
    exit 1
fi

echo "Emscripten version: $(emcc --version | head -n1)"

# Create build directory
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Configure with Emscripten
echo ""
echo "Configuring CMake with Emscripten toolchain..."
emcmake cmake .. -DCMAKE_BUILD_TYPE=Release

# Build
echo ""
echo "Building..."
emmake make -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)

# Create output directory and copy files
echo ""
echo "Copying output files..."
mkdir -p "$OUTPUT_DIR"
cp viper4web.js "$OUTPUT_DIR/"
cp viper4web.wasm "$OUTPUT_DIR/"

echo ""
echo "================================================"
echo "Build complete!"
echo "Output files:"
echo "  - $OUTPUT_DIR/viper4web.js"
echo "  - $OUTPUT_DIR/viper4web.wasm"
echo "================================================"
