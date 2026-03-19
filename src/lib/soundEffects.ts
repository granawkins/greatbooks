/**
 * Simple sound effects using Web Audio API.
 * No audio files needed — generates short tones programmatically.
 */

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15,
  delay = 0,
) {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);

  // Clean up after playback
  setTimeout(() => ctx.close().catch(() => {}), (delay + duration) * 1000 + 100);
}

/** Ascending two-tone chime — voice agent is ready */
export function playVoiceReady() {
  playTone(523, 0.12, "sine", 0.12, 0);     // C5
  playTone(659, 0.18, "sine", 0.12, 0.1);   // E5
}

/** Descending two-tone chime — voice agent stopped */
export function playVoiceStopped() {
  playTone(659, 0.12, "sine", 0.10, 0);     // E5
  playTone(440, 0.18, "sine", 0.10, 0.1);   // A4
}
