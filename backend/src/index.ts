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

/* ─── Ping config (resolved once at startup) ── */
// Both vars must be set in production. Fail fast with a clear warning if not.
const PING_SECRET: string = process.env.PING_SECRET ?? "";
const BACKEND_URL: string = process.env.BACKEND_URL ?? "";

app.get("/api/ping", (req, res) => {
  const token = req.headers["x-ping-token"];

  // Reject if secret is not configured or token doesn't match
  if (!PING_SECRET || token !== PING_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Random calculation to prove the server is alive and doing real work
  const a = Math.floor(Math.random() * 9_000) + 1_000;
  const b = Math.floor(Math.random() * 900) + 100;
  const ops = ["+", "-", "*"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let result: number;
  if (op === "+") result = a + b;
  else if (op === "-") result = a - b;
  else result = a * b;

  const ts = new Date().toISOString();
  console.log(`[PING] 🏓 Self-ping received at ${ts} | Calc: ${a} ${op} ${b} = ${result}`);

  return res.json({
    status: "alive",
    timestamp: ts,
    calc: `${a} ${op} ${b} = ${result}`,
  });
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
import { isWithinWorkingHours } from "./lib/summaries";

// Automatic Report Finalization Job (Runs at 4 AM daily)
setInterval(async () => {
  try {
    const now = new Date();
    if (now.getHours() !== 4) return; // Only execute at 4 AM

    console.log("[JOB] Running daily report finalization...");

    // 1. Finalize Yesterday (Ensure all late-night orders are captured)
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yDate = yesterday.toISOString().split("T")[0];
    
    const yBuffer = await generateDailyReport(yDate);
    await storeReport("DAILY_EXCEL", yDate, `BnB_Daily_${yDate}.xlsx`, yBuffer);

    // 2. Refresh Monthly Archive for the finalized month
    const yMonth = yDate.slice(0, 7);
    const yCsv = await generateMonthlyCSV(yMonth);
    await storeReport("MONTHLY_CSV", yMonth, `BnB_Monthly_${yMonth}.csv`, Buffer.from(yCsv, "utf-8"));

    // 3. Pre-generate Today
    const today = now.toISOString().split("T")[0];
    const tBuffer = await generateDailyReport(today);
    await storeReport("DAILY_EXCEL", today, `BnB_Daily_${today}.xlsx`, tBuffer);

    console.log("[JOB] Daily reports finalized successfully.");
  } catch (err) {
    console.error("[JOB] Report generation error:", err);
  }
}, 60 * 60 * 1000); // Check every hour

/* ─── Start ────────────────────────────────── */
server.listen(PORT, () => {
  console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🔗 CORS: ${FRONTEND_URL}`);
  console.log(`📍 Geo: ${process.env.RESTAURANT_LAT || '26.834906'}, ${process.env.RESTAURANT_LNG || '80.884822'}\n`);

  /* ─── Production Self-Ping Cron Job ────────── */
  // Render free tier sleeps after 15 min of inactivity.
  // This job pings the server every 2 minutes to keep it alive.
  if (process.env.NODE_ENV === "production") {
    if (!BACKEND_URL || !PING_SECRET) {
      console.warn("[PING] ⚠️  BACKEND_URL or PING_SECRET is not set — self-ping disabled.");
    } else {
      const PING_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

      console.log(`[PING] 🔄 Self-ping cron started — firing every 2 min → ${BACKEND_URL}/api/ping`);

      setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/ping`, {
            method: "GET",
            headers: { "x-ping-token": PING_SECRET } satisfies Record<string, string>,
          });
          const data = await res.json() as { status: string; timestamp: string; calc: string };
          console.log(`[PING] ✅ Server alive | ${data.calc} | ${data.timestamp}`);
        } catch (err) {
          console.error("[PING] ❌ Self-ping failed:", err);
        }
      }, PING_INTERVAL_MS);
    }
  }
});
 
