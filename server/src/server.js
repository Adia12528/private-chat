import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { registerSocketHandlers } from "./socket/index.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigins = CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean);

const checkOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
    return callback(null, true);
  }
  // Allow local network connections (e.g. testing phone <-> laptop over Wi-Fi)
  if (
    /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
      origin
    )
  ) {
    return callback(null, true);
  }
  return callback(null, true);
};

app.use(cors({ origin: checkOrigin, credentials: true }));

const io = new Server(server, {
  cors: {
    origin: checkOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 5e7, // 50MB for peer file and image transfer
});

app.get("/health", (req, res) => res.json({ ok: true }));

let cachedIceServers = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

app.get("/api/ice-servers", async (req, res) => {
  const domain = process.env.METERED_DOMAIN;
  const secretKey = process.env.METERED_SECRET_KEY;

  if (domain && secretKey) {
    const now = Date.now();
    if (cachedIceServers && now - lastFetchTime < CACHE_DURATION) {
      return res.json(cachedIceServers);
    }
    try {
      const response = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${secretKey}`);
      if (response.ok) {
        const servers = await response.json();
        cachedIceServers = servers;
        lastFetchTime = now;
        return res.json(servers);
      }
      console.error(`[TURN] Metered API returned status: ${response.status}`);
    } catch (err) {
      console.error("[TURN] Failed to fetch Metered ICE servers:", err.message);
    }
  }

  // Fallback to robust STUN servers if Metered is not set or failed
  res.json([
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302",
      ],
    },
  ]);
});

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Realtime server listening on port ${PORT}`);
  console.log(`Allowed client origins: ${allowedOrigins.join(", ")}`);
});
