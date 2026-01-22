cmake_minimum_required(VERSION 3.16.3)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# NDK Settings
#add_compile_definitions(ANDROID_ABI=arm64-v8a)
#add_compile_definitions(ANDROID_ABI=armeabi-v7a)
#add_compile_definitions(ANDROID_ARM_NEON=true)
#add_compile_definitions(ANDROID_PLATFORM=android-24)

project("ViPER4Android")
add_compile_definitions(VERSION_CODE=800)
add_compile_definitions(VERSION_NAME="8.0")

# FFTS
#add_subdirectory(src/viper/ffts)

# ViPERFX
include_directories(src/include)

# Core source files (shared between Android and Web)
set(CORE_FILES
        # Effects
        src/viper/effects/AnalogX.cpp
        src/viper/effects/ColorfulMusic.cpp
        src/viper/effects/Convolver.cpp
        src/viper/effects/Cure.cpp
        src/viper/effects/DiffSurround.cpp
        src/viper/effects/DynamicSystem.cpp
        src/viper/effects/FETCompressor.cpp
        src/viper/effects/IIRFilter.cpp
        src/viper/effects/PlaybackGain.cpp
        src/viper/effects/Reverberation.cpp
        src/viper/effects/SoftwareLimiter.cpp
        src/viper/effects/SpeakerCorrection.cpp
        src/viper/effects/SpectrumExtend.cpp
        src/viper/effects/TubeSimulator.cpp
        src/viper/effects/VHE.cpp
        src/viper/effects/ViPERBass.cpp
        src/viper/effects/ViPERClarity.cpp
        src/viper/effects/ViPERDDC.cpp

        # Utils
        src/viper/utils/AdaptiveBuffer.cpp
        src/viper/utils/Biquad.cpp
        src/viper/utils/CAllpassFilter.cpp
        src/viper/utils/CCombFilter.cpp
        src/viper/utils/CRevModel.cpp
        src/viper/utils/Crossfeed.cpp
        src/viper/utils/DepthSurround.cpp
        src/viper/utils/DynamicBass.cpp
        src/viper/utils/FIR.cpp
        src/viper/utils/Harmonic.cpp
        src/viper/utils/HiFi.cpp
        src/viper/utils/HighShelf.cpp
        src/viper/utils/IIR_1st.cpp
        src/viper/utils/IIR_NOrder_BW_BP.cpp
        src/viper/utils/IIR_NOrder_BW_LH.cpp
        src/viper/utils/MinPhaseIIRCoeffs.cpp
        src/viper/utils/MultiBiquad.cpp
        src/viper/utils/NoiseSharpening.cpp
        src/viper/utils/PassFilter.cpp
        src/viper/utils/PConvSingle.cpp
        src/viper/utils/PolesFilter.cpp
        src/viper/utils/Polyphase.cpp
        src/viper/utils/Stereo3DSurround.cpp
        src/viper/utils/Subwoofer.cpp
        src/viper/utils/TimeConstDelay.cpp
        src/viper/utils/WaveBuffer.cpp

        # Main ViPER
        src/viper/ViPER.cpp)

# ==================== Emscripten (Web) Build ====================
if(EMSCRIPTEN)
    message(STATUS "Building for Web (Emscripten)")

    set(WEB_FILES
            ${CORE_FILES}
            src/Viper4Web.cpp)

    add_executable(viper4web ${WEB_FILES})

    # Emscripten-specific compile options
    target_compile_options(viper4web PRIVATE
            -O3
            -DNDEBUG
            -fno-exceptions)

    # Emscripten-specific link options
    set_target_properties(viper4web PROPERTIES
            SUFFIX ".js"
            LINK_FLAGS "\
                -s WASM=1 \
                -s MODULARIZE=1 \
                -s EXPORT_NAME='ViperModule' \
                -s ALLOW_MEMORY_GROWTH=1 \
                -s INITIAL_MEMORY=33554432 \
                -s MAXIMUM_MEMORY=268435456 \
                -s ENVIRONMENT='web,worker' \
                -s EXPORTED_FUNCTIONS=['_malloc','_free'] \
                -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','setValue','getValue'] \
                -s NO_EXIT_RUNTIME=1 \
                -s SINGLE_FILE=0 \
                --bind \
                --emit-tsd viper4web.d.ts \
                -O3 \
                -flto \
            ")

# ==================== Android Build ====================
else()
    message(STATUS "Building for Android")

    set(ANDROID_FILES
            ${CORE_FILES}
            src/ViPER4Android.cpp
            src/ViperContext.cpp)

    add_library(
            # Sets the name of the library.
            v4a_re

            # Sets the library as a shared library.
            SHARED

            # Provides a relative path to your source file(s).
            ${ANDROID_FILES})

    target_link_libraries(v4a_re log)
    target_compile_options(v4a_re PRIVATE -flto -O3 -DNDEBUG)
endif()
