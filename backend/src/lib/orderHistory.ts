import { prisma } from "./prisma";

/**
 * Capture a complete snapshot of an order and its items.
 * Should be called when an order is completed/served or when the session is closed.
 */
export async function createOrderHistorySnapshot(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        session: true,
        payments: { where: { status: "CONFIRMED" } }
      }
    }) as any;


    if (!order) return null;

    // Calculate totals
    const itemsTotal = order.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const grandTotal = itemsTotal + (order.packingCharges || 0);

    // Prepare consolidated items data
    const itemsData = order.items.map((item: any) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      isServed: item.isServed,
      type: item.type,
      rating: null
    }));

    // Payment Info
    const upiPaid = order.payments.filter((p: any) => p.method === "UPI").reduce((sum: number, p: any) => sum + p.amount, 0);
    const cashPaid = order.payments.filter((p: any) => p.method === "CASH").reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalPaid = upiPaid + cashPaid;

    const data: any = {
      orderId: order.id,
      sessionId: order.sessionId,
      customerDetails: {
        tableId: order.session.tableId,
        sessionNumber: order.session.sessionNumber
      },
      items: itemsData,
      totalAmount: grandTotal,
      taxesAndFees: order.packingCharges || 0,
      paymentMethod: totalPaid > 0 ? (upiPaid >= cashPaid ? "UPI" : "CASH") : null,
      paymentStatus: totalPaid >= grandTotal ? "PAID" : (totalPaid > 0 ? "PARTIAL" : "PENDING"),
      paymentDetails: order.payments.map((p: any) => ({
        method: p.method,
        amount: p.amount,
        reference: p.providerRef || p.id,
        time: p.createdAt
      })),
      orderStatus: order.status,
      timeline: order.statusTimeline || [],
      notes: order.instructions || "",
      createdAt: order.createdAt
    };

    // Use type casting for new model
    await (prisma as any).orderHistoryRecord.upsert({
      where: { orderId: order.id },
      update: data,
      create: data
    });

    console.log(`[HISTORY] Stored snapshot for order ${order.id}`);
    return data;
  } catch (err) {
    console.error(`[HISTORY] Failed to create snapshot for order ${orderId}:`, err);
    return null;
  }
}

/**
 * Update the status timeline for an order.
 * Call this every time an order status changes.
 */
export async function updateOrderStatusTimeline(orderId: string, newStatus: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    }) as any;

    if (!order) return;

    const timeline = Array.isArray(order.statusTimeline) ? order.statusTimeline : [];
    const entry = {
      status: newStatus,
      timestamp: new Date().toISOString()
    };

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        statusTimeline: [...timeline, entry]
      } as any
    });

    // If order is now SERVED or CANCELLED, triggering history snapshot is a good idea
    if (newStatus === "SERVED" || newStatus === "CANCELLED") {
      await createOrderHistorySnapshot(orderId);
    }
  } catch (err) {
    console.error(`[HISTORY] Failed to update timeline for ${orderId}:`, err);
  }
}

