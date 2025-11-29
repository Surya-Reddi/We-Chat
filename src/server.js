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
require("./socket/chatHandlers")(io);

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
