#!/usr/bin/env node
// Claude Selector Bridge Server
// Zero-dependency Node.js HTTP + WebSocket server on localhost:3456
// Holds element selections in memory, relays between Chrome extension and Claude Code.

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

// --- Configuration ---

const PORT = parseInt(process.env.CLAUDE_SELECTOR_PORT || "3456", 10);
const SHUTDOWN_GRACE_MS = parseInt(
  process.env.SHUTDOWN_GRACE_MS || "3000",
  10
);
const STALE_SESSION_MS = 5 * 60 * 1000; // 5 minutes
const STALE_CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds
const MAX_BODY_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_BATCH_HISTORY = 10;
const MAX_SELECTION_HISTORY = 20;
const PID_FILE = path.join(os.homedir(), ".claude-selector-bridge.pid");

// --- State ---

let currentBatch = null;
const batchHistory = [];
let currentSelection = null;
const selectionHistory = [];
const sessions = new Map(); // session_id -> { session_id, pid, cwd, model, last_heartbeat }
const wsClients = new Set();
let shutdownTimer = null;
let staleCheckInterval = null;

// --- PID file management ---

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function checkPidFile() {
  if (!fs.existsSync(PID_FILE)) return false;
  try {
    const content = fs.readFileSync(PID_FILE, "utf-8").trim();
    const [pidStr] = content.split("\n");
    const pid = parseInt(pidStr, 10);
    if (isNaN(pid)) {
      fs.unlinkSync(PID_FILE);
      return false;
    }
    if (isProcessAlive(pid)) {
      return true; // another instance is running
    }
    // stale PID file
    fs.unlinkSync(PID_FILE);
    return false;
  } catch {
    try {
      fs.unlinkSync(PID_FILE);
    } catch {}
    return false;
  }
}

function writePidFile() {
  fs.writeFileSync(PID_FILE, `${process.pid}\n${PORT}\n`, "utf-8");
}

function removePidFile() {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {}
}

// --- Helpers ---

function json(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

function parseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function broadcastWs(message) {
  const data = JSON.stringify(message);
  for (const client of wsClients) {
    try {
      wsSend(client, data);
    } catch {}
  }
}

// --- Session management ---

function registerSession(data) {
  const id = data.session_id;
  if (!id) return false;
  sessions.set(id, {
    session_id: id,
    pid: data.pid || null,
    cwd: data.cwd || null,
    model: data.model || null,
    last_heartbeat: Date.now(),
  });
  // Cancel any pending shutdown
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }
  return true;
}

function deregisterSession(sessionId) {
  sessions.delete(sessionId);
  if (sessions.size === 0) {
    scheduleShutdown();
  }
}

function heartbeatSession(data) {
  const id = data.session_id;
  if (!id) return false;
  if (sessions.has(id)) {
    sessions.get(id).last_heartbeat = Date.now();
  } else {
    // Auto-register
    registerSession(data);
  }
  return true;
}

function cleanStaleSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.last_heartbeat > STALE_SESSION_MS) {
      sessions.delete(id);
    }
  }
  if (sessions.size === 0) {
    scheduleShutdown();
  }
}

function scheduleShutdown() {
  if (shutdownTimer) return;
  shutdownTimer = setTimeout(() => {
    if (sessions.size === 0) {
      shutdown();
    }
  }, SHUTDOWN_GRACE_MS);
}

function shutdown() {
  // Close all WS clients
  for (const client of wsClients) {
    try {
      client.socket.destroy();
    } catch {}
  }
  wsClients.clear();
  if (staleCheckInterval) clearInterval(staleCheckInterval);
  removePidFile();
  server.close(() => process.exit(0));
  // Force exit after 2s if close hangs
  setTimeout(() => process.exit(0), 2000);
}

// --- WebSocket (minimal RFC 6455 implementation) ---

function computeAcceptKey(key) {
  return crypto
    .createHash("sha1")
    .update(key + "258EAFA5-E914-47DA-95CA-5AB5DC085B11")
    .digest("base64");
}

function wsSend(client, data) {
  const payload = Buffer.from(data, "utf-8");
  const length = payload.length;
  let header;
  if (length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    // Write as two 32-bit values for large frames
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(length, 6);
  }
  client.socket.write(Buffer.concat([header, payload]));
}

function handleWsUpgrade(req, socket) {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }
  const acceptKey = computeAcceptKey(key);
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${acceptKey}\r\n` +
      "\r\n"
  );

  const client = { socket };
  wsClients.add(client);

  // Send init message
  wsSend(
    client,
    JSON.stringify({
      type: "init",
      batch: currentBatch,
      sessions: sessions.size,
    })
  );

  socket.on("data", (buf) => {
    // Parse WS frames for ping/pong/close; ignore text messages
    if (buf.length < 2) return;
    const opcode = buf[0] & 0x0f;
    if (opcode === 0x08) {
      // Close
      wsClients.delete(client);
      socket.destroy();
    } else if (opcode === 0x09) {
      // Ping → Pong
      const pong = Buffer.from(buf);
      pong[0] = (pong[0] & 0xf0) | 0x0a;
      socket.write(pong);
    }
  });

  socket.on("close", () => wsClients.delete(client));
  socket.on("error", () => wsClients.delete(client));
}

// --- HTTP routing ---

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;
  const pathname = url.pathname;

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // --- Batch endpoints ---

  if (pathname === "/batch" && method === "POST") {
    const body = parseJson(await readBody(req));
    if (!body) return json(res, 400, { error: "Invalid JSON" });
    // Store as current batch
    if (currentBatch) {
      batchHistory.unshift(currentBatch);
      if (batchHistory.length > MAX_BATCH_HISTORY) batchHistory.pop();
    }
    currentBatch = body.batch || body;
    broadcastWs({ type: "batch", batch: currentBatch });
    return json(res, 200, { ok: true, selections: (currentBatch.selections || []).length });
  }

  if (pathname === "/batch" && method === "GET") {
    return json(res, 200, { batch: currentBatch });
  }

  if (pathname === "/batch/history" && method === "GET") {
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "5", 10), MAX_BATCH_HISTORY);
    return json(res, 200, { history: batchHistory.slice(0, limit) });
  }

  // --- Legacy single selection endpoints ---

  if (pathname === "/selection" && method === "POST") {
    const body = parseJson(await readBody(req));
    if (!body) return json(res, 400, { error: "Invalid JSON" });
    if (currentSelection) {
      selectionHistory.unshift(currentSelection);
      if (selectionHistory.length > MAX_SELECTION_HISTORY)
        selectionHistory.pop();
    }
    currentSelection = body;
    broadcastWs({ type: "selection", selection: currentSelection });
    return json(res, 200, { ok: true });
  }

  if (pathname === "/selection" && method === "GET") {
    return json(res, 200, { selection: currentSelection });
  }

  if (pathname === "/history" && method === "GET") {
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "5", 10), MAX_SELECTION_HISTORY);
    return json(res, 200, { history: selectionHistory.slice(0, limit) });
  }

  // --- Clear ---

  if (pathname === "/clear" && method === "POST") {
    currentBatch = null;
    batchHistory.length = 0;
    currentSelection = null;
    selectionHistory.length = 0;
    broadcastWs({ type: "cleared" });
    return json(res, 200, { ok: true });
  }

  // --- Session endpoints ---

  if (pathname === "/session/register" && method === "POST") {
    const body = parseJson(await readBody(req));
    if (!body || !body.session_id)
      return json(res, 400, { error: "session_id required" });
    registerSession(body);
    return json(res, 200, { ok: true, sessions: sessions.size });
  }

  if (pathname === "/session/deregister" && method === "POST") {
    const body = parseJson(await readBody(req));
    if (!body || !body.session_id)
      return json(res, 400, { error: "session_id required" });
    deregisterSession(body.session_id);
    return json(res, 200, { ok: true, sessions: sessions.size });
  }

  if (pathname === "/session/heartbeat" && method === "POST") {
    const body = parseJson(await readBody(req));
    if (!body || !body.session_id)
      return json(res, 400, { error: "session_id required" });
    heartbeatSession(body);
    return json(res, 200, { ok: true });
  }

  if (pathname === "/sessions" && method === "GET") {
    return json(res, 200, {
      sessions: Array.from(sessions.values()),
    });
  }

  // --- Shutdown ---

  if (pathname === "/shutdown" && method === "POST") {
    json(res, 200, { ok: true, message: "Shutting down" });
    setTimeout(shutdown, 100);
    return;
  }

  // --- Health ---

  if (pathname === "/health" && method === "GET") {
    return json(res, 200, {
      pid: process.pid,
      port: PORT,
      uptime: Math.floor(process.uptime()),
      wsClients: wsClients.size,
      sessions: sessions.size,
      hasBatch: currentBatch !== null,
      batchSelections: currentBatch ? (currentBatch.selections || []).length : 0,
    });
  }

  // --- 404 ---
  json(res, 404, { error: "Not found" });
}

// --- Server startup ---

if (checkPidFile()) {
  console.error(
    `Bridge server already running (PID file: ${PID_FILE}). Exiting.`
  );
  process.exit(1);
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error("Request error:", err.message);
    if (!res.headersSent) {
      json(res, 500, { error: "Internal server error" });
    }
  });
});

server.on("upgrade", (req, socket) => {
  handleWsUpgrade(req, socket);
});

server.listen(PORT, "127.0.0.1", () => {
  writePidFile();
  console.log(`Claude Selector bridge server listening on http://127.0.0.1:${PORT}`);

  // Start stale session cleanup
  staleCheckInterval = setInterval(cleanStaleSessions, STALE_CHECK_INTERVAL_MS);
});

// Graceful shutdown on signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
