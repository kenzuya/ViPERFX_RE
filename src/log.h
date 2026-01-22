#pragma once

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <cstdio>

#define TAG "ViPER4Web"

#define VIPER_LOGD(...) printf("[DEBUG] " __VA_ARGS__); printf("\n")
#define VIPER_LOGI(...) printf("[INFO] " __VA_ARGS__); printf("\n")
#define VIPER_LOGE(...) printf("[ERROR] " __VA_ARGS__); printf("\n")

#else

#include <android/log.h>

#define TAG "ViPER4Android"

#define VIPER_LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, TAG, __VA_ARGS__)
#define VIPER_LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)
#define VIPER_LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

#endif
