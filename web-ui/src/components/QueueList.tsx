import { AudioQueueItem } from '../types/viper';

interface QueueListProps {
  queue: AudioQueueItem[];
  currentIndex: number;
  onPlayTrack: (index: number) => void;
  onRemoveTrack: (id: string) => void;
  onClearQueue: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function QueueList({
  queue,
  currentIndex,
  onPlayTrack,
  onRemoveTrack,
  onClearQueue,
}: QueueListProps) {
  if (queue.length === 0) {
    return (
      <div className="mt-4 p-4 bg-dark-800/50 rounded-xl border border-dark-700">
        <p className="text-center text-dark-400 text-sm">
          Queue is empty. Add audio files to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-dark-700">
        <span className="text-sm text-dark-300">
          Queue ({queue.length} {queue.length === 1 ? 'track' : 'tracks'})
        </span>
        <button
          onClick={onClearQueue}
          className="text-xs text-dark-400 hover:text-red-400 transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Track list */}
      <div className="max-h-48 overflow-y-auto">
        {queue.map((item, index) => (
          <div
            key={item.id}
            onClick={() => onPlayTrack(index)}
            className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
              index === currentIndex
                ? 'bg-viper-500/20 border-l-2 border-viper-500'
                : 'hover:bg-dark-700/50 border-l-2 border-transparent'
            }`}
          >
            {/* Track number / playing indicator */}
            <div className="w-6 text-center">
              {index === currentIndex ? (
                <svg className="w-4 h-4 text-viper-400 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <span className="text-xs text-dark-500">{index + 1}</span>
              )}
            </div>

            {/* Track name */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${
                index === currentIndex ? 'text-white font-medium' : 'text-dark-300'
              }`}>
                {item.name}
              </p>
            </div>

            {/* Duration */}
            <span className="text-xs text-dark-500 font-mono">
              {formatDuration(item.duration)}
            </span>

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTrack(item.id);
              }}
              className="p-1 text-dark-500 hover:text-red-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
