import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import http from "http";
import helmet from "helmet";
import { Server as SocketIOServer } from "socket.io";
import { initSocketEvents } from "./lib/socket";
import { createAdapter } from "@socket.io/redis-adapter";
import { getRedisAdapterClients, closeRedis, getRedisClient } from "./lib/redis";
import { logger, requestLogger } from "./lib/logger";

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
import rateLimit from "express-rate-limit";
import { initJobs } from "./lib/jobs";

import { createRateLimiters } from "./lib/rateLimit";

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || "5001", 10);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/* ─── CORS ─────────────────────────────────── */
app.use(cors({
  origin: [FRONTEND_URL, "https://bnb-ten-omega.vercel.app", /\.vercel\.app$/],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

/* ─── SECURITY HEADERS ────────────────────── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", FRONTEND_URL, "*.vercel.app"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  noSniff: true,
  xssFilter: true,
}));

// Enforce HTTPS in production
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      res.redirect(307, `https://${req.header("host")}${req.url}`);
    } else {
      next();
    }
  });
}

app.use(express.json({ limit: "1mb" })); // Limit payload size
app.use(requestLogger);

/* ─── Socket.IO ────────────────────────────── */
const io = new SocketIOServer(server, {
  cors: {
    origin: [FRONTEND_URL, "https://bnb-ten-omega.vercel.app", /\.vercel\.app$/],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Setup Redis Adapter
async function setupSocketAdapter() {
  try {
    const { pubClient, subClient } = await getRedisAdapterClients();
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[WS] Redis adapter initialized");
  } catch (err) {
    console.error("[WS] Failed to initialize Redis adapter:", err);
  }
}

import { prisma } from "./lib/prisma";

async function startServer() {
  // 1. Setup Redis Adapter first
  await setupSocketAdapter();

  // 2. Initialize socket events
  initSocketEvents(io);

  // 3. Rate limiters MUST be registered before routes
  try {
    const { apiLimiter, orderLimiter, authLimiter } = await createRateLimiters();
    app.use("/api/order", orderLimiter);
    app.use("/api/payment", orderLimiter);
    app.use("/api/admin/verify", authLimiter);
    app.use("/api/", apiLimiter);
    console.log("[SERVER] Redis rate limiters initialized");
  } catch (err) {
    console.warn("[SERVER] Redis rate limiters unavailable, using defaults:", err);
  }



  // 5. Routes registered AFTER rate limiters and latency middleware
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

  // 6. Health check (6.3)
  app.get("/api/health", async (_req: express.Request, res: express.Response) => {
    const ts = new Date().toISOString();
    let dbOk = false, redisOk = false;
    
    try { await prisma.$queryRaw`SELECT 1`; dbOk = true; } catch {}
    try { const r = await getRedisClient(); await r.ping(); redisOk = true; } catch {}
    
    const status = dbOk && redisOk ? "ok" : "degraded";
    res.status(dbOk && redisOk ? 200 : 503).json({
      status,
      timestamp: ts,
      db: dbOk ? "connected" : "error",
      redis: redisOk ? "connected" : "error"
    });
  });

  // 7. Start background jobs
  initJobs();

  // 8. Start server listening
  server.listen(PORT, () => {
    logger.info(`🚀 Backend running on http://localhost:${PORT}`);
    logger.info(`📡 Socket.IO ready with Redis adapter`);
    logger.info(`🔗 CORS: ${FRONTEND_URL}`);
  });
}

/* ─── Ping config (resolved once at startup) ── */
// Both vars must be set in production. Fail fast with a clear warning if not.
const PING_SECRET: string = process.env.PING_SECRET ?? "";
const BACKEND_URL: string = process.env.BACKEND_URL ?? "";

app.get("/api/ping", (req: express.Request, res: express.Response) => {
  const token = req.headers["x-ping-token"] as string | undefined;

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

// Note: Interval jobs (Session Auto-Closure, Daily Reports) moved to lib/jobs.ts

startServer().catch(err => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});

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

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[SERVER] SIGINT received. Shutting down...");
  await closeRedis();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[SERVER] SIGTERM received. Shutting down...");
  await closeRedis();
  process.exit(0);
});
