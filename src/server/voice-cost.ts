/**
 * Audio byte → token → cost calculation for Gemini Live voice sessions.
 */

// Gemini 2.5 Flash Native Audio pricing per 1M tokens
const AUDIO_INPUT_COST_PER_1M = 3.0;
const AUDIO_OUTPUT_COST_PER_1M = 12.0;
const AUDIO_TOKENS_PER_SEC = 32;

export type AudioStats = {
  inputAudioBytes: number; // PCM 16kHz 16-bit mono from mic
  outputAudioBytes: number; // PCM 24kHz 16-bit mono from model
  sessionStartMs: number;
};

export type CostResult = {
  sessionDurationS: number;
  audioInputS: number;
  audioOutputS: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export function calculateVoiceCost(stats: AudioStats): CostResult {
  const inputSecs = stats.inputAudioBytes / 2 / 16000;
  const outputSecs = stats.outputAudioBytes / 2 / 24000;
  const sessionSecs = (Date.now() - stats.sessionStartMs) / 1000;
  const inputTokens = Math.round(inputSecs * AUDIO_TOKENS_PER_SEC);
  const outputTokens = Math.round(outputSecs * AUDIO_TOKENS_PER_SEC);
  const cost =
    (inputTokens * AUDIO_INPUT_COST_PER_1M) / 1_000_000 +
    (outputTokens * AUDIO_OUTPUT_COST_PER_1M) / 1_000_000;

  return {
    sessionDurationS: Math.round(sessionSecs),
    audioInputS: Math.round(inputSecs),
    audioOutputS: Math.round(outputSecs),
    inputTokens,
    outputTokens,
    costUsd: cost,
  };
}
