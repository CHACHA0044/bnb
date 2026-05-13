import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { getIO } from "../lib/socket";
import { getNextSessionNumber } from "../lib/session";
import { logOrderAnalytics, removeOrderAnalytics } from "../lib/analytics";
import { clearActiveCart, getActiveCart } from "../lib/socket";
import crypto from "crypto";

export const pendingOrders = new Map<string, any>();


const router = Router();
/**
 * GET /api/order/config
 * Return public configuration for the client (e.g. UPI ID)
 */
router.get("/config", (_req: Request, res: Response) => {
  res.json({
    upiId: process.env.UPI_ID || "hemadembla505@okicici"
  });
});

/**
 * POST /api/order
 * Create a new order within a session.
 * Body: { sessionId, items: [{ name, price, quantity }] }
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId: reqSessionId, tableId, items, isTakeaway, packingCharges, instructions, customerPhone } = req.body as { 
      sessionId?: string; 
      tableId?: string; 
      items: any[]; 
      isTakeaway?: boolean; 
      packingCharges?: number;
      instructions?: string;
      customerPhone?: string;
    };

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
      const sessionNumber = await getNextSessionNumber(tableId);
      const newSession = await prisma.session.create({
        data: { tableId, sessionNumber }
      });
      sessionId = newSession.id;
    }

    // Verify session is OPEN and fetch full history for instant admin update
    const session = await prisma.session.findUnique({ 
      where: { id: sessionId },
      include: {
        orders: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!session || session.status !== "OPEN") {
      const reason = session?.status === "CLOSED" 
        ? "Session has been closed by admin. Please scan QR to start a new order."
        : "Session not found or already closed";
      res.status(400).json({ error: reason });
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.name || typeof item.price !== "number" || item.price < 0) {
        res.status(400).json({ error: `Invalid item: ${JSON.stringify(item)}` });
        return;
      }
    }

    // Smart Timer Extension: If less than 30 mins left, add 30 mins more
    const start = new Date(session.createdAt).getTime();
    const end = start + 90 * 60 * 1000;
    const now = new Date().getTime();
    const timeLeftMins = (end - now) / (1000 * 60);

    if (timeLeftMins < 30) {
      // Shift createdAt forward by 30 mins to extend expiration
      const newCreatedAt = new Date(session.createdAt.getTime() + 30 * 60 * 1000);
      await prisma.session.update({
        where: { id: sessionId },
        data: { createdAt: newCreatedAt }
      });
    }

    const tempId = `temp_${crypto.randomUUID()}`;
    const order = {
      id: tempId,
      sessionId: sessionId as string,
      status: "UNCONFIRMED",
      isTakeaway: Boolean(isTakeaway),
      packingCharges: Number(packingCharges || 0),
      instructions: instructions || "",
      customerPhone: customerPhone || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: items.map((item: { name: string; price: number; quantity?: number; type?: string }) => ({
        id: `temp_item_${crypto.randomUUID()}`,
        orderId: tempId,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        type: item.type || "DINE_IN",
        isServed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    };

    pendingOrders.set(tempId, order);

    console.log(`[ORDER] Created ${order.id} for session ${sessionId} (${items.length} items)`);

    // PREPARE INSTANT EMIT DATA
    // We use the session we just fetched, merged with the new in-memory order
    const mergedSession = JSON.parse(JSON.stringify({
      ...session,
      orders: [order, ...(session.orders || [])]
    }));

    try {
      const io = getIO();
      // Emit to user session and admin instantly with full data
      io.to(`session:${sessionId}`).to("admin").emit("order_placed", {
        order,
        sessionId,
        tableId: session.tableId,
        fullSession: mergedSession, // Admin sees complete data IMMEDIATELY
      });
      
      clearActiveCart(session.tableId || "");
      io.to(`table:${session.tableId}`).emit("cart_sync", getActiveCart(session.tableId || ""));
    } catch (e) { console.error("Socket error", e); }
    
    // Non-blocking analytics
    logOrderAnalytics(session, order).catch(e => console.error("[ORDER] Analytics error:", e));

    // Final response to the placing client (uses merged data for speed)
    res.status(201).json({ order, session: mergedSession });
    return;
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
    const validStatuses = ["UNCONFIRMED", "PLACED", "PREPARING", "SERVED", "CANCELLED"];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    if (orderId.startsWith("temp_")) {
      // It's an in-memory order!
      const pendingOrder = pendingOrders.get(orderId);
      if (!pendingOrder) {
        res.status(404).json({ error: "Pending order not found" });
        return;
      }

      if (status === "CANCELLED") {
        // Reject it
        pendingOrders.delete(orderId);
        removeOrderAnalytics(orderId).catch(() => {});
        try {

          const io = getIO();
          io.to(`session:${pendingOrder.sessionId}`).to("admin").emit("order_deleted", {
            orderId,
            sessionId: pendingOrder.sessionId,
            tableId: pendingOrder.session?.tableId,
            order: pendingOrder
          });
        } catch { /* skip */ }
        res.json({ success: true, status: "CANCELLED" });
        return;
      }

      // If they confirm it (e.g. PLACED, PREPARING) -> write to DB
      if (status === "PLACED" || status === "PREPARING" || status === "SERVED") {
        const newOrder = await prisma.order.create({
          data: {
            sessionId: pendingOrder.sessionId,
            isTakeaway: pendingOrder.isTakeaway,
            packingCharges: pendingOrder.packingCharges,
            instructions: pendingOrder.instructions,
            customerPhone: pendingOrder.customerPhone,
            status: status,
            items: {
              create: pendingOrder.items.map((i: any) => ({
                name: i.name,
                price: i.price,
                quantity: i.quantity,
                type: i.type,
                isServed: status === "SERVED"
              }))
            }
          } as any,
          include: { items: true, session: true }
        });
        
        pendingOrders.delete(orderId); // remove from memory
        
        try {
          const io = getIO();
          // Emit order updated with BOTH temp orderId (so UI knows which one finished) and new DB order
          io.to(`session:${newOrder.sessionId}`).to("admin").emit("order_updated", {
            tempOrderId: orderId, // tell clients to replace tempId
            order: newOrder,
            sessionId: newOrder.sessionId,
            tableId: newOrder.session?.tableId,
          });
        } catch { /* skip */ }
        res.json(newOrder);
        return;
      }
    }

    // Normal DB order
    const order = await prisma.order.findUnique({ where: { id: orderId } }) as any;
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const timeline = Array.isArray(order.statusTimeline) ? order.statusTimeline : [];
    
    // If marking as served, also mark all items as served
    if (status === "SERVED") {
      await prisma.orderItem.updateMany({
        where: { orderId },
        data: { isServed: true }
      });
    } else if (status === "PLACED") {
      // If reverting to placed, mark items as unserved
      await prisma.orderItem.updateMany({
        where: { orderId },
        data: { isServed: false }
      });
    }

    const updatedOrder = (await prisma.order.update({
      where: { id: orderId },
      data: { 
        status,
        estimatedReadyTime: status === "SERVED" ? null : order.estimatedReadyTime,
        statusTimeline: [...timeline, { status, timestamp: new Date().toISOString() }]
      } as any,
      include: { items: true, session: true },
    })) as any;


    if (status === "CANCELLED") {
      removeOrderAnalytics(orderId).catch(() => {});
    }

    // Trigger snapshot for history if served or cancelled
    if (status === "SERVED" || status === "CANCELLED") {
      const { createOrderHistorySnapshot } = require("../lib/orderHistory");
      createOrderHistorySnapshot(orderId).catch((e: any) => console.error("Snapshot error:", e));
    }

    console.log(`[ORDER] ${orderId} → ${status}`);

    try {
      const io = getIO();
      io.to(`session:${updatedOrder.sessionId}`).to("admin").emit("order_updated", {
        order: updatedOrder,
        sessionId: updatedOrder.sessionId,
        tableId: updatedOrder.session.tableId,
      });
    } catch { /* skip */ }
    res.json(updatedOrder);

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
    const { itemId } = req.params as { itemId: string };
    const { isServed } = req.body as { isServed: boolean };

    const item = await prisma.orderItem.update({
      where: { id: itemId },
      data: { isServed },
      include: { order: { include: { session: true, items: true } } },
    }) as any;

    // If all items served, clear order timer
    const allServed = item.order.items.every((i: any) => i.id === itemId ? isServed : i.isServed);
    if (allServed && item.order.estimatedReadyTime) {
      await prisma.order.update({
        where: { id: item.orderId },
        data: { estimatedReadyTime: null }
      });
    }

    try {
      const io = getIO();
      // Fetch full order with items to ensure client has complete state
      const fullOrder = await prisma.order.findUnique({
        where: { id: item.orderId },
        include: { items: true, session: true }
      });

      if (fullOrder) {
        io.to(`session:${item.order.sessionId}`).to("admin").emit("order_updated", {
          order: fullOrder,
          sessionId: item.order.sessionId,
          tableId: (fullOrder as any).session.tableId,
        });
      }

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

/**
 * PATCH /api/order/:orderId/items/served
 * Bulk toggle isServed status for all items in an order. Admin only.
 */
router.patch("/:orderId/items/served", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params as { orderId: string };
    const { isServed } = req.body as { isServed: boolean };

    const items = await prisma.orderItem.updateMany({
      where: { orderId },
      data: { isServed }
    });

    if (isServed) {
      await prisma.order.update({
        where: { id: orderId },
        data: { estimatedReadyTime: null }
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, session: true }
    });

    if (order) {
      try {
        const io = getIO();
        io.to(`session:${order.sessionId}`).to("admin").emit("order_updated", {
          order,
          sessionId: order.sessionId,
          tableId: order.session.tableId,
        });

        if (isServed && order.isTakeaway) {
          io.to(`session:${order.sessionId}`).emit("takeaway_ready", {
            message: "Your takeaway order is ready for pick up!",
            isFullOrder: true
          });
        }
      } catch { /* skip */ }
    }

    res.json({ success: true, count: items.count });
  } catch (err) {
    console.error("[ORDER] Bulk update error:", err);
    res.status(500).json({ error: "Failed to update items" });
  }
});

