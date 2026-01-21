import { useCallback, useRef } from 'react';

interface MusicPlayerProps {
  audioFileName: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onLoadFile: (file: File) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MusicPlayer({
  audioFileName,
  isPlaying,
  currentTime,
  duration,
  onLoadFile,
  onPlay,
  onPause,
  onStop,
  onSeek,
}: MusicPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFile(file);
    }
  }, [onLoadFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onLoadFile(file);
    }
  }, [onLoadFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="glass rounded-2xl p-6">
      {/* File Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-dark-600 hover:border-viper-500 rounded-xl p-8 text-center cursor-pointer transition-colors mb-6"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <svg className="w-12 h-12 mx-auto mb-3 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        {audioFileName ? (
          <p className="text-white font-medium">{audioFileName}</p>
        ) : (
          <>
            <p className="text-dark-300">Drop an audio file here or click to browse</p>
            <p className="text-dark-500 text-sm mt-1">MP3, WAV, FLAC, OGG supported</p>
          </>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div
          className="h-2 bg-dark-700 rounded-full cursor-pointer overflow-hidden"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = x / rect.width;
            onSeek(percent * duration);
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-viper-600 to-viper-400 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-dark-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onStop}
          disabled={!audioFileName}
          className="p-3 rounded-full bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>

        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={!audioFileName}
          className="p-4 rounded-full bg-viper-500 hover:bg-viper-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors glow-viper"
        >
          {isPlaying ? (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          onClick={() => onSeek(Math.max(0, currentTime - 10))}
          disabled={!audioFileName}
          className="p-3 rounded-full bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
          </svg>
        </button>

        <button
          onClick={() => onSeek(Math.min(duration, currentTime + 10))}
          disabled={!audioFileName}
          className="p-3 rounded-full bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
