import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { setIO } from "./lib/socket";

// Routes
import tableRouter from "./routes/table";
import orderRouter from "./routes/order";
import paymentRouter from "./routes/payment";
import adminRouter from "./routes/admin";

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || "5000", 10);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/* ─── CORS ─────────────────────────────────── */
app.use(cors({
  origin: [FRONTEND_URL, "https://bnb-ten-omega.vercel.app"],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use(express.json());

/* ─── Socket.IO ────────────────────────────── */
const io = new SocketIOServer(server, {
  cors: {
    origin: [FRONTEND_URL, "https://bnb-ten-omega.vercel.app"],
    methods: ["GET", "POST"],
  },
});

setIO(io);

io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Join a session room (for customers)
  socket.on("join_session", (sessionId: string) => {
    socket.join(`session:${sessionId}`);
    console.log(`[WS] ${socket.id} joined session:${sessionId}`);
  });

  // Join admin room
  socket.on("join_admin", () => {
    socket.join("admin");
    console.log(`[WS] ${socket.id} joined admin`);
  });

  socket.on("disconnect", () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

/* ─── API Routes ───────────────────────────── */
app.use("/api/table", tableRouter);
app.use("/api/order", orderRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/admin", adminRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ─── Start ────────────────────────────────── */
server.listen(PORT, () => {
  console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🔗 CORS: ${FRONTEND_URL}\n`);
});
