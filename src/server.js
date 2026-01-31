import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

import chatHandlers from "./socket/chatHandlers.js";

const app = express();
const server = http.createServer(app);

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Load socket handlers
chatHandlers(io);

// Health check (MUST be on app, not server)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
