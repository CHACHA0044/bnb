import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { initSocketEvents } from "./lib/socket";

// Routes
import tableRouter from "./routes/table";
import orderRouter from "./routes/order";
import paymentRouter from "./routes/payment";
import adminRouter from "./routes/admin";
import menuRouter from "./routes/menu";
import statusRouter from "./routes/status";
import qrRouter from "./routes/qr";
import locationRouter from "./routes/location";
import reportsRouter from "./routes/reports";
import analyticsRouter from "./routes/analytics";

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || "5000", 10);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/* ─── CORS ─────────────────────────────────── */
app.use(cors({
  origin: [FRONTEND_URL, "https://bnb-ten-omega.vercel.app", /\.vercel\.app$/],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use(express.json());

/* ─── Socket.IO ────────────────────────────── */
const io = new SocketIOServer(server, {
  cors: {
    origin: [FRONTEND_URL, "https://bnb-ten-omega.vercel.app", /\.vercel\.app$/],
    methods: ["GET", "POST"],
  },
});

initSocketEvents(io);

/* ─── API Routes ───────────────────────────── */
app.use("/api/table", tableRouter);
app.use("/api/order", orderRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/admin", adminRouter);
app.use("/api/menu", menuRouter);
app.use("/api/status", statusRouter);
app.use("/api/qr", qrRouter);
app.use("/api/location", locationRouter);
app.use("/api/admin/reports", reportsRouter);
app.use("/api/admin/analytics", analyticsRouter);

import { prisma } from "./lib/prisma";

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ─── Session Auto-Closure Job ─────────────── */
// Runs every 5 minutes
setInterval(async () => {
  try {
    const openSessions = await prisma.session.findMany({
      where: { status: "OPEN" },
      include: {
        orders: { orderBy: { createdAt: "desc" } }
      }
    });

    const now = new Date();
    
    for (const session of openSessions) {
      const latestOrder = session.orders[0];
      const timeReference = latestOrder ? latestOrder.createdAt : session.createdAt;
      const minutesSinceActivity = (now.getTime() - timeReference.getTime()) / (1000 * 60);
      
      const hasActiveOrders = session.orders.some((o: any) => o.status === "PLACED" || o.status === "PREPARING");
      
      if (!hasActiveOrders && minutesSinceActivity > 90) {
        await prisma.session.update({
          where: { id: session.id },
          data: { status: "CLOSED" }
        });
        console.log(`[JOB] Auto-closed session ${session.id} (inactive for ${Math.round(minutesSinceActivity)} mins)`);
        io.to(`session:${session.id}`).emit("session_updated");
        io.to("admin").emit("session_updated");
      }
    }
  } catch (err) {
    console.error("[JOB] Error auto-closing sessions:", err);
  }
}, 5 * 60 * 1000);

/* ─── Daily Report Generation Job ─────────── */
import { generateDailyReport, generateMonthlyCSV, storeReport } from "./lib/reports";

// Every 30 minutes, regenerate today's report (keeps it fresh)
setInterval(async () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const buffer = await generateDailyReport(today);
    await storeReport("DAILY_EXCEL", today, `BnB_Daily_${today}.xlsx`, buffer);
    
    // Also update monthly CSV
    const month = today.slice(0, 7);
    const csv = await generateMonthlyCSV(month);
    await storeReport("MONTHLY_CSV", month, `BnB_Monthly_${month}.csv`, Buffer.from(csv, "utf-8"));
  } catch (err) {
    console.error("[JOB] Report generation error:", err);
  }
}, 30 * 60 * 1000);

/* ─── Start ────────────────────────────────── */
server.listen(PORT, () => {
  console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🔗 CORS: ${FRONTEND_URL}`);
  console.log(`📍 Geo: ${process.env.RESTAURANT_LAT || '26.834906'}, ${process.env.RESTAURANT_LNG || '80.884822'}\n`);
});
 
