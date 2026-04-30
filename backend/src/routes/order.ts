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
    const { sessionId: reqSessionId, tableId, items, isTakeaway } = req.body as { sessionId?: string; tableId?: string; items: any[]; isTakeaway?: boolean };

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items[] required" });
      return;
    }

    if (!reqSessionId && !tableId) {
      res.status(400).json({ error: "sessionId or tableId required" });
      return;
    }

    let sessionId = reqSessionId;

    if (!sessionId && tableId) {
      // Create session
      const newSession = await prisma.session.create({
        data: { tableId }
      });
      sessionId = newSession.id;
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
        sessionId: sessionId as string,
        isTakeaway: Boolean(isTakeaway),
        items: {
          create: items.map((item: { name: string; price: number; quantity?: number; type?: string }) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            type: item.type || "DINE_IN",
          })),
        },
      } as any, // Cast to any to bypass stale IDE types while Prisma Client catches up
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
      // Import clearActiveCart and call it dynamically or add it to socket.ts exports
      const { clearActiveCart, getActiveCart } = require("../lib/socket");
      clearActiveCart(session.tableId);
      io.to(`table:${session.tableId}`).emit("cart_sync", getActiveCart(session.tableId));
    } catch (e) { console.error("Socket error", e); }

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
    const { orderId } = req.params as { orderId: string };
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

/**
 * PATCH /api/order/item/:itemId/served
 * Toggle isServed status for an order item. Admin only.
 */
router.patch("/item/:itemId/served", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { isServed } = req.body as { isServed: boolean };

    const item = await prisma.orderItem.update({
      where: { id: itemId },
      data: { isServed },
      include: { order: { include: { session: true } } },
    });

    try {
      const io = getIO();
      io.to(`session:${item.order.sessionId}`).to("admin").emit("order_updated", {
        order: item.order,
        sessionId: item.order.sessionId,
        tableId: item.order.session.tableId,
      });

      // Takeaway Ready Notification
      if (isServed && item.order.isTakeaway) {
        io.to(`session:${item.order.sessionId}`).emit("takeaway_ready", {
          message: "Your order is ready for pick up!",
          itemName: item.name
        });
      }
    } catch { /* skip */ }

    res.json(item);
  } catch (err) {
    console.error("[ORDER] Item update error:", err);
    res.status(500).json({ error: "Failed to update item status" });
  }
});

export default router;
