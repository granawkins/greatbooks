/**
 * AudioWorklet processor for mic capture.
 * Captures audio at native sample rate, resamples to 16kHz PCM 16-bit mono,
 * and posts base64-encoded chunks to the main thread.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._bufferSize = 0;
    // Send chunks of ~100ms at 16kHz = 1600 samples = 3200 bytes
    this._targetSamples = 1600;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const samples = input[0]; // Float32 at sampleRate

    // Resample to 16kHz
    const ratio = sampleRate / 16000;
    const outputLength = Math.floor(samples.length / ratio);
    const resampled = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIdx = Math.floor(i * ratio);
      // Clamp and convert to 16-bit PCM
      const s = Math.max(-1, Math.min(1, samples[srcIdx]));
      resampled[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this._buffer.push(resampled);
    this._bufferSize += resampled.length;

    // Compute RMS for audio level visualization
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / samples.length);

    if (this._bufferSize >= this._targetSamples) {
      // Merge buffers
      const merged = new Int16Array(this._bufferSize);
      let offset = 0;
      for (const buf of this._buffer) {
        merged.set(buf, offset);
        offset += buf.length;
      }
      this._buffer = [];
      this._bufferSize = 0;

      // btoa not available in worklet — manual base64
      const bytes = new Uint8Array(merged.buffer);
      const base64 = this._toBase64(bytes);

      this.port.postMessage({ type: "audio", data: base64, rms });
    } else if (rms > 0) {
      this.port.postMessage({ type: "level", rms });
    }

    return true;
  }

  _toBase64(bytes) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i];
      const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
      const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
      result += chars[a >> 2];
      result += chars[((a & 3) << 4) | (b >> 4)];
      result += i + 1 < bytes.length ? chars[((b & 15) << 2) | (c >> 6)] : "=";
      result += i + 2 < bytes.length ? chars[c & 63] : "=";
    }
    return result;
  }
}

registerProcessor("audio-capture", AudioCaptureProcessor);
