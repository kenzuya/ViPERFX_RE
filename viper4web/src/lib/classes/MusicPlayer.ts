/**
 * MusicPlayer Class
 *
 * Handles all audio playback functionality including:
 * - Audio file import and decoding
 * - Queue management
 * - Playback state (play, pause, stop, seek)
 * - Repeat modes
 */

import { audioQueue, getAudioQueueState } from '$lib/stores/audio-queue';
import viperWorkletUrl from '$lib/audio-worklets/viper-worklet-processor.ts?worker&url';

export interface MusicPlayerState {
  isPlaying: boolean;
  isLoadingAudio: boolean;
  currentTime: number;
  duration: number;
  audioFileName: string | null;
}

export interface MusicPlayerCallbacks {
  onStateChange?: (state: MusicPlayerState) => void;
  onError?: (error: string) => void;
  onTrackEnd?: () => void;
}

/**
 * MusicPlayer class for handling audio playback
 */
export class MusicPlayer {
  // Audio nodes and context
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private workletReady = false;

  // Playback timing
  private startTime = 0;
  private pauseTime = 0;
  private animationFrameId: number | null = null;
  private playbackSequence = 0;

  // State
  private _isPlaying = false;
  private _isLoadingAudio = false;
  private _currentTime = 0;
  private _duration = 0;
  private _audioFileName: string | null = null;

  // Callbacks
  private callbacks: MusicPlayerCallbacks = {};

  // Audio processor callback (for WASM processing)
  private audioProcessor: ((inputL: Float32Array, inputR: Float32Array, sequence: number) => void) | null = null;

  constructor(callbacks?: MusicPlayerCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  // Getters for state
  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get isLoadingAudio(): boolean {
    return this._isLoadingAudio;
  }

  get currentTime(): number {
    return this._currentTime;
  }

  get duration(): number {
    return this._duration;
  }

  get audioFileName(): string | null {
    return this._audioFileName;
  }

  get hasAudio(): boolean {
    return this.audioBuffer !== null;
  }

  /**
   * Get the current audio context
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Get the worklet node for external connections
   */
  getWorkletNode(): AudioWorkletNode | null {
    return this.workletNode;
  }

  /**
   * Set the audio processor callback for WASM processing
   */
  setAudioProcessor(processor: (inputL: Float32Array, inputR: Float32Array, sequence: number) => void): void {
    this.audioProcessor = processor;
  }

  /**
   * Notify state change
   */
  private notifyStateChange(): void {
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange({
        isPlaying: this._isPlaying,
        isLoadingAudio: this._isLoadingAudio,
        currentTime: this._currentTime,
        duration: this._duration,
        audioFileName: this._audioFileName,
      });
    }
  }

