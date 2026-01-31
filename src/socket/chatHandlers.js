import pool from "../db/pool.js";

export default function chatHandlers(io) {
  // In-memory room map: roomName → { users: [] }
  const rooms = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Send existing rooms
    socket.emit("roomList", Object.keys(rooms));

    // JOIN ROOM
    socket.on("joinRoom", async ({ room, username }) => {
      try {
        socket.join(room);
        socket.data.username = username;
        socket.data.room = room;

        console.log(`${username} joined room: ${room}`);

        // Create room if not exists
        if (!rooms[room]) {
          rooms[room] = { users: [] };
        }

        // Add user if not already present
        if (!rooms[room].users.includes(username)) {
          rooms[room].users.push(username);
        }

        // Update users in room
        io.to(room).emit("roomUsers", rooms[room].users);

        // Broadcast active rooms
        io.emit("roomList", Object.keys(rooms));

        // Fetch chat history
        const result = await pool.query(
          `SELECT username, message, created_at
           FROM chat_messages
           WHERE room = $1
           ORDER BY id ASC
           LIMIT 50`,
          [room]
        );

        socket.emit("chatHistory", result.rows);

        // Notify others
        socket.to(room).emit("receiveMessage", {
          username: "Chat",
          message: `${username} joined the room`,
          timestamp: Date.now()
        });

      } catch (err) {
        console.error("Error in joinRoom:", err);
      }
    });

    // SEND MESSAGE
    socket.on("sendMessage", async ({ room, username, message }) => {
      try {
        await pool.query(
          "INSERT INTO chat_messages (room, username, message) VALUES ($1, $2, $3)",
          [room, username, message]
        );

        io.to(room).emit("receiveMessage", {
          username,
          message,
          timestamp: Date.now()
        });

      } catch (err) {
        console.error("DB Insert ERROR:", err);
      }
    });

    // TYPING INDICATOR
    socket.on("typing", ({ username, room }) => {
      socket.to(room).emit("typing", { username });
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      const { username, room } = socket.data;

      if (username && room && rooms[room]) {
        rooms[room].users = rooms[room].users.filter(
          (u) => u !== username
        );

        io.to(room).emit("roomUsers", rooms[room].users);

        if (rooms[room].users.length === 0) {
          delete rooms[room];
        }

        io.emit("roomList", Object.keys(rooms));

        socket.to(room).emit("receiveMessage", {
          username: "Chat",
          message: `${username} left the room`,
          timestamp: Date.now()
        });
      }

      console.log("User disconnected:", socket.id);
    });
  });
}
