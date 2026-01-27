/**
 * ViPER Audio Worklet Processor
 *
 * This processor runs in a separate audio thread and handles audio I/O.
 * Audio processing happens in the main thread via WASM, and processed
 * data is sent back through message passing.
 *
 * Architecture:
 * 1. Worklet captures input audio and sends to main thread
 * 2. Main thread processes with WASM and sends back
 * 3. Worklet outputs the processed audio when enabled, or passes through input when disabled
 */

// Message types for type safety - Messages sent FROM the worklet
interface ProcessedAudioMessage {
  type: 'processedAudio';
  outputL: Float32Array;
  outputR: Float32Array;
  sequence: number;
}

interface InputAudioMessage {
  type: 'inputAudio';
  inputL: Float32Array;
  inputR: Float32Array;
  sequence: number;
  frameCount: number;
}

interface ReadyMessage {
  type: 'ready';
}

// Messages sent TO the worklet
interface StartMessage {
  type: 'start';
}

interface ResetMessage {
  type: 'reset';
}

interface SetEnabledMessage {
  type: 'setEnabled';
  value: boolean;
}

// Union types for all messages
type WorkletOutgoingMessage = InputAudioMessage | ReadyMessage;
type WorkletIncomingMessage = ProcessedAudioMessage | StartMessage | ResetMessage | SetEnabledMessage;

// Pending output entry for out-of-order handling
interface PendingOutput {
  outputL: Float32Array;
  outputR: Float32Array;
}

class ViperWorkletProcessor extends AudioWorkletProcessor {
  // Ring buffer for processed audio (stereo)
  private readonly bufferSize: number = 32768; // Larger buffer for stability
  private readonly ringBufferL: Float32Array;
  private readonly ringBufferR: Float32Array;
  private writeIndex: number = 0;
  private readIndex: number = 0;
  private bufferedSamples: number = 0;

  // Input buffer to accumulate before sending
  private readonly inputBufferL: Float32Array;
  private readonly inputBufferR: Float32Array;
  private inputBufferIndex: number = 0;
  private readonly inputChunkSize: number = 512;

  // State
  private isStarted: boolean = false; // Has playback started?
  private enabled: boolean = true; // Master bypass state

  // Pre-buffer: wait for enough samples before outputting
  private readonly preBufferThreshold: number = 2048; // ~46ms at 44.1kHz
  private hasPreBuffered: boolean = false;

  // Sequence tracking
  private inputSequence: number = 0;
  private expectedOutputSequence: number = 0;
  private readonly pendingOutputs: Map<number, PendingOutput> = new Map();

  // Fade state for smooth transitions
  private readonly fadeLength: number = 128;
  private fadeIn: boolean = false;
  private fadeOut: boolean = false;
  private fadeIndex: number = 0;
  private lastSampleL: number = 0;
  private lastSampleR: number = 0;

  constructor() {
    super();

    // Initialize typed arrays
    this.ringBufferL = new Float32Array(this.bufferSize);
    this.ringBufferR = new Float32Array(this.bufferSize);
    this.inputBufferL = new Float32Array(this.inputChunkSize);
    this.inputBufferR = new Float32Array(this.inputChunkSize);

    // Message handling
    this.port.onmessage = (event: MessageEvent<WorkletIncomingMessage>): void => {
      this.handleMessage(event.data);
    };

    this.port.postMessage({ type: 'ready' } satisfies ReadyMessage);
  }

  private handleMessage(data: WorkletIncomingMessage): void {
    switch (data.type) {
      case 'processedAudio':
        this.receiveProcessedAudio(data.outputL, data.outputR, data.sequence);
        break;
      case 'start':
        // Signal that playback is starting - begin pre-buffering
        this.isStarted = true;
        this.hasPreBuffered = false;
        break;
      case 'reset':
        this.reset();
        break;
      case 'setEnabled':
        this.enabled = data.value;
        if (!data.value) {
          // Flush ring buffer to prevent stale processed audio
          this.bufferedSamples = 0;
          this.hasPreBuffered = false;
        }
        break;
    }
  }

  private reset(): void {
    // Trigger fade out
    this.fadeOut = true;
    this.fadeIn = false;
    this.fadeIndex = 0;

    // Clear state
    this.writeIndex = 0;
    this.readIndex = 0;
    this.bufferedSamples = 0;
    this.inputBufferIndex = 0;
    this.inputSequence = 0;
    this.expectedOutputSequence = 0;
    this.pendingOutputs.clear();
    this.isStarted = false;
    this.hasPreBuffered = false;
  }

  private receiveProcessedAudio(outputL: Float32Array, outputR: Float32Array, sequence: number): void {
    // Handle out-of-order delivery
    if (sequence !== this.expectedOutputSequence) {
      // Only store if it's ahead, not behind
      if (sequence > this.expectedOutputSequence) {
        this.pendingOutputs.set(sequence, { outputL, outputR });
      }
      this.processPendingOutputs();
      return;
    }

    this.writeToRingBuffer(outputL, outputR);
    this.expectedOutputSequence++;
    this.processPendingOutputs();
  }

