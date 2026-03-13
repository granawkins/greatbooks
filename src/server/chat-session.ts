/**
 * Per-connection chat session.
 * Handles both text (Gemini REST SSE) and voice (Gemini Live API) over one WebSocket.
 */

import { GoogleGenAI, Modality } from "@google/genai";
import { WebSocket } from "ws";
import { calculateVoiceCost, type AudioStats } from "./voice-cost";
import { logCost } from "../lib/costLog";
import { buildSystemPrompt } from "../lib/chatContext";
import type { MessageRow } from "../lib/db";
import Database from "better-sqlite3";

const TEXT_MODEL = "gemini-2.5-flash";
const VOICE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

// Text pricing
const INPUT_COST_PER_TOKEN = 0.3 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 2.5 / 1_000_000;

export type ChatSessionOptions = {
  apiKey: string;
  userId: string;
  bookId: string;
  clientWs: WebSocket;
  db: Database.Database; // read-write connection
  roDb: Database.Database; // read-only connection
};

function send(ws: WebSocket, data: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function createChatSession(opts: ChatSessionOptions) {
  const { apiKey, userId, bookId, clientWs, db, roDb } = opts;
  const ai = new GoogleGenAI({ apiKey });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let voiceSession: any = null;
  let voiceStats: AudioStats | null = null;
  let inputTranscript = "";
  let outputTranscript = "";

  // ── DB helpers ──────────────────────────────────────────────────────────

  function getMessages(): MessageRow[] {
    return roDb
      .prepare("SELECT * FROM messages WHERE user_id = ? AND book_id = ? ORDER BY id")
      .all(userId, bookId) as MessageRow[];
  }

  function insertMessage(
    role: "user" | "assistant",
    text: string,
    status: "pending" | "completed" = "completed",
    model: string | null = null
  ): MessageRow {
    return db
      .prepare(
        "INSERT INTO messages (user_id, book_id, role, text, status, model) VALUES (?, ?, ?, ?, ?, ?) RETURNING *"
      )
      .get(userId, bookId, role, text, status, model) as MessageRow;
  }

  function updateMessage(id: number, text: string, status: "streaming" | "completed" | "error", model?: string) {
    if (model) {
      db.prepare("UPDATE messages SET text = ?, status = ?, model = ? WHERE id = ?").run(text, status, model, id);
    } else {
      db.prepare("UPDATE messages SET text = ?, status = ? WHERE id = ?").run(text, status, id);
    }
  }

  // ── Send history on connect ─────────────────────────────────────────────

  function sendHistory() {
    const messages = getMessages();
    send(clientWs, { type: "history", messages });
  }

  // ── Text chat ───────────────────────────────────────────────────────────

  async function handleTextMessage(text: string) {
    // Insert user message (client already shows it optimistically)
    insertMessage("user", text);

    // Create pending assistant message
    const assistantMsg = insertMessage("assistant", "", "pending", TEXT_MODEL);
    send(clientWs, { type: "message", message: { ...assistantMsg, status: "streaming" } });

    const systemInstruction = buildSystemPrompt({ bookId, userId });
    const history = getMessages().filter(
      (m) => m.status === "completed" && m.id !== assistantMsg.id
    );
    const contents = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

    try {
      const res = await fetch(streamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
        }),
      });

      if (!res.ok || !res.body) {
        console.error("[chat] Gemini error:", await res.text());
        updateMessage(assistantMsg.id, "", "error");
        send(clientWs, { type: "stream_end", messageId: assistantMsg.id, error: true });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let sseBuffer = "";
      let promptTokens = 0;
      let outputTokens = 0;

      updateMessage(assistantMsg.id, "", "streaming");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const obj = JSON.parse(data);
            const chunk: string =
              obj.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (chunk) {
              accumulated += chunk;
              send(clientWs, {
                type: "stream",
                messageId: assistantMsg.id,
                text: chunk,
              });
            }
            const usage = obj.usageMetadata;
            if (usage?.promptTokenCount) promptTokens = usage.promptTokenCount;
            if (usage?.candidatesTokenCount) outputTokens = usage.candidatesTokenCount;
          } catch {
            // malformed chunk
          }
        }
      }

      updateMessage(assistantMsg.id, accumulated, "completed");
      send(clientWs, { type: "stream_end", messageId: assistantMsg.id });

      logCost({
        api: "llm",
        provider: "google",
        model: TEXT_MODEL,
        input_units: promptTokens + outputTokens,
        input_unit_type: "tokens",
        cost_usd:
          promptTokens * INPUT_COST_PER_TOKEN +
          outputTokens * OUTPUT_COST_PER_TOKEN,
        entity_type: "user",
        entity_id: userId,
        meta: { book_id: bookId, prompt_tokens: promptTokens, output_tokens: outputTokens },
      });
    } catch (err) {
      console.error("[chat] generateReply error:", err);
      updateMessage(assistantMsg.id, "", "error");
      send(clientWs, { type: "stream_end", messageId: assistantMsg.id, error: true });
    }
  }

  // ── Voice ───────────────────────────────────────────────────────────────

  function flushUserTranscript() {
    const text = inputTranscript.trim();
    inputTranscript = "";
    if (text.length > 0) {
      const msg = insertMessage("user", text);
      send(clientWs, { type: "message", message: msg });
    }
  }

  function flushAssistantTranscript() {
    const text = outputTranscript.trim();
    outputTranscript = "";
    if (text.length > 0) {
      const msg = insertMessage("assistant", text, "completed", VOICE_MODEL);
      send(clientWs, { type: "message", message: msg });
    }
  }

  async function startVoice() {
    if (voiceSession) {
      send(clientWs, { type: "voice_ready" }); // already active
      return;
    }

    voiceStats = {
      inputAudioBytes: 0,
      outputAudioBytes: 0,
      sessionStartMs: Date.now(),
    };
    inputTranscript = "";
    outputTranscript = "";

    const systemPrompt = buildSystemPrompt({ bookId, userId, voice: true });

    try {
      voiceSession = await ai.live.connect({
        model: VOICE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Orus" },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log(`[chat] Voice session opened for user=${userId}`);
            send(clientWs, { type: "voice_ready" });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onmessage: (msg: any) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            if (msg.serverContent?.modelTurn?.parts) {
              for (const part of msg.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  voiceStats!.outputAudioBytes += Math.floor(
                    part.inlineData.data.length * 3 / 4
                  );
                  send(clientWs, { type: "audio", data: part.inlineData.data });
                }
              }
            }

            if (msg.serverContent?.outputTranscription?.text) {
              outputTranscript += msg.serverContent.outputTranscription.text;
              send(clientWs, {
                type: "output_transcript",
                text: msg.serverContent.outputTranscription.text,
              });
            }
            if (msg.serverContent?.inputTranscription?.text) {
              inputTranscript += msg.serverContent.inputTranscription.text;
              send(clientWs, {
                type: "input_transcript",
                text: msg.serverContent.inputTranscription.text,
              });
            }

            if (msg.serverContent?.interrupted) {
              // Flush both transcripts before telling client to reset.
              // User first (they spoke to interrupt), then assistant (partial response).
              flushUserTranscript();
              flushAssistantTranscript();
              send(clientWs, { type: "interrupted" });
            }

            if (msg.serverContent?.turnComplete) {
              flushUserTranscript();
              flushAssistantTranscript();
              send(clientWs, { type: "turn_complete" });
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error("[chat] Voice error:", e.message || e);
            send(clientWs, { type: "error", message: String(e.message || e) });
          },
          onclose: () => {
            console.log("[chat] Voice session closed by Gemini");
            voiceSession = null;
          },
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[chat] Failed to start voice:", msg);
      send(clientWs, { type: "error", message: msg });
      voiceSession = null;
    }
  }

  function handleAudio(data: string) {
    if (!voiceSession || !voiceStats) return;
    voiceStats.inputAudioBytes += Math.floor(data.length * 3 / 4);
    voiceSession.sendRealtimeInput({
      audio: { data, mimeType: "audio/pcm;rate=16000" },
    });
  }

  function stopVoice() {
    if (!voiceSession) return;

    flushUserTranscript();
    flushAssistantTranscript();

    voiceSession.close();
    voiceSession = null;

    if (voiceStats) {
      const cost = calculateVoiceCost(voiceStats);
      console.log(
        `[chat] Voice: ${cost.sessionDurationS}s, ${cost.audioInputS}s in, ${cost.audioOutputS}s out, $${cost.costUsd.toFixed(4)}`
      );
      if (cost.inputTokens + cost.outputTokens > 0) {
        logCost({
          api: "realtime",
          provider: "google",
          model: VOICE_MODEL,
          input_units: cost.inputTokens + cost.outputTokens,
          input_unit_type: "tokens",
          cost_usd: cost.costUsd,
          entity_type: "user",
          entity_id: userId,
          meta: {
            book_id: bookId,
            session_duration_s: cost.sessionDurationS,
            audio_input_s: cost.audioInputS,
            audio_output_s: cost.audioOutputS,
          },
        });
      }
      voiceStats = null;
    }

    send(clientWs, { type: "voice_stopped" });
  }

  // ── Message router ──────────────────────────────────────────────────────

  function handleClientMessage(raw: Buffer | string) {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {
        case "text":
          handleTextMessage(msg.text);
          break;
        case "voice_start":
          startVoice();
          break;
        case "voice_stop":
          stopVoice();
          break;
        case "audio":
          handleAudio(msg.data);
          break;
      }
    } catch (e) {
      console.error("[chat] Bad message from client:", e);
    }
  }

  function handleClose() {
    console.log(`[chat] Disconnected user=${userId}`);
    if (voiceSession) {
      stopVoice();
    }
  }

  // Send history immediately
  sendHistory();

  return { handleClientMessage, handleClose };
}
