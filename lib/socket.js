// socket-server.js
import { Server } from "socket.io";

let io;

export function initIO(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // update to your frontend domain
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("🔗 User connected:", socket.id);

    // When frontend registers a user
    socket.on("register", (userId) => {
      socket.userId = userId;
      socket.join(`user_${userId}`); // 🔑 join personal room
      console.log(`✅ User ${userId} joined room user_${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });

  global.io = io; // so you can use io in APIs
  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
