const jwt = require("jsonwebtoken");

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("⚡ Client connected:", socket.id);

    try {
      // 🔐 Optional: Auth check (recommended)
      const token = socket.handshake.auth?.token;

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
      }

      // Join admin room
      socket.on("joinAdminRoom", () => {
        socket.join("adminRoom");
        console.log("👨‍💻 Admin joined dashboard");
      });

      // 📊 Emit dashboard updates
      socket.on("dashboardUpdate", (data) => {
        io.to("adminRoom").emit("dashboardData", data);
      });

      // 👤 New user event
      socket.on("newUser", (user) => {
        io.to("adminRoom").emit("userAdded", user);
      });

      // 🎬 New content event
      socket.on("newContent", (content) => {
        io.to("adminRoom").emit("contentAdded", content);
      });

      socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
      });

    } catch (err) {
      console.error("Socket Error:", err.message);
    }
  });
};

module.exports = initSocket;