import { db } from "./db";
import { logCost } from "./costLog";
import { buildSystemPrompt } from "./chatContext";

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY!;
const MODEL = "gemini-2.5-flash";
const STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

// Gemini 2.5 Flash pricing — standard tier (text input/output)
// Source: https://ai.google.dev/gemini-api/docs/pricing
const INPUT_COST_PER_TOKEN = 0.30 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 2.50 / 1_000_000;

export async function generateReply(
  userId: string,
  bookId: string,
  assistantMessageId: number
): Promise<void> {
  const book = db.getBook(bookId);
  if (!book) {
    db.updateMessage(assistantMessageId, "", "error");
    return;
  }

  // Only send completed messages; exclude the pending assistant placeholder
  const history = db.getMessages(userId, bookId).filter(
    (m) => m.status === "completed" && m.id !== assistantMessageId
  );

  const systemInstruction = buildSystemPrompt({ bookId, userId });

  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  try {
    const res = await fetch(STREAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
      }),
    });

    if (!res.ok || !res.body) {
      console.error("Gemini error:", await res.text());
      db.updateMessage(assistantMessageId, "", "error");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let sseBuffer = "";
    let promptTokens = 0;
    let outputTokens = 0;

    db.updateMessage(assistantMessageId, "", "streaming");

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
          const chunk: string = obj.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (chunk) {
            accumulated += chunk;
            db.updateMessage(assistantMessageId, accumulated, "streaming");
          }
          const usage = obj.usageMetadata;
          if (usage?.promptTokenCount) promptTokens = usage.promptTokenCount;
          if (usage?.candidatesTokenCount) outputTokens = usage.candidatesTokenCount;
        } catch {
          // malformed chunk — skip
        }
      }
    }

    db.updateMessage(assistantMessageId, accumulated, "completed");

    logCost({
      api: "llm",
      provider: "google",
      model: MODEL,
      input_units: promptTokens + outputTokens,
      input_unit_type: "tokens",
      cost_usd: promptTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN,
      entity_type: "user",
      entity_id: userId,
      meta: { book_id: bookId, prompt_tokens: promptTokens, output_tokens: outputTokens },
    });
  } catch (err) {
    console.error("generateReply error:", err);
    db.updateMessage(assistantMessageId, "", "error");
  }
}
