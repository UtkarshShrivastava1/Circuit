const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: "*", // change to your frontend domain in production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    // welcome message
    socket.emit("message", "hello World");

    socket.on("message", (msg) => {
      console.log("📩 Message from client:", msg);
    });

    // ✅ Task created → notify only receiver
    socket.on("taskCreated", (data) => {
      const { senderId, receiverId, message, taskId } = data;
      console.log(`📌 Task created for ${receiverId}:`, message);

      io.to(receiverId).emit("notification", {
        id: Date.now(),
        senderId,
        taskId,
        message,
        timestamp: new Date(),
      });
    });

    // ✅ Register user to private room
    socket.on("register", (userId) => {
      socket.join(userId);
      console.log(`👤 User ${userId} joined their private room`);
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log("> Ready on http://localhost:3000");
  });
});
