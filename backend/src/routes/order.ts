import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { getIO } from "../lib/socket";
import { getNextSessionNumber } from "../lib/session";
import { logOrderAnalytics, removeOrderAnalytics, updateOrderPerformanceMetrics } from "../lib/analytics";
import { clearActiveCart, getActiveCart } from "../lib/socket";
import { validateRequest, CreateOrderSchema } from "../lib/validation";
import { calculatePayableAmount } from "../lib/payment-calc";
import crypto from "crypto";
import { savePendingOrder, getPendingOrder, removePendingOrder, getAllPendingOrders } from "../lib/pending-orders";
import { getRedisClient } from "../lib/redis";


const router = Router();

/**
 * GET /api/order/config
 * 
 * SECURITY: UPI_ID is NEVER exposed to frontend.
 * This endpoint is REMOVED to prevent UPI tampering.
 */
router.get("/config", (_req: Request, res: Response) => {
  // UPI configuration is NOT sent to frontend
  // It's only used internallyduring payment processing
  res.status(403).json({ error: "Config endpoint deprecated" });
});

/**
 * POST /api/order
 * Create a new order within a session.
 * 
 * CRITICAL SECURITY:
 * - Frontend sends: sessionId, tableId, items (with menuItemId, quantity, variant)
 * - Frontend does NOT send: prices, totals, packing charges, taxes
 * - Backend validates ALL items against database
 * - Backend looks up current prices from database
 * - Backend calculates breakdown
 * - Backend returns breakdown for user confirmation
 * 
 * Body: { sessionId, items: [{ menuItemId, quantity, variantName? }], isTakeaway?, instructions? }
 */
