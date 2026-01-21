/**
 * ViPER4Web - Web Audio Effect Processor
 *
 * This is the Emscripten/WebAssembly entrypoint for ViPER audio effects.
 * It provides a simple C API that can be called from JavaScript via WebAssembly.
 */

#ifdef __EMSCRIPTEN__

#include <emscripten.h>
#include <emscripten/bind.h>
#include <cstring>
#include <string>
#include <vector>
#include "viper/ViPER.h"
#include "viper/constants.h"
#include "ViPER4Android.h"

/**
 * ViperController - Unified controller for managing all ViPER effects
 *
 * This class wraps the ViPER audio processor and provides a clean interface
 * for JavaScript to control all audio effects.
 */
class ViperController {
private:
    ViPER viper;
    bool enabled;
    uint32_t sampleRate;
    std::vector<float> processBuffer;

public:
    ViperController() : enabled(true), sampleRate(VIPER_DEFAULT_SAMPLING_RATE) {
        VIPER_LOGI("ViperController initialized");
    }

    ~ViperController() {
        VIPER_LOGI("ViperController destroyed");
    }

    // ==================== Core Functions ====================

    /**
     * Process audio samples through ViPER effects
     * @param inputPtr Pointer to input audio samples (interleaved stereo float32)
     * @param frameCount Number of frames (samples per channel)
     * @param outputPtr Pointer to output audio samples
     */
    void process(uintptr_t inputPtr, uint32_t frameCount, uintptr_t outputPtr) {
        float* input = reinterpret_cast<float*>(inputPtr);
        float* output = reinterpret_cast<float*>(outputPtr);

        if (!enabled) {
            // Pass through when disabled
            memcpy(output, input, frameCount * 2 * sizeof(float));
            return;
        }

        // Resize buffer if needed
        uint32_t bufferSize = frameCount * 2;
        if (processBuffer.size() < bufferSize) {
            processBuffer.resize(bufferSize);
        }

        // Copy input to buffer
        memcpy(processBuffer.data(), input, bufferSize * sizeof(float));

        // Process through ViPER
        viper.process(processBuffer, frameCount);

        // Copy to output
        memcpy(output, processBuffer.data(), bufferSize * sizeof(float));
    }

    /**
     * Set the audio sample rate
     * @param rate Sample rate in Hz (e.g., 44100, 48000)
     */
    void setSampleRate(uint32_t rate) {
        sampleRate = rate;
        viper.samplingRate = rate;
        viper.resetAllEffects();
        VIPER_LOGI("Sample rate set to %d", rate);
    }

    uint32_t getSampleRate() const {
        return sampleRate;
    }

    /**
     * Enable or disable all ViPER processing
     */
    void setEnabled(bool enable) {
        enabled = enable;
        VIPER_LOGI("ViPER processing %s", enable ? "enabled" : "disabled");
    }

    bool isEnabled() const {
        return enabled;
    }

    /**
     * Reset all effects to their initial state
     */
    void resetAllEffects() {
        viper.resetAllEffects();
        VIPER_LOGI("All effects reset");
    }

    /**
     * Get version information
     */
    std::string getVersion() const {
        return std::string(VERSION_NAME);
    }

    std::string getArchitecture() const {
        return std::string(VIPER_ARCHITECTURE);
    }

    // ==================== Convolver (Impulse Response) ====================

