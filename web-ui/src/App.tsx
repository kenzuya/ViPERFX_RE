import { useViperAudio } from './hooks/useViperAudio';
import { MusicPlayer } from './components/MusicPlayer';
import { EffectsPanel } from './components/EffectsPanel';
import { ToggleSwitch } from './components/Controls';

function App() {
  const {
    isLoading,
    isLoadingAudio,
    isPlaying,
    error,
    effectState,
    version,
    architecture,
    currentTime,
    duration,
    audioFileName,
    play,
    pause,
    stop,
    seek,
    updateEffect,
    updateEqualizerBand,
    resetEffects,
    clearError,
    // Queue state and actions
    audioQueue,
    currentQueueIndex,
    repeatMode,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playTrack,
    playNext,
    playPrevious,
    toggleRepeat,
  } = useViperAudio();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-viper-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-dark-300">Loading ViPER4Web...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="glass border-b border-dark-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-viper-400 to-viper-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ViPER4Web</h1>
                <p className="text-xs text-dark-400">
                  {version ? `v${version}` : ''} {architecture ? `(${architecture})` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-dark-300">Master</span>
                <ToggleSwitch
                  enabled={effectState.enabled}
                  onChange={(enabled) => updateEffect('enabled', enabled)}
                />
              </div>

              <button
                onClick={resetEffects}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-white transition-colors"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Error Display - hidden when loading audio */}
        {error && !isLoadingAudio && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 mb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <div>
                  <p className="text-red-400 font-medium">{error}</p>
                  {error.includes('ViPER') && (
                    <p className="text-sm text-red-300 mt-1">
                      Make sure to build the WASM module first by running <code className="bg-dark-800 px-2 py-1 rounded">./build-web.sh</code>
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-300 p-1 flex-shrink-0"
                title="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Music Player */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Music Player</h2>
          <MusicPlayer
            audioFileName={audioFileName}
            isPlaying={isPlaying}
            isLoadingAudio={isLoadingAudio}
            currentTime={currentTime}
            duration={duration}
            onPlay={play}
            onPause={pause}
            onStop={stop}
            onSeek={seek}
            queue={audioQueue}
            currentQueueIndex={currentQueueIndex}
            repeatMode={repeatMode}
            onAddToQueue={addToQueue}
            onRemoveFromQueue={removeFromQueue}
            onClearQueue={clearQueue}
            onPlayTrack={playTrack}
            onPlayNext={playNext}
            onPlayPrevious={playPrevious}
            onToggleRepeat={toggleRepeat}
          />
        </section>

        {/* Effects Panel */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Effects</h2>
          <EffectsPanel
            effectState={effectState}
            onUpdateEffect={updateEffect}
            onUpdateEqualizerBand={updateEqualizerBand}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-800 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-dark-500 text-sm">
          <p>ViPER4Web - Audio Effect Processor</p>
          <p className="mt-1">Based on ViPER4Android by viper.WYF, Martmists, Iscle</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
