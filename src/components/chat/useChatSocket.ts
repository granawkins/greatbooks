"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { playVoiceReady, playVoiceStopped } from "@/lib/soundEffects";

export type VoiceState = "idle" | "connecting" | "active";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  status: "pending" | "streaming" | "completed" | "error";
  model?: string | null;
};

type UseChatSocketOptions = {
  bookId: string;
};

export function useChatSocket({ bookId }: UseChatSocketOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [userTranscript, setUserTranscript] = useState("");
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(0);
  const [creditsExhausted, setCreditsExhausted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Mic capture refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Audio playback refs
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);

  // ── Helpers ─────────────────────────────────────────────────────────────

  function wsSend(data: Record<string, unknown>) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }

  const scheduleAudioChunk = useCallback((base64: string) => {
    const ctx = playbackCtxRef.current;
    if (!ctx) return;

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const samples = new Int16Array(bytes.buffer);
    const floats = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      floats[i] = samples[i] / 32768;
    }

    const buffer = ctx.createBuffer(1, floats.length, 24000);
    buffer.getChannelData(0).set(floats);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startTime = Math.max(now, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
  }, []);

  const resetPlayback = useCallback(() => {
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
    }
    playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });
    nextPlayTimeRef.current = 0;
  }, []);

  // ── WebSocket connection ────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const isDev = window.location.port === "3000";
      const host = isDev ? `${window.location.hostname}:3002` : window.location.host;
      const wsPath = isDev ? "" : "/ws/chat";
      let wsUrl = `${protocol}//${host}${wsPath}?bookId=${encodeURIComponent(bookId)}`;

      // In dev, cookies aren't sent cross-origin (port 3000→3002).
      // Fetch a short-lived token from the Next.js API and pass it as a query param.
      if (isDev) {
        try {
          const res = await fetch("/api/chat/token", { credentials: "include" });
          if (res.ok) {
            const { token } = await res.json();
            wsUrl += `&token=${encodeURIComponent(token)}`;
          }
        } catch {
          // Will fail auth on the WS side
        }
      }

      if (cancelled) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "history":
            setMessages(msg.messages);
            break;

          case "message":
            setMessages((prev) => {
              // Replace optimistic message or append
              const existing = prev.findIndex((m) => m.id === msg.message.id);
              if (existing >= 0) {
                const next = [...prev];
                next[existing] = msg.message;
                return next;
              }
              return [...prev, msg.message];
            });
            break;

          case "stream": {
            const msgId = msg.messageId as number;
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === msgId);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = {
                  ...next[idx],
                  text: next[idx].text + msg.text,
                  status: "streaming",
                };
                return next;
              }
              return prev;
            });
            break;
          }

          case "stream_end": {
            const endId = msg.messageId as number;
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === endId);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = {
                  ...next[idx],
                  status: msg.error ? "error" : "completed",
                };
                return next;
              }
              return prev;
            });
            break;
          }

          case "voice_ready":
            setVoiceState("active");
            playVoiceReady();
            break;

          case "voice_stopped":
            setVoiceState("idle");
            playVoiceStopped();
            break;

          case "audio":
            scheduleAudioChunk(msg.data);
            break;

          case "output_transcript":
            setPartialTranscript((prev) => prev + msg.text);
            break;

          case "input_transcript":
            setUserTranscript((prev) => prev + msg.text);
            break;

          case "interrupted":
            resetPlayback();
            setPartialTranscript("");
            break;

          case "turn_complete":
            setPartialTranscript("");
            setUserTranscript("");
            break;

          case "credits_update": {
            const limit = msg.creditsLimit === -1 ? Infinity : msg.creditsLimit;
            setCreditsUsed(msg.creditsUsed);
            setCreditsLimit(limit);
            setCreditsExhausted(msg.creditsUsed >= limit && limit !== Infinity);
            break;
          }

          case "error":
            if (msg.message === "credits_exhausted") {
              setCreditsExhausted(true);
              if (msg.creditsUsed !== undefined) setCreditsUsed(msg.creditsUsed);
              if (msg.creditsLimit !== undefined) {
                setCreditsLimit(msg.creditsLimit === -1 ? Infinity : msg.creditsLimit);
              }
            }
            console.error("[chat] Server error:", msg.message);
            break;
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
    };

    } // end connect()

    connect();

    return () => {
      cancelled = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [bookId, scheduleAudioChunk, resetPlayback]);

  // ── Public API ──────────────────────────────────────────────────────────

  const sendText = useCallback((text: string) => {
    // Optimistic user message
    setMessages((prev) => [
      ...prev,
      { id: -Date.now(), role: "user", text, status: "completed", model: null },
    ]);
    wsSend({ type: "text", text });
  }, []);

  const cleanupMic = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }
    setAudioLevel(0);
    setPartialTranscript("");
    setUserTranscript("");
  }, []);

  const startVoice = useCallback(async () => {
    setVoiceState("connecting");
    setPartialTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      await audioCtx.audioWorklet.addModule("/audio-capture.js");
      const workletNode = new AudioWorkletNode(audioCtx, "audio-capture");
      workletNodeRef.current = workletNode;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(workletNode);

      playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });
      nextPlayTimeRef.current = 0;

      workletNode.port.onmessage = (event) => {
        const data = event.data;
        if (data.type === "audio") {
          wsSend({ type: "audio", data: data.data });
        }
        if (data.rms !== undefined) {
          setAudioLevel(data.rms);
        }
      };

      wsSend({ type: "voice_start" });
    } catch (e) {
      console.error("[chat] Mic failed:", e);
      setVoiceState("idle");
      cleanupMic();
    }
  }, [cleanupMic]);

  const stopVoice = useCallback(() => {
    wsSend({ type: "voice_stop" });
    cleanupMic();
    setVoiceState("idle");
  }, [cleanupMic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMic();
    };
  }, [cleanupMic]);

  return {
    messages,
    connected,
    sendText,
    voiceState,
    audioLevel,
    partialTranscript,
    userTranscript,
    startVoice,
    stopVoice,
    creditsUsed,
    creditsLimit,
    creditsExhausted,
  };
}
