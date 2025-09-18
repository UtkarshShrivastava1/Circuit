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

  // keep track of connected users
const onlineUsers = {}; // { socketId: { userId, role } }


  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);


      // when frontend connects, let it register who it is
    socket.on("register", ({ userId, role }) => {
      console.log('userId',userId,'role',role)
      onlineUsers[socket.id] = { userId, role };
       socket.join(userId); // join their private roomy
      console.log("✅ Registered:", onlineUsers);
    });

    // welcome message
    socket.emit("message", "hello World");

    socket.on("message", (msg) => {
      console.log("📩 Message from client:", msg);
    });




     // attendance event from member
    socket.on("MemberAttendance", (notif) => {
      console.log("📝 Attendance event:", notif);

      // send to all admins/managers
      for (let [socketId, info] of Object.entries(onlineUsers)) {
        if (info.role === "admin" || info.role === "manager") {
          io.to(socketId).emit("notification", {
            id: Date.now(),
            title: "Attendance Request",
            message: notif.message,
            senderId: notif.senderId,
            timestamp: new Date(),
          });
        }
      }
    });


    socket.on("AttendanceAprove",(notif)=>{
      console.log("Attendance action : " ,notif)

        for (let [socketId, info] of Object.entries(onlineUsers)) {
        if (info.role === "member" ) {
          io.to(socketId).emit("notification", {
            id: Date.now(),
            title: "Attendance Report",
            message: notif.message,
            senderId: notif.senderId,
            timestamp: new Date(),
          });
        }
      }

    })


    //----------------------------------------------Leave-------------------------------------//
    //----------------------------------------------------------------------------------------//
   // Member applies leave
    socket.on("MemberLeave", (notif) => {
      console.log("📢 Leave request:", notif);

      // Broadcast only to admins/managers
      for (let [socketId, info] of Object.entries(onlineUsers)) {
        if (info.role === "admin" || info.role === "manager") {
          io.to(socketId).emit("notification", {
            id: Date.now(),
            senderId: notif.senderId,
            message: notif.message,
            role: notif.role,
            timestamp: new Date(),
          });
        }
      }
    });


     socket.on("LeaveAprove", (notif) => {
      console.log("📢 Leave action:", notif);

      // Broadcast only to admins/managers
      for (let [socketId, info] of Object.entries(onlineUsers)) {
        if (info.role === "member") {
          io.to(socketId).emit("notification", {
            id: Date.now(),
            senderId: notif.senderId,
            message: notif.message,
            role: notif.role,
            timestamp: new Date(),
          });
        }
      }
    });



    //--------------------------------------------------------------------------------//

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

  io.emit("hello !", " 🌎 world", (response) => {
  console.log(response); // "got it"
});

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log(`> 🏃‍➡️Ready on http://localhost:3000`);
  });
});
