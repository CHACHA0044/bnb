import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { getIO } from "../lib/socket";

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

export default router;
