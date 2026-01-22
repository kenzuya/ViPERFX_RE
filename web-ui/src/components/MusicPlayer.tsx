import { useCallback, useRef } from 'react';
import { AudioQueueItem, RepeatMode } from '../types/viper';
import { QueueList } from './QueueList';

interface MusicPlayerProps {
  audioFileName: string | null;
  isPlaying: boolean;
  isLoadingAudio: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;

  // Queue props
  queue: AudioQueueItem[];
  currentQueueIndex: number;
  repeatMode: RepeatMode;
  onAddToQueue: (files: File[]) => void;
  onRemoveFromQueue: (id: string) => void;
  onClearQueue: () => void;
  onPlayTrack: (index: number) => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onToggleRepeat: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Repeat icons
const RepeatOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const RepeatAllIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
  </svg>
);

const RepeatOneIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
    <text x="12" y="14" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="bold">1</text>
  </svg>
);

export function MusicPlayer({
  audioFileName,
  isPlaying,
  isLoadingAudio,
  currentTime,
  duration,
  onPlay,
  onPause,
  onStop,
  onSeek,
  queue,
  currentQueueIndex,
  repeatMode,
  onAddToQueue,
  onRemoveFromQueue,
  onClearQueue,
  onPlayTrack,
  onPlayNext,
  onPlayPrevious,
  onToggleRepeat,
}: MusicPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onAddToQueue(Array.from(files));
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [onAddToQueue]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isLoadingAudio) return;
    const files = e.dataTransfer.files;
    const audioFiles = Array.from(files).filter(f => f.type.startsWith('audio/'));
    if (audioFiles.length > 0) {
      onAddToQueue(audioFiles);
    }
  }, [onAddToQueue, isLoadingAudio]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Controls are disabled when no audio is loaded or when audio is loading
  const controlsDisabled = !audioFileName || isLoadingAudio;
  const hasQueue = queue.length > 0;

  return (
    <div className="glass rounded-2xl p-6">
      {/* File Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !isLoadingAudio && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-6 ${
          isLoadingAudio
            ? 'border-dark-600 cursor-wait opacity-75'
            : 'border-dark-600 hover:border-viper-500 cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoadingAudio}
        />
        {isLoadingAudio ? (
          <>
            <div className="animate-spin w-12 h-12 border-4 border-viper-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-viper-400 font-medium">Loading audio...</p>
            <p className="text-dark-500 text-sm mt-1">{audioFileName}</p>
          </>
        ) : (
          <>
            <svg className="w-12 h-12 mx-auto mb-3 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            {audioFileName ? (
              <p className="text-white font-medium">{audioFileName}</p>
            ) : (
              <>
                <p className="text-dark-300">Drop audio files here or click to browse</p>
                <p className="text-dark-500 text-sm mt-1">MP3, WAV, FLAC, OGG supported (multiple files allowed)</p>
              </>
            )}
          </>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div
          className={`h-2 bg-dark-700 rounded-full overflow-hidden ${
            controlsDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
          onClick={(e) => {
            if (controlsDisabled) return;
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
      <div className="flex items-center justify-center gap-2">
        {/* Previous Track */}
        <button
          onClick={onPlayPrevious}
          disabled={!hasQueue}
          className="p-3 rounded-full bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous track"
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Stop */}
        <button
          onClick={onStop}
          disabled={controlsDisabled}
          className="p-3 rounded-full bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Stop"
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={controlsDisabled}
          className="p-4 rounded-full bg-viper-500 hover:bg-viper-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors glow-viper"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoadingAudio ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Next Track */}
        <button
          onClick={onPlayNext}
          disabled={!hasQueue}
          className="p-3 rounded-full bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next track"
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>

        {/* Repeat */}
        <button
          onClick={onToggleRepeat}
          className={`p-3 rounded-full transition-colors ${
            repeatMode === 'off'
              ? 'bg-dark-700 hover:bg-dark-600 text-dark-400'
              : 'bg-viper-500/20 hover:bg-viper-500/30 text-viper-400'
          }`}
          title={`Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'one' ? 'One' : 'All'}`}
        >
          {repeatMode === 'off' && <RepeatOffIcon />}
          {repeatMode === 'all' && <RepeatAllIcon />}
          {repeatMode === 'one' && <RepeatOneIcon />}
        </button>
      </div>

      {/* Queue List */}
      <QueueList
        queue={queue}
        currentIndex={currentQueueIndex}
        onPlayTrack={onPlayTrack}
        onRemoveTrack={onRemoveFromQueue}
        onClearQueue={onClearQueue}
        onAddFiles={onAddToQueue}
      />
    </div>
  );
}