  private processPendingOutputs(): void {
    while (this.pendingOutputs.has(this.expectedOutputSequence)) {
      const pending = this.pendingOutputs.get(this.expectedOutputSequence);
      if (pending) {
        const { outputL, outputR } = pending;
        this.pendingOutputs.delete(this.expectedOutputSequence);
        this.writeToRingBuffer(outputL, outputR);
        this.expectedOutputSequence++;
      }
    }

    // Clean up old entries
    const cutoff = this.expectedOutputSequence - 20;
    const keysToDelete: number[] = [];
    this.pendingOutputs.forEach((_, seq) => {
      if (seq < cutoff) {
        keysToDelete.push(seq);
      }
    });
    keysToDelete.forEach((seq) => this.pendingOutputs.delete(seq));
  }

  private writeToRingBuffer(outputL: Float32Array, outputR: Float32Array): void {
    const samples = outputL.length;

    // Handle overflow by advancing read pointer
    const availableSpace = this.bufferSize - this.bufferedSamples;
    if (samples > availableSpace) {
      const overflow = samples - availableSpace;
      this.readIndex = (this.readIndex + overflow) % this.bufferSize;
      this.bufferedSamples -= overflow;
    }

    // Write samples
    for (let i = 0; i < samples; i++) {
      this.ringBufferL[this.writeIndex] = outputL[i];
      this.ringBufferR[this.writeIndex] = outputR[i];
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
    }
    this.bufferedSamples += samples;

    // Check if we've pre-buffered enough
    if (!this.hasPreBuffered && this.bufferedSamples >= this.preBufferThreshold) {
      this.hasPreBuffered = true;
      this.fadeIn = true;
      this.fadeOut = false;
      this.fadeIndex = 0;
    }
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const input = inputs[0];
    const output = outputs[0];

    if (!output || !output[0]) {
      return true;
    }

    const outputL = output[0];
    const outputR = output[1] || output[0];
    const frameCount = outputL.length;

    const hasInput = input && input[0] && input[0].length > 0;
    const inputL = hasInput ? input[0] : null;
    const inputR = hasInput ? (input[1] || input[0]) : null;

    // Bypass path: when disabled, copy input directly to output
    if (!this.enabled && hasInput && inputL && inputR) {
      for (let i = 0; i < frameCount; i++) {
        outputL[i] = inputL[i];
        outputR[i] = inputR[i];
      }
      return true;
    }

    // Capture and send input to main thread for processing
    if (hasInput && this.isStarted && inputL && inputR) {
      for (let i = 0; i < inputL.length; i++) {
        this.inputBufferL[this.inputBufferIndex] = inputL[i];
        this.inputBufferR[this.inputBufferIndex] = inputR[i];
        this.inputBufferIndex++;

        if (this.inputBufferIndex >= this.inputChunkSize) {
          const message: InputAudioMessage = {
            type: 'inputAudio',
            inputL: new Float32Array(this.inputBufferL),
            inputR: new Float32Array(this.inputBufferR),
            sequence: this.inputSequence++,
            frameCount: this.inputChunkSize
          };
          this.port.postMessage(message);
          this.inputBufferIndex = 0;
        }
      }
    }

    // Output processed audio from ring buffer
    if (this.hasPreBuffered && this.bufferedSamples >= frameCount) {
      for (let i = 0; i < frameCount; i++) {
        let sampleL = this.ringBufferL[this.readIndex];
        let sampleR = this.ringBufferR[this.readIndex];

        // Apply fade in
        if (this.fadeIn) {
          const gain = Math.min(1, this.fadeIndex / this.fadeLength);
          sampleL *= gain;
          sampleR *= gain;
          this.fadeIndex++;
          if (this.fadeIndex >= this.fadeLength) {
            this.fadeIn = false;
          }
        }

        // Apply fade out
        if (this.fadeOut) {
          const gain = Math.max(0, 1 - (this.fadeIndex / this.fadeLength));
          sampleL *= gain;
          sampleR *= gain;
          this.fadeIndex++;
          if (this.fadeIndex >= this.fadeLength) {
            this.fadeOut = false;
          }
        }

        outputL[i] = sampleL;
        outputR[i] = sampleR;
        this.lastSampleL = sampleL;
        this.lastSampleR = sampleR;

        this.readIndex = (this.readIndex + 1) % this.bufferSize;
      }
      this.bufferedSamples -= frameCount;
    } else {
      // Not ready - output silence with smooth fade from last sample
      for (let i = 0; i < frameCount; i++) {
        // Exponential decay to avoid clicks
        this.lastSampleL *= 0.9;
        this.lastSampleR *= 0.9;

        // Snap to zero
        if (Math.abs(this.lastSampleL) < 0.00001) this.lastSampleL = 0;
        if (Math.abs(this.lastSampleR) < 0.00001) this.lastSampleR = 0;

        outputL[i] = this.lastSampleL;
        outputR[i] = this.lastSampleR;
      }
    }

    return true;
  }
}

registerProcessor('viper-processor', ViperWorkletProcessor);