  /**
   * Initialize AudioWorklet
   */
  async initAudioWorklet(enabledState: boolean): Promise<AudioWorkletNode | null> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.workletReady && this.workletNode) {
      return this.workletNode;
    }

    try {
      // Register the worklet processor (using Vite's ?worker&url import)
      await this.audioContext.audioWorklet.addModule(viperWorkletUrl);

      // Create the worklet node
      const node = new AudioWorkletNode(this.audioContext, 'viper-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 2,
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers',
      });

      // Handle messages from worklet
      node.port.onmessage = (event) => {
        const data = event.data;
        if (data.type === 'ready') {
          this.workletReady = true;
          // Sync enabled state to worklet on initialization
          node.port.postMessage({
            type: 'setEnabled',
            value: enabledState,
          });
        } else if (data.type === 'inputAudio' && this.audioProcessor) {
          // Process audio via callback
          this.audioProcessor(data.inputL, data.inputR, data.sequence);
        }
      };

      this.workletNode = node;
      return node;
    } catch {
      return null;
    }
  }

  /**
   * Update time tracking
   */
  private updateTime = (): void => {
    if (this.audioContext && this._isPlaying) {
      const elapsed = this.audioContext.currentTime - this.startTime + this.pauseTime;
      const audioDuration = this.audioBuffer?.duration || 0;
      this._currentTime = Math.min(elapsed, audioDuration);
      this.notifyStateChange();
      this.animationFrameId = requestAnimationFrame(this.updateTime);
    }
  };

  /**
   * Clean up playback nodes
   */
  private cleanupPlayback(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch {
        // Ignore errors if already stopped
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    // Reset worklet buffer state
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'reset' });
    }
  }

  /**
   * Load an audio file
   */
  async loadAudioFile(file: File): Promise<AudioBuffer | null> {
    this._isLoadingAudio = true;
    this._audioFileName = file.name;
    this.notifyStateChange();

    try {
      // Create or resume audio context
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Decode audio file
      const arrayBuffer = await file.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      this._duration = this.audioBuffer.duration;
      this._currentTime = 0;
      this.pauseTime = 0;

      return this.audioBuffer;
    } catch (err) {
      if (this.callbacks.onError) {
        this.callbacks.onError(err instanceof Error ? err.message : 'Failed to load audio file');
      }
      this._audioFileName = null;
      return null;
    } finally {
      this._isLoadingAudio = false;
      this.notifyStateChange();
    }
  }

  /**
   * Set audio buffer directly (for cached buffers)
   */
  setAudioBuffer(buffer: AudioBuffer, fileName: string): void {
    this.audioBuffer = buffer;
    this._audioFileName = fileName;
    this._duration = buffer.duration;
    this._currentTime = 0;
    this.pauseTime = 0;
    this.notifyStateChange();
  }

  /**
   * Start audio playback
   */
  async startPlayback(): Promise<void> {
    if (!this.audioContext || !this.audioBuffer) {
      if (this.callbacks.onError) {
        this.callbacks.onError('No audio loaded');
      }
      return;
    }

    // Clean up any existing playback
    this.cleanupPlayback();

    const ctx = this.audioContext;

    // Resume context if suspended
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Signal worklet that playback is starting
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'start' });
    }

    const source = ctx.createBufferSource();
    source.buffer = this.audioBuffer;

    // Connect through worklet
    if (this.workletNode) {
      source.connect(this.workletNode);
      this.workletNode.connect(ctx.destination);
    } else {
      // Fallback: direct connection if worklet failed
      source.connect(ctx.destination);
    }

    // Increment sequence and capture for this playback instance
    this.playbackSequence++;
    const mySequence = this.playbackSequence;

    source.onended = () => {
      // Only handle onended if this is still the current playback sequence
      if (mySequence !== this.playbackSequence) {
        return;
      }

      if (this._isPlaying) {
        this._isPlaying = false;

        // Cancel animation frame when playback ends
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }

        this.notifyStateChange();

        if (this.callbacks.onTrackEnd) {
          this.callbacks.onTrackEnd();
        }
      }
    };

    // Start playback from current position
    const offset = this.pauseTime;
    this.startTime = ctx.currentTime;
    source.start(0, offset);
    this.sourceNode = source;

    this._isPlaying = true;
    this.animationFrameId = requestAnimationFrame(this.updateTime);
    this.notifyStateChange();
  }

  /**
   * Play audio (alias for startPlayback)
   */
  async play(): Promise<void> {
    return this.startPlayback();
  }

  /**
   * Pause audio
   */
  pause(): void {
    if (this.sourceNode && this.audioContext) {
      this.pauseTime = this.audioContext.currentTime - this.startTime + this.pauseTime;
    }
    this.cleanupPlayback();
    this._isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyStateChange();
  }

  /**
   * Stop audio
   */
  stop(): void {
    this.cleanupPlayback();
    this.pauseTime = 0;
    this._currentTime = 0;
    this._isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyStateChange();
  }

  /**
   * Seek to a specific time
   */
  seek(time: number): void {
    const wasPlaying = this._isPlaying;

    if (wasPlaying) {
      // Increment sequence to invalidate the old onended handler
      this.playbackSequence++;

      this.cleanupPlayback();
      this._isPlaying = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }

    this.pauseTime = time;
    this._currentTime = time;
    this.notifyStateChange();

    if (wasPlaying) {
      // Use setTimeout to ensure state is updated before playing again
      setTimeout(() => {
        this.startPlayback();
      }, 10);
    }
  }

  /**
   * Restart current track
   */
  restart(): void {
    // Increment sequence first to invalidate any pending onended handlers
    this.playbackSequence++;

    // Reset timing state
    this.pauseTime = 0;
    this._currentTime = 0;

    if (this._isPlaying) {
      // Cancel animation frame
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      // Cleanup existing playback
      this.cleanupPlayback();
      this._isPlaying = false;

      // Restart playback after state is clean
      setTimeout(() => this.play(), 10);
    }
    this.notifyStateChange();
  }

  /**
   * Get current playback position in seconds
   */
  getCurrentPosition(): number {
    if (this._isPlaying && this.audioContext) {
      return this.audioContext.currentTime - this.startTime + this.pauseTime;
    }
    return this.pauseTime;
  }

  /**
   * Get the sample rate of the loaded audio
   */
  getSampleRate(): number {
    return this.audioBuffer?.sampleRate || 44100;
  }

  /**
   * Increment playback sequence (to invalidate old handlers)
   */
  incrementPlaybackSequence(): void {
    this.playbackSequence++;
  }

  /**
   * Send processed audio back to worklet
   */
  sendProcessedAudio(outputL: Float32Array, outputR: Float32Array, sequence: number): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'processedAudio',
        outputL,
        outputR,
        sequence,
      });
    }
  }

  /**
   * Update worklet bypass state for immediate audio passthrough
   */
  setWorkletEnabled(enabled: boolean): void {
    if (this.workletNode && this.workletReady) {
      this.workletNode.port.postMessage({
        type: 'setEnabled',
        value: enabled,
      });
    }
  }

  /**
   * Add files to queue
   */
  async addToQueue(files: File[]): Promise<void> {
    const items = files.map((file) => ({
      file,
      name: file.name,
      duration: 0,
      buffer: null,
    }));

    // Track if queue was empty before adding
    const wasEmpty = getAudioQueueState().queue.length === 0;

    // Add items to queue store
    const ids = audioQueue.addToQueue(items);

    // Initialize audio context for decoding
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const ctx = this.audioContext;

    // Pre-decode all buffers in parallel (fire and forget)
    files.forEach(async (file, index) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

        // Update queue item with decoded buffer
        audioQueue.updateItemBuffer(ids[index], decodedBuffer);
        audioQueue.updateItemDuration(ids[index], decodedBuffer.duration);
      } catch {
        // Silently ignore decoding errors during pre-loading
      }
    });

    // Return whether queue was empty and items were added
    if (wasEmpty && files.length > 0) {
      // Auto-load first track
      const queueState = getAudioQueueState();
      if (queueState.queue.length > 0) {
        audioQueue.setCurrentIndex(0);
      }
    }
  }

  /**
   * Remove from queue
   */
  removeFromQueue(id: string): void {
    const queueState = getAudioQueueState();
    const index = queueState.queue.findIndex((item) => item.id === id);

    if (index === -1) return;

    // If removing currently playing track, stop playback
    if (index === queueState.currentIndex) {
      this.stop();
      this.audioBuffer = null;
      this._audioFileName = null;
    }

    audioQueue.removeFromQueue(id);
    this.notifyStateChange();
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.stop();
    this.audioBuffer = null;
    this._audioFileName = null;
    this._duration = 0;
    audioQueue.clearQueue();
    this.notifyStateChange();
  }

  /**
   * Toggle repeat mode
   */
  toggleRepeat(): void {
    audioQueue.toggleRepeat();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'reset' });
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.audioBuffer = null;
    this._isPlaying = false;
    this.workletReady = false;
  }
}
