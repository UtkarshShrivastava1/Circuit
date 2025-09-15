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
  const io = new Server(server,{
  cors: {
    origin: "*", // or your frontend URL
    methods: ["GET", "POST"],
  },
});

  io.on("connection", (socket) => {
    // Handle socket events here
    console.log("🔌 Client connected",socket.id);
  });

  io.emit("hello !", " 🌎 world", (response) => {
  console.log(response); // "got it"
});

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log(`> 🏃‍➡️Ready on http://localhost:3000`);
  });
});
