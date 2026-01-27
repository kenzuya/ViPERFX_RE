/**
 * Format Utilities for ViPER4Web
 *
 * Time formatting and display helpers for the audio player UI.
 */

/**
 * Format seconds into MM:SS display format
 * @param seconds - Time in seconds (can be fractional)
 * @returns Formatted string in MM:SS format
 * @example formatTime(125) => "2:05"
 * @example formatTime(3661) => "61:01"
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format seconds into HH:MM:SS display format for longer durations
 * @param seconds - Time in seconds (can be fractional)
 * @returns Formatted string in HH:MM:SS format
 * @example formatTimeExtended(3661) => "1:01:01"
 */
export function formatTimeExtended(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00:00';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format a percentage value for display
 * @param value - Number between 0 and 100
 * @param decimals - Number of decimal places (default 0)
 * @returns Formatted percentage string
 * @example formatPercentage(75.5) => "76%"
 * @example formatPercentage(75.5, 1) => "75.5%"
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  if (!Number.isFinite(value)) {
    return '0%';
  }

  const clampedValue = Math.max(0, Math.min(100, value));
  return `${clampedValue.toFixed(decimals)}%`;
}

/**
 * Format a decibel value for display
 * @param value - Decibel value
 * @param decimals - Number of decimal places (default 1)
 * @returns Formatted dB string
 * @example formatDecibels(-3.5) => "-3.5 dB"
 * @example formatDecibels(0) => "0.0 dB"
 */
export function formatDecibels(value: number, decimals: number = 1): string {
  if (!Number.isFinite(value)) {
    return '0.0 dB';
  }

  return `${value.toFixed(decimals)} dB`;
}

/**
 * Format a frequency value for display
 * @param hz - Frequency in Hertz
 * @returns Formatted frequency string with appropriate unit
 * @example formatFrequency(440) => "440 Hz"
 * @example formatFrequency(14000) => "14.0 kHz"
 */
export function formatFrequency(hz: number): string {
  if (!Number.isFinite(hz) || hz < 0) {
    return '0 Hz';
  }

  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(1)} kHz`;
  }

  return `${Math.round(hz)} Hz`;
}

/**
 * Format file size for display
 * @param bytes - Size in bytes
 * @returns Formatted size string with appropriate unit
 * @example formatFileSize(1024) => "1.0 KB"
 * @example formatFileSize(1048576) => "1.0 MB"
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) {
    return `${Math.round(size)} B`;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