router.post(
  "/",
  validateRequest(CreateOrderSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        sessionId: reqSessionId, 
        tableId, 
        items: requestItems, 
        isTakeaway = false, 
        instructions = "", 
        customerPhone 
      } = (req as any).validatedBody;

      let sessionId = reqSessionId;

      // Create session if needed
      if (!sessionId && tableId) {
        const sessionNumber = await getNextSessionNumber(tableId);
        const newSession = await prisma.session.create({
          data: { tableId, sessionNumber }
        });
        sessionId = newSession.id;
      }

      // Verify session exists and is OPEN
      const session = await prisma.session.findUnique({ 
        where: { id: sessionId },
        select: {
          id: true,
          tableId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          orders: {
            include: { items: true },
            orderBy: { createdAt: "desc" },
          },
          payments: {
            select: { id: true, amount: true, status: true, method: true, createdAt: true },
            orderBy: { createdAt: "desc" }
          },
        },
      });

      if (!session || session.status !== "OPEN") {
        const reason = session?.status === "CLOSED" 
          ? "Session has been closed by admin. Please scan QR to start a new order."
          : "Session not found or already closed";
        res.status(400).json({ error: reason });
        return;
      }

      // Validate all items exist in menu
      const menuItemIds = requestItems.map((i: any) => i.menuItemId);
      const menuItems = await prisma.menuItem.findMany({
        where: { id: { in: menuItemIds } },
      });

      if (menuItems.length !== menuItemIds.length) {
        res.status(400).json({ error: "One or more items not found in menu" });
        return;
      }

      // Check availability
      const unavailable = menuItems.filter(item => item.outOfStock);
      if (unavailable.length > 0) {
        res.status(400).json({
          error: `Items out of stock: ${unavailable.map(i => i.name).join(", ")}`,
        });
        return;
      }

      // Calculate the correct breakdown
      let calculatedBreakdown = null;
      try {
        calculatedBreakdown = await calculatePayableAmount(
          requestItems as any,
          isTakeaway
        );
      } catch (err) {
        console.error("[ORDER] Calculation error:", err);
        res.status(400).json({
          error: "Could not calculate order amount",
        });
        return;
      }

      // Smart Timer Extension: If less than 30 mins left, extend by 30 mins
      const referenceTime = session.updatedAt || session.createdAt;
      const start = new Date(referenceTime).getTime();
      const end = start + 90 * 60 * 1000;
      const now = new Date().getTime();
      const timeLeftMins = (end - now) / (1000 * 60);

      if (timeLeftMins < 30) {
        await prisma.session.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() } // Touch to extend active window
        });
      }

      const tempId = `temp_${crypto.randomUUID()}`;

      // Build order with CORRECT prices from database
      const order = {
        id: tempId,
        sessionId,
        status: "UNCONFIRMED",
        isTakeaway,
        packingCharges: calculatedBreakdown.packingCharges,
        instructions: instructions || "",
        customerPhone: customerPhone || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: calculatedBreakdown.breakdown.items.map((item, idx) => ({
          id: `temp_item_${crypto.randomUUID()}`,
          orderId: tempId,
          name: item.itemName,
          price: item.unitPrice, // Use DATABASE price, not frontend price
          quantity: item.quantity,
          type: isTakeaway ? "TAKEAWAY" : "DINE_IN",
          isServed: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      };

      // Secure Concurrency: Recheck session status right before saving to prevent ordering in CLOSED session
      const freshSession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { status: true }
      });
      if (!freshSession || freshSession.status !== "OPEN") {
        res.status(400).json({ error: "Session was closed while preparing your order. Order rejected." });
        return;
      }

      await savePendingOrder(tempId, order);

      console.log(`[ORDER] Created ${order.id} for session ${sessionId} (${requestItems.length} items) - Total: ₹${calculatedBreakdown.total}`);

      // Merge session with new order
      const mergedSession = JSON.parse(JSON.stringify({
        ...session,
        orders: [order, ...(session.orders || [])]
      }));

      try {
        const io = getIO();
        io.to(`session:${sessionId}`).to("admin").emit("order_placed", {
          order,
          sessionId,
          tableId: session.tableId,
          breakdown: calculatedBreakdown,
        });
        
        await clearActiveCart(session.tableId || "");
        io.to(`table:${session.tableId}`).emit("cart_sync", await getActiveCart(session.tableId || ""));
      } catch (e) { console.error("Socket error", e); }
      
      // Non-blocking analytics
      logOrderAnalytics(session as any, order).catch(e => console.error("[ORDER] Analytics error:", e));

      // Response includes breakdown for user confirmation
      res.status(201).json({ 
        order, 
        session: mergedSession,
        breakdown: calculatedBreakdown, // Send breakdown so frontend can display correct amounts
      });
      return;
    } catch (err) {
      console.error("[ORDER] Create error:", err);
      res.status(500).json({ error: "Failed to create order" });
    }
  }
);

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
      const redis = await getRedisClient();
      const lockKey = `lock:confirm:${orderId}`;
      const acquired = await redis.set(lockKey, "1", { NX: true, EX: 30 });
      if (!acquired) {
        res.status(409).json({ error: "Order is already being confirmed" });
        return;
      }

      try {
        // It's an in-memory order!
        const pendingOrder = await getPendingOrder(orderId);
        if (!pendingOrder) {
          res.status(404).json({ error: "Pending order not found" });
          return;
        }

        if (status === "CANCELLED") {
          // Reject it
          await removePendingOrder(orderId);
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
          // OPTIMISTIC EMIT: Tell admin and user instantly that it's confirmed
          const io = getIO();
          io.to(`session:${pendingOrder.sessionId}`).to("admin").emit("order_updated", {
            tempOrderId: orderId, 
            order: { ...pendingOrder, status }, // Use pending data with new status
            sessionId: pendingOrder.sessionId,
            tableId: pendingOrder.tableId,
          });

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
          
          await removePendingOrder(orderId); // remove from Redis
          
          try {
            // Final confirmation emission with real DB IDs
            io.to(`session:${newOrder.sessionId}`).to("admin").emit("order_confirmed", { 
              orderId: newOrder.id, 
              sessionId: newOrder.sessionId,
              tempOrderId: orderId
            });
            
            updateOrderPerformanceMetrics(newOrder.id, status).catch(() => {});
          } catch { /* skip */ }
          res.json(newOrder);
          return;
        }
      } finally {
        await redis.del(lockKey);
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
      
      updateOrderPerformanceMetrics(orderId, status).catch(() => {});
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
      const pendingOrder = await getPendingOrder(orderId);
      if (pendingOrder) {
        await removePendingOrder(orderId);
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