/**
 * DELETE /api/order/:orderId
 * Delete an order. Admin only.
 */
router.delete("/:orderId", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params as { orderId: string };
    
    if (orderId.startsWith("temp_")) {
      const pendingOrder = pendingOrders.get(orderId);
      if (pendingOrder) {
        pendingOrders.delete(orderId);
        try {
          const io = getIO();
          io.to(`session:${pendingOrder.sessionId}`).to("admin").emit("order_deleted", {
            orderId,
            sessionId: pendingOrder.sessionId,
            tableId: pendingOrder.session?.tableId,
            order: pendingOrder
          });
        } catch { /* skip */ }
      }
      res.json({ success: true });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { session: true }
    });

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // Delete related records first to avoid foreign key violations
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId } }),
      prisma.payment.deleteMany({ where: { orderId } }),
      prisma.order.delete({ where: { id: orderId } })
    ]);

    removeOrderAnalytics(orderId).catch(() => {});


    try {
      const io = getIO();
      io.to(`session:${order.sessionId}`).to("admin").emit("order_deleted", {
        orderId,
        sessionId: order.sessionId,
        tableId: order.session.tableId,
        order: order // Send full order info for notification
      });
    } catch { /* skip */ }

    res.json({ success: true });
  } catch (err) {
    console.error("[ORDER] Delete error:", err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

/**
 * PATCH /api/order/:orderId/timer
 * Set or update preparation timer. Admin only.
 * Body: { minutes: number | null }
 */
router.patch("/:orderId/timer", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params as { orderId: string };
    const { minutes } = req.body as { minutes: number | null };

    let estimatedReadyTime: Date | null = null;
    if (minutes !== null) {
      estimatedReadyTime = new Date(Date.now() + minutes * 60 * 1000);
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { estimatedReadyTime },
      include: { items: true, session: true }
    }) as any;

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
    console.error("[ORDER] Timer update error:", err);
    res.status(500).json({ error: "Failed to update timer" });
  }
});

export default router;
