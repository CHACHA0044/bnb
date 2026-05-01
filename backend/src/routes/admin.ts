import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { getIO } from "../lib/socket";
import { getNextSessionNumber } from "../lib/session";

const router = Router();

// All admin routes require auth
router.use(requireAdmin);

/**
 * GET /api/admin/verify
 * Simple endpoint to check if the admin secret is valid.
 */
router.get("/verify", (_req: Request, res: Response) => {
  res.json({ success: true });
});

/**
 * GET /api/admin/sessions
 * Returns all sessions with orders, items, and payments.
 */
router.get("/sessions", async (_req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        orders: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
        payments: { orderBy: { createdAt: "desc" } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });

    res.json(sessions);
  } catch (err: any) {
    console.error("[ADMIN] Sessions fetch error:", {
      message: err.message,
      code: err.code,
      meta: err.meta,
      stack: err.stack?.split("\n").slice(0, 3).join("\n")
    });
    res.status(500).json({ 
      error: "Failed to fetch sessions",
      details: err.message,
      isDbError: err.message?.includes("Can't reach database")
    });
  }
});

/**
 * GET /api/admin/db-check
 * Debug endpoint to test DB connectivity directly.
 */
router.get("/db-check", async (_req: Request, res: Response) => {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    res.json({ success: true, result });
  } catch (err: any) {
    console.error("[ADMIN] DB Check Failed:", err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      env_db_url_set: !!process.env.DATABASE_URL,
      env_direct_url_set: !!process.env.DIRECT_URL
    });
  }
});

/**
 * PATCH /api/admin/sessions/:sessionId/close
 * Closes a session.
 */
router.patch("/sessions/:sessionId/close", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params as { sessionId: string };

    // Check balance before closing
    const sessionData = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        orders: { include: { items: true } },
        payments: true
      }
    });

    if (!sessionData) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const total = sessionData.orders.reduce((acc, o) => 
      acc + o.items.reduce((s, i) => s + i.price * i.quantity, 0), 0
    );
    const paid = sessionData.payments
      .filter(p => p.status === "CONFIRMED")
      .reduce((acc, p) => acc + p.amount, 0);
    
    if (total - paid > 0) {
      res.status(400).json({ error: "Cannot close session with outstanding balance. Collect payment first." });
      return;
    }

    const session = await prisma.session.update({
      where: { id: sessionId as string },
      data: { status: "CLOSED" },
      include: {
        orders: { include: { items: true } },
        payments: true,
      },
    });

    console.log(`[ADMIN] Session ${sessionId} → CLOSED`);

    try {
      const io = getIO();
      io.to(`session:${sessionId}`).to("admin").emit("session_updated", {
        session,
        tableId: session.tableId,
      });
    } catch { /* skip */ }

    res.json(session);
  } catch (err) {
    console.error("[ADMIN] Close session error:", err);
    res.status(500).json({ error: "Failed to close session" });
  }
});

/**
 * POST /api/admin/sessions/:sessionId/order
 * Admin adds a manual order to a session.
 * Body: { items: [{ name, price, quantity }] }
 */
router.post("/sessions/:sessionId/order", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items[] required" });
      return;
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== "OPEN") {
      res.status(400).json({ error: "Session not found or closed" });
      return;
    }

    const order = await prisma.order.create({
      data: {
        sessionId: sessionId as string,
        isTakeaway: Boolean(req.body.isTakeaway),
        items: {
          create: items.map((item: { name: string; price: number; quantity?: number; type?: string }) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            type: item.type || "DINE_IN",
          })),
        },
      } as any, // Cast to any to bypass stale IDE types
      include: { items: true },
    });

    console.log(`[ADMIN] Manual order ${order.id} for session ${sessionId}`);

    try {
      const io = getIO();
      io.to(`session:${sessionId}`).to("admin").emit("order_placed", {
        order,
        sessionId,
        tableId: session.tableId,
      });
    } catch { /* skip */ }

    res.status(201).json(order);
  } catch (err) {
    console.error("[ADMIN] Manual order error:", err);
    res.status(500).json({ error: "Failed to add order" });
  }
});

/**
 * POST /api/admin/orders/new
 * Create a new session (if none exists) and add an order.
 * Body: { tableId, items, isTakeaway }
 */
router.post("/orders/new", async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableId, items, isTakeaway } = req.body;

    if (!tableId || !items || !Array.isArray(items)) {
      res.status(400).json({ error: "tableId and items[] required" });
      return;
    }

    // 1. Find or create session
    let session = await prisma.session.findFirst({
      where: { tableId, status: "OPEN" }
    });

    if (!session) {
      const sessionNumber = await getNextSessionNumber();
      session = await prisma.session.create({
        data: { tableId, status: "OPEN", sessionNumber }
      });
    }

    // 2. Create order
    const order = await prisma.order.create({
      data: {
        sessionId: session.id,
        isTakeaway: Boolean(isTakeaway),
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            type: item.type || (isTakeaway ? "TAKEAWAY" : "DINE_IN"),
          })),
        },
      },
      include: { items: true },
    });

    console.log(`[ADMIN] New session/order created for ${tableId}`);

    // 3. Emit sockets
    try {
      const io = getIO();
      io.to(`session:${session.id}`).to("admin").emit("order_placed", {
        order,
        sessionId: session.id,
        tableId: session.tableId,
      });
    } catch { /* skip */ }

    res.status(201).json(order);
  } catch (err) {
    console.error("[ADMIN] Create session/order error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

/**
 * POST /api/admin/payments/record
 * Record a payment directly (confirmed).
 */
router.post("/payments/record", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, amount, method } = req.body;
    
    if (!sessionId || !amount || !method) {
      res.status(400).json({ error: "sessionId, amount, and method required" });
      return;
    }

    const payment = await prisma.payment.create({
      data: { 
        sessionId: sessionId as string, 
        amount: Number(amount), 
        method: method as string, 
        status: "CONFIRMED" 
      },
      include: { session: true }
    });

    try {
      const io = getIO();
      io.to(`session:${sessionId}`).to("admin").emit("payment_confirmed", {
        payment,
        sessionId,
        tableId: (payment as any).session.tableId,
      });
    } catch { /* skip */ }

    res.status(201).json(payment);
  } catch (err) {
    console.error("[ADMIN] Record payment error:", err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

export default router;
