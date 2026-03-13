/**
 * Unified WebSocket chat server — handles text and voice chat.
 * Run: npm run chat-server
 * Listens on port 3002. Nginx proxies /ws/chat to this.
 */

import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { parse as parseUrl } from "url";
import { verifyJWT } from "../lib/auth";
import { createChatSession } from "./chat-session";
import Database from "better-sqlite3";
import path from "path";

const PORT = parseInt(process.env.CHAT_PORT || "3002", 10);
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error("GOOGLE_API_KEY not set.");
  process.exit(1);
}

const DB_PATH = path.join(process.cwd(), "greatbooks.db");
const rwDb = new Database(DB_PATH);
rwDb.pragma("foreign_keys = ON");
rwDb.pragma("busy_timeout = 5000");

const roDb = new Database(DB_PATH, { readonly: true });
roDb.pragma("foreign_keys = ON");

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (clientWs: WebSocket, req) => {
  const parsed = parseUrl(req.url || "", true);
  const bookId = parsed.query.bookId as string;

  if (!bookId) {
    clientWs.send(JSON.stringify({ type: "error", message: "bookId required" }));
    clientWs.close();
    return;
  }

  // Auth: try cookie first, fall back to query param (dev mode cross-origin)
  const cookieHeader = req.headers.cookie || "";
  const cookieToken = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("auth_token="))
    ?.split("=")[1];
  const queryToken = parsed.query.token as string | undefined;
  const authToken = cookieToken || queryToken;

  const userId = authToken ? verifyJWT(authToken) : null;
  if (!userId) {
    clientWs.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
    clientWs.close();
    return;
  }

  console.log(`[chat] Connection: user=${userId} book=${bookId}`);

  const { handleClientMessage, handleClose } = createChatSession({
    apiKey: API_KEY,
    userId,
    bookId,
    clientWs,
    db: rwDb,
    roDb,
  });

  clientWs.on("message", handleClientMessage);
  clientWs.on("close", handleClose);
});

httpServer.listen(PORT, () => {
  console.log(`Chat server listening on :${PORT}`);
});
