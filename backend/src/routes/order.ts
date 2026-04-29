import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { getIO } from "../lib/socket";

const router = Router();

/**
 * POST /api/order
 * Create a new order within a session.
 * Body: { sessionId, items: [{ name, price, quantity }] }
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, items } = req.body;

    if (!sessionId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "sessionId and items[] required" });
      return;
    }

    // Verify session is OPEN
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== "OPEN") {
      res.status(400).json({ error: "Session not found or already closed" });
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.name || typeof item.price !== "number" || item.price < 0) {
        res.status(400).json({ error: `Invalid item: ${JSON.stringify(item)}` });
        return;
      }
    }

    const order = await prisma.order.create({
      data: {
        sessionId,
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

    console.log(`[ORDER] Created ${order.id} for session ${sessionId} (${items.length} items)`);

    // Emit realtime event
    try {
      const io = getIO();
      io.to(`session:${sessionId}`).to("admin").emit("order_placed", {
        order,
        sessionId,
        tableId: session.tableId,
      });
    } catch { /* Socket not initialized — skip */ }

    res.status(201).json(order);
  } catch (err) {
    console.error("[ORDER] Create error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

/**
 * PATCH /api/order/:orderId
 * Update order status. Admin only.
 * Body: { status: "PREPARING" | "SERVED" }
 */
router.patch("/:orderId", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const validStatuses = ["PLACED", "PREPARING", "SERVED"];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: true, session: true },
    });

    console.log(`[ORDER] ${orderId} → ${status}`);

    try {
      const io = getIO();
      io.to(`session:${order.sessionId}`).to("admin").emit("order_updated", {
        order,
        sessionId: order.sessionId,
        tableId: order.session.tableId,
      });
    } catch { /* skip */ }

    res.json(order);
  } catch (err) {
    console.error("[ORDER] Update error:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

export default router;
