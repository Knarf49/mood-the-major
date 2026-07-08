import "dotenv/config"; // load .env before anything else reads process.env
import app from "./app";
import { connectDB, gracefulShutdown } from "../utils/db";
import http from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 8000;

async function startServer() {
  await connectDB(); // connects to MONGO_URI from .env, exits process if it fails

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const whiteboard = io.of("/whiteboard");

  whiteboard.on("connection", (socket) => {
    console.log("connect to whiteboard: ", socket.id);

    socket.on("join-board", (boardId) => {
      socket.join(boardId);
    });
    socket.on("draw-stroke", (data) => {
      // ใช้ .to(boardId).emit() และหลีกเลี่ยงการส่งกลับหาคนวาดเองด้วย socket.to()
      socket.to(data.boardId).emit("draw-stroke", data);
    });

    // เคลียร์บอร์ดร่วมกัน
    socket.on("clear-board", (boardId) => {
      socket.to(boardId).emit("clear-board");
    });

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected from Whiteboard WS: ${socket.id}`);
    });
  });

  server.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });

  // close DB connection cleanly when Render restarts/stops the service
  process.on("SIGINT", gracefulShutdown());
  process.on("SIGTERM", gracefulShutdown());
}

startServer();
