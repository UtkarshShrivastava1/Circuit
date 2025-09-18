// // lib/socket.js
// import { Server } from "socket.io";
 
// let io;

// export function initIO(server) {
//   io = new Server(server, {
//     cors: { origin: "*" },
//   });
//   io.on("connection", (socket) => {
//     console.log("User connected:", socket.id);

//     socket.on("join", (userId) => {
//       socket.join(userId); // join personal room
//     });

//     socket.on("disconnect", () => {
//       console.log("User disconnected:", socket.id);
//     });
//   });
//   return io;
// }

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