    void setConvolverEnabled(bool enable) {
        viper.DispatchCommand(PARAM_CONVOLUTION_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setConvolverCrossChannel(float value) {
        viper.DispatchCommand(PARAM_CONVOLUTION_CROSS_CHANNEL, static_cast<int>(value * 100), 0, 0, 0, 0, nullptr);
    }

    // ==================== VHE (ViPER Headphone Engine) ====================

    void setVHEEnabled(bool enable) {
        viper.DispatchCommand(PARAM_HEADPHONE_SURROUND_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setVHELevel(int level) {
        // Level 0-4 (VHE_L0 to VHE_L4)
        viper.DispatchCommand(PARAM_HEADPHONE_SURROUND_STRENGTH, level, 0, 0, 0, 0, nullptr);
    }

    // ==================== DDC (Digital-to-Digital Conversion) ====================

    void setDDCEnabled(bool enable) {
        viper.DispatchCommand(PARAM_DDC_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    // ==================== Spectrum Extension ====================

    void setSpectrumExtendEnabled(bool enable) {
        viper.DispatchCommand(PARAM_SPECTRUM_EXTENSION_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setSpectrumExtendBark(int bark) {
        viper.DispatchCommand(PARAM_SPECTRUM_EXTENSION_BARK, bark, 0, 0, 0, 0, nullptr);
    }

    void setSpectrumExtendBarkReconstruct(int reconstruct) {
        viper.DispatchCommand(PARAM_SPECTRUM_EXTENSION_BARK_RECONSTRUCT, reconstruct, 0, 0, 0, 0, nullptr);
    }

    // ==================== FIR Equalizer ====================

    void setFIREqualizerEnabled(bool enable) {
        viper.DispatchCommand(PARAM_FIR_EQUALIZER_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setFIREqualizerBand(int band, int level) {
        viper.DispatchCommand(PARAM_FIR_EQUALIZER_BAND_LEVEL, band, level, 0, 0, 0, nullptr);
    }

    // ==================== Field Surround (Colorful Music) ====================

    void setFieldSurroundEnabled(bool enable) {
        viper.DispatchCommand(PARAM_FIELD_SURROUND_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setFieldSurroundWidening(int value) {
        viper.DispatchCommand(PARAM_FIELD_SURROUND_WIDENING, value, 0, 0, 0, 0, nullptr);
    }

    void setFieldSurroundMidImage(int value) {
        viper.DispatchCommand(PARAM_FIELD_SURROUND_MID_IMAGE, value, 0, 0, 0, 0, nullptr);
    }

    void setFieldSurroundDepth(int value) {
        viper.DispatchCommand(PARAM_FIELD_SURROUND_DEPTH, value, 0, 0, 0, 0, nullptr);
    }

    // ==================== Differential Surround ====================

    void setDiffSurroundEnabled(bool enable) {
        viper.DispatchCommand(PARAM_DIFFERENTIAL_SURROUND_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setDiffSurroundDelay(int delay) {
        viper.DispatchCommand(PARAM_DIFFERENTIAL_SURROUND_DELAY, delay, 0, 0, 0, 0, nullptr);
    }

    // ==================== Reverberation ====================

    void setReverbEnabled(bool enable) {
        viper.DispatchCommand(PARAM_REVERBERATION_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setReverbRoomSize(int size) {
        viper.DispatchCommand(PARAM_REVERBERATION_ROOM_SIZE, size, 0, 0, 0, 0, nullptr);
    }

    void setReverbRoomWidth(int width) {
        viper.DispatchCommand(PARAM_REVERBERATION_ROOM_WIDTH, width, 0, 0, 0, 0, nullptr);
    }

    void setReverbDampening(int dampening) {
        viper.DispatchCommand(PARAM_REVERBERATION_ROOM_DAMPENING, dampening, 0, 0, 0, 0, nullptr);
    }

    void setReverbWetSignal(int wet) {
        viper.DispatchCommand(PARAM_REVERBERATION_ROOM_WET_SIGNAL, wet, 0, 0, 0, 0, nullptr);
    }

    void setReverbDrySignal(int dry) {
        viper.DispatchCommand(PARAM_REVERBERATION_ROOM_DRY_SIGNAL, dry, 0, 0, 0, 0, nullptr);
    }

    // ==================== AGC (Automatic Gain Control) ====================

    void setAGCEnabled(bool enable) {
        viper.DispatchCommand(PARAM_AUTOMATIC_GAIN_CONTROL_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setAGCRatio(int ratio) {
        viper.DispatchCommand(PARAM_AUTOMATIC_GAIN_CONTROL_RATIO, ratio, 0, 0, 0, 0, nullptr);
    }

    void setAGCVolume(int volume) {
        viper.DispatchCommand(PARAM_AUTOMATIC_GAIN_CONTROL_VOLUME, volume, 0, 0, 0, 0, nullptr);
    }

    void setAGCMaxScaler(int maxScaler) {
        viper.DispatchCommand(PARAM_AUTOMATIC_GAIN_CONTROL_MAX_SCALER, maxScaler, 0, 0, 0, 0, nullptr);
    }

    // ==================== Dynamic System ====================

    void setDynamicSystemEnabled(bool enable) {
        viper.DispatchCommand(PARAM_DYNAMIC_SYSTEM_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setDynamicSystemSideGain(int sideGain1, int sideGain2) {
        viper.DispatchCommand(PARAM_DYNAMIC_SYSTEM_SIDE_GAIN, sideGain1, sideGain2, 0, 0, 0, nullptr);
    }

    void setDynamicSystemStrength(int strength) {
        viper.DispatchCommand(PARAM_DYNAMIC_SYSTEM_STRENGTH, strength, 0, 0, 0, 0, nullptr);
    }

    // ==================== ViPER Bass ====================

    void setViperBassEnabled(bool enable) {
        viper.DispatchCommand(PARAM_FIDELITY_BASS_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setViperBassMode(int mode) {
        // 0 = Natural Bass, 1 = Pure Bass+, 2 = Subwoofer
        viper.DispatchCommand(PARAM_FIDELITY_BASS_MODE, mode, 0, 0, 0, 0, nullptr);
    }

    void setViperBassFrequency(int freq) {
        viper.DispatchCommand(PARAM_FIDELITY_BASS_FREQUENCY, freq, 0, 0, 0, 0, nullptr);
    }

    void setViperBassGain(int gain) {
        viper.DispatchCommand(PARAM_FIDELITY_BASS_GAIN, gain, 0, 0, 0, 0, nullptr);
    }

    // ==================== ViPER Clarity ====================

    void setViperClarityEnabled(bool enable) {
        viper.DispatchCommand(PARAM_FIDELITY_CLARITY_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setViperClarityMode(int mode) {
        // 0 = Natural, 1 = OZone+, 2 = XHiFi
        viper.DispatchCommand(PARAM_FIDELITY_CLARITY_MODE, mode, 0, 0, 0, 0, nullptr);
    }

    void setViperClarityGain(int gain) {
        viper.DispatchCommand(PARAM_FIDELITY_CLARITY_GAIN, gain, 0, 0, 0, 0, nullptr);
    }

    // ==================== Cure (Crossfeed) ====================

    void setCureEnabled(bool enable) {
        viper.DispatchCommand(PARAM_CURE_CROSS_FEED_ENABLED, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setCureLevel(int level) {
        // 0 = Mid, 1 = Strong, 2 = Super Strong
        viper.DispatchCommand(PARAM_CURE_CROSS_FEED_STRENGTH, level, 0, 0, 0, 0, nullptr);
    }

    // ==================== Tube Simulator ====================

    void setTubeSimulatorEnabled(bool enable) {
        viper.DispatchCommand(PARAM_TUBE_SIMULATOR_ENABLED, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    // ==================== AnalogX ====================

    void setAnalogXEnabled(bool enable) {
        viper.DispatchCommand(PARAM_ANALOGX_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setAnalogXMode(int mode) {
        viper.DispatchCommand(PARAM_ANALOGX_MODE, mode, 0, 0, 0, 0, nullptr);
    }

    // ==================== Output Controls ====================

    void setOutputVolume(int volume) {
        // Volume in percentage (0-100)
        viper.DispatchCommand(PARAM_GATE_OUTPUT_VOLUME, volume, 0, 0, 0, 0, nullptr);
    }

    void setOutputPan(int pan) {
        // Pan value (-100 to 100, 0 = center)
        viper.DispatchCommand(PARAM_GATE_CHANNEL_PAN, pan, 0, 0, 0, 0, nullptr);
    }

    void setLimiterThreshold(int threshold) {
        viper.DispatchCommand(PARAM_GATE_LIMIT, threshold, 0, 0, 0, 0, nullptr);
    }

    // ==================== Speaker Optimization ====================

    void setSpeakerOptimizationEnabled(bool enable) {
        viper.DispatchCommand(PARAM_SPEAKER_OPTIMIZATION, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    // ==================== FET Compressor ====================

    void setFETCompressorEnabled(bool enable) {
        viper.DispatchCommand(PARAM_FET_COMPRESSOR_ENABLE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setFETCompressorThreshold(int threshold) {
        viper.DispatchCommand(PARAM_FET_COMPRESSOR_THRESHOLD, threshold, 0, 0, 0, 0, nullptr);
    }

    void setFETCompressorRatio(int ratio) {
        viper.DispatchCommand(PARAM_FET_COMPRESSOR_RATIO, ratio, 0, 0, 0, 0, nullptr);
    }

    void setFETCompressorKnee(int knee) {
        viper.DispatchCommand(PARAM_FET_COMPRESSOR_KNEE, knee, 0, 0, 0, 0, nullptr);
    }

    void setFETCompressorAutoKnee(bool enable) {
        viper.DispatchCommand(PARAM_FET_COMPRESSOR_AUTO_KNEE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setFETCompressorGain(int gain) {
        viper.DispatchCommand(PARAM_FET_COMPRESSOR_GAIN, gain, 0, 0, 0, 0, nullptr);
    }

    void setFETCompressorAutoGain(bool enable) {
        viper.DispatchCommand(PARAM_FET_COMPRESSOR_AUTO_GAIN, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setFETCompressorAttack(int attack) {
        viper.DispatchCommand(PARAM_FET_COMPRESSOR_ATTACK, attack, 0, 0, 0, 0, nullptr);
    }

    void setFETCompressorAutoAttack(bool enable) {
        viper.DispatchCommand(PARAM_FET_COMPRESSOR_AUTO_ATTACK, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setFETCompressorRelease(int release) {
        viper.DispatchCommand(PARAM_FET_COMPRESSOR_RELEASE, release, 0, 0, 0, 0, nullptr);
    }

    void setFETCompressorAutoRelease(bool enable) {
        viper.DispatchCommand(PARAM_FET_COMPRESSOR_AUTO_RELEASE, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    void setFETCompressorNoClip(bool enable) {
        viper.DispatchCommand(PARAM_FET_COMPRESSOR_NO_CLIP, enable ? 1 : 0, 0, 0, 0, 0, nullptr);
    }

    // ==================== Generic Parameter Interface ====================

    /**
     * Set a parameter by its ID
     * This is useful for advanced users who know the parameter IDs
     */
    void setParameter(int param, int val1, int val2 = 0, int val3 = 0, int val4 = 0) {
        viper.DispatchCommand(param, val1, val2, val3, val4, 0, nullptr);
    }
};

// ==================== Embind Bindings ====================

EMSCRIPTEN_BINDINGS(viper_controller) {
    emscripten::class_<ViperController>("ViperController")
        .constructor<>()

        // Core
        .function("process", &ViperController::process)
        .function("setSampleRate", &ViperController::setSampleRate)
        .function("getSampleRate", &ViperController::getSampleRate)
        .function("setEnabled", &ViperController::setEnabled)
        .function("isEnabled", &ViperController::isEnabled)
        .function("resetAllEffects", &ViperController::resetAllEffects)
        .function("getVersion", &ViperController::getVersion)
        .function("getArchitecture", &ViperController::getArchitecture)

        // Convolver
        .function("setConvolverEnabled", &ViperController::setConvolverEnabled)
        .function("setConvolverCrossChannel", &ViperController::setConvolverCrossChannel)

        // VHE
        .function("setVHEEnabled", &ViperController::setVHEEnabled)
        .function("setVHELevel", &ViperController::setVHELevel)

        // DDC
        .function("setDDCEnabled", &ViperController::setDDCEnabled)

        // Spectrum Extension
        .function("setSpectrumExtendEnabled", &ViperController::setSpectrumExtendEnabled)
        .function("setSpectrumExtendBark", &ViperController::setSpectrumExtendBark)
        .function("setSpectrumExtendBarkReconstruct", &ViperController::setSpectrumExtendBarkReconstruct)

        // FIR Equalizer
        .function("setFIREqualizerEnabled", &ViperController::setFIREqualizerEnabled)
        .function("setFIREqualizerBand", &ViperController::setFIREqualizerBand)

        // Field Surround
        .function("setFieldSurroundEnabled", &ViperController::setFieldSurroundEnabled)
        .function("setFieldSurroundWidening", &ViperController::setFieldSurroundWidening)
        .function("setFieldSurroundMidImage", &ViperController::setFieldSurroundMidImage)
        .function("setFieldSurroundDepth", &ViperController::setFieldSurroundDepth)

        // Differential Surround
        .function("setDiffSurroundEnabled", &ViperController::setDiffSurroundEnabled)
        .function("setDiffSurroundDelay", &ViperController::setDiffSurroundDelay)

        // Reverb
        .function("setReverbEnabled", &ViperController::setReverbEnabled)
        .function("setReverbRoomSize", &ViperController::setReverbRoomSize)
        .function("setReverbRoomWidth", &ViperController::setReverbRoomWidth)
        .function("setReverbDampening", &ViperController::setReverbDampening)
        .function("setReverbWetSignal", &ViperController::setReverbWetSignal)
        .function("setReverbDrySignal", &ViperController::setReverbDrySignal)

        // AGC
        .function("setAGCEnabled", &ViperController::setAGCEnabled)
        .function("setAGCRatio", &ViperController::setAGCRatio)
        .function("setAGCVolume", &ViperController::setAGCVolume)
        .function("setAGCMaxScaler", &ViperController::setAGCMaxScaler)

        // Dynamic System
        .function("setDynamicSystemEnabled", &ViperController::setDynamicSystemEnabled)
        .function("setDynamicSystemSideGain", &ViperController::setDynamicSystemSideGain)
        .function("setDynamicSystemStrength", &ViperController::setDynamicSystemStrength)

        // ViPER Bass
        .function("setViperBassEnabled", &ViperController::setViperBassEnabled)
        .function("setViperBassMode", &ViperController::setViperBassMode)
        .function("setViperBassFrequency", &ViperController::setViperBassFrequency)
        .function("setViperBassGain", &ViperController::setViperBassGain)

        // ViPER Clarity
        .function("setViperClarityEnabled", &ViperController::setViperClarityEnabled)
        .function("setViperClarityMode", &ViperController::setViperClarityMode)
        .function("setViperClarityGain", &ViperController::setViperClarityGain)

        // Cure
        .function("setCureEnabled", &ViperController::setCureEnabled)
        .function("setCureLevel", &ViperController::setCureLevel)

        // Tube Simulator
        .function("setTubeSimulatorEnabled", &ViperController::setTubeSimulatorEnabled)

        // AnalogX
        .function("setAnalogXEnabled", &ViperController::setAnalogXEnabled)
        .function("setAnalogXMode", &ViperController::setAnalogXMode)

        // Output
        .function("setOutputVolume", &ViperController::setOutputVolume)
        .function("setOutputPan", &ViperController::setOutputPan)
        .function("setLimiterThreshold", &ViperController::setLimiterThreshold)

        // Speaker Optimization
        .function("setSpeakerOptimizationEnabled", &ViperController::setSpeakerOptimizationEnabled)

        // FET Compressor
        .function("setFETCompressorEnabled", &ViperController::setFETCompressorEnabled)
        .function("setFETCompressorThreshold", &ViperController::setFETCompressorThreshold)
        .function("setFETCompressorRatio", &ViperController::setFETCompressorRatio)
        .function("setFETCompressorKnee", &ViperController::setFETCompressorKnee)
        .function("setFETCompressorAutoKnee", &ViperController::setFETCompressorAutoKnee)
        .function("setFETCompressorGain", &ViperController::setFETCompressorGain)
        .function("setFETCompressorAutoGain", &ViperController::setFETCompressorAutoGain)
        .function("setFETCompressorAttack", &ViperController::setFETCompressorAttack)
        .function("setFETCompressorAutoAttack", &ViperController::setFETCompressorAutoAttack)
        .function("setFETCompressorRelease", &ViperController::setFETCompressorRelease)
        .function("setFETCompressorAutoRelease", &ViperController::setFETCompressorAutoRelease)
        .function("setFETCompressorNoClip", &ViperController::setFETCompressorNoClip)

        // Generic
        .function("setParameter", &ViperController::setParameter);
}

#endif // __EMSCRIPTEN__
