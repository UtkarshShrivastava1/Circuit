// socket-server.js
// import { Server } from "socket.io";

// let io;

// export function initIO(server) {
//   io = new Server(server, {
//     cors: {
//       origin: "*", // update to your frontend domain
//       methods: ["GET", "POST"]
//     }
//   });

//   io.on("connection", (socket) => {
//     console.log("🔗 User connected:", socket.id);

// export function getIO() {
//   if (!io) throw new Error("Socket.io not initialized!");
//   return io;
// }

// lib/socket.js
import { io } from "socket.io-client";  // ✅ use client, not server

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin, {
      withCredentials: true,
    });
  }
  return socket;
}
// lib/socket.js
// import { io } from "socket.io-client";

// let socket;

// export function getSocket() {
//   if (!socket) {
//     socket = io("http://localhost:3000", {
//       withCredentials: true,
//       transports: ["websocket"],
//     // When frontend registers a user
//     socket.on("register", (userId) => {
//       socket.userId = userId;
//       socket.join(`user_${userId}`); // 🔑 join personal room
//       console.log(`✅ User ${userId} joined room user_${userId}`);
//     });

//     socket.on("disconnect", () => {
//       console.log("❌ User disconnected:", socket.id);
//     });
//   });

//   global.io = io; // so you can use io in APIs
//   return io;
// }
// }
// export function getIO() {
//   if (!io) throw new Error("Socket.io not initialized");
//   return io;
// }
