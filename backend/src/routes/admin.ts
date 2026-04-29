import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { getIO } from "../lib/socket";

const router = Router();

// All admin routes require auth
router.use(requireAdmin);

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
  } catch (err) {
    console.error("[ADMIN] Sessions fetch error:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
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
        items: {
          create: items.map((item: { name: string; price: number; quantity?: number }) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
          })),
        },
      },
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
