const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, "../public")));

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Load socket handlers
// Load socket handlers
require("./socket/chatHandlers").default(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.get("/health", (req, res) => {
  res.json({ status: "ok" });
});