import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";
import Message from "./models/Message.js";

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Handle joining room
  socket.on("join-room", ({ roomId, userId, userName }) => {
    socket.join(roomId);
    console.log(`👤 User ${userName} (${userId}) joined room: ${roomId}`);
    
    // Notify others in room
    socket.to(roomId).emit("user-joined", {
      userId,
      userName,
      socketId: socket.id,
    });
  });

  // WebRTC signaling relay
  socket.on("webrtc-offer", ({ roomId, offer }) => {
    console.log(`📡 Relaying Offer for room: ${roomId}`);
    socket.to(roomId).emit("webrtc-offer", { offer, senderSocketId: socket.id });
  });

  socket.on("webrtc-answer", ({ roomId, answer }) => {
    console.log(`📡 Relaying Answer for room: ${roomId}`);
    socket.to(roomId).emit("webrtc-answer", { answer, senderSocketId: socket.id });
  });

  socket.on("webrtc-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("webrtc-candidate", { candidate, senderSocketId: socket.id });
  });

  // Real-time Chat
  socket.on("send-message", async ({ roomId, text, senderId, senderName }) => {
    try {
      // 1. Persist message in MongoDB
      const msg = await Message.create({
        roomId,
        sender: senderId,
        senderName,
        text,
      });

      // 2. Broadcast message to everyone in the room
      io.to(roomId).emit("receive-message", msg);
    } catch (err) {
      console.error("Failed to save or send message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

startServer();