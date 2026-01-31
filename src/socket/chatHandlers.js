export default (io) => {
  const pool = require("../db/pool").default;

  // In-memory room map: roomName → { users: [] }
  const rooms = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.emit("roomList", Object.keys(rooms));

    // JOIN ROOM
    socket.on("joinRoom", async ({ room, username }) => {
      try {
        socket.join(room);
        socket.data.username = username;
        socket.data.room = room;

        console.log(`${username} joined room: ${room}`);

        // Create room if not exists
        if (!rooms[room]) rooms[room] = { users: [] };

        // Add user if not already present
        if (!rooms[room].users.includes(username)) {
          rooms[room].users.push(username);
        }

        // Send updated user list to room
        io.to(room).emit("roomUsers", rooms[room].users);

        // Broadcast list of all active rooms
        io.emit("roomList", Object.keys(rooms));

        // Fetch chat history
        const result = await pool.query(
          "SELECT username, message, created_at FROM chat_messages WHERE room = $1 ORDER BY id ASC LIMIT 50",
          [room]
        );

        socket.emit("chatHistory", result.rows);

        // Notify others in the room
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
        // Save to DB
        await pool.query(
          "INSERT INTO chat_messages (room, username, message) VALUES ($1, $2, $3)",
          [room, username, message]
        );

        // Broadcast to room
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
      const username = socket.data.username;
      const room = socket.data.room;

      if (username && room && rooms[room]) {
        rooms[room].users = rooms[room].users.filter(u => u !== username);

        // Update room users
        io.to(room).emit("roomUsers", rooms[room].users);

        // Delete room if empty
        if (rooms[room].users.length === 0) {
          delete rooms[room];
        }

        // Broadcast updated room list
        io.emit("roomList", Object.keys(rooms));
      }

      if (username && room) {
        socket.to(room).emit("receiveMessage", {
          username: "Chat",
          message: `${username} left the room`,
          timestamp: Date.now()
        });
      }

      console.log("User disconnected:", socket.id);
    });
  });
};
