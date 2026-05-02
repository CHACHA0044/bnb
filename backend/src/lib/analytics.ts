import { prisma } from "./prisma";

interface AnalyticsOrderItem {
  name: string;
  price: number;
  quantity: number;
  type: string;
}

interface AnalyticsSession {
  id: string;
  tableId: string;
  locationVerified: boolean;
  sessionNumber: number;
}

interface AnalyticsOrder {
  id: string;
  status: string;
  items: AnalyticsOrderItem[];
}

/**
 * Log order items to the AnalyticsLog table.
 * Called after every order creation (both customer and admin).
 */
export async function logOrderAnalytics(
  session: AnalyticsSession,
  order: AnalyticsOrder,
  paymentInfo?: { mode: string; status: string }
): Promise<void> {
  try {
    const now = new Date();
    const date = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // Separate packing charges from regular items
    const packingItem = order.items.find(i => i.name === "Packing Charges");
    const packingCharges = packingItem ? packingItem.price * packingItem.quantity : 0;

    const logs = order.items
      .filter(i => i.name !== "Packing Charges")
      .map(item => ({
        date,
        tableId: session.tableId,
        sessionId: session.id,
        sessionNumber: session.sessionNumber,
        orderId: order.id,
        itemName: item.name,
        quantity: item.quantity,
        basePrice: item.price,
        discountApplied: null as string | null, // Discount info not available at order time
        finalPrice: item.price * item.quantity,
        paymentMode: paymentInfo?.mode || null,
        paymentStatus: paymentInfo?.status || "PENDING",
        orderStatus: order.status,
        orderType: item.type || "DINE_IN",
        packingCharges: 0,
        locationVerified: session.locationVerified,
      }));

    // Add packing charges as a separate log entry if present
    if (packingItem) {
      logs.push({
        date,
        tableId: session.tableId,
        sessionId: session.id,
        sessionNumber: session.sessionNumber,
        orderId: order.id,
        itemName: "Packing Charges",
        quantity: 1,
        basePrice: packingCharges,
        discountApplied: null,
        finalPrice: packingCharges,
        paymentMode: paymentInfo?.mode || null,
        paymentStatus: paymentInfo?.status || "PENDING",
        orderStatus: order.status,
        orderType: "TAKEAWAY",
        packingCharges,
        locationVerified: session.locationVerified,
      });
    }

    if (logs.length > 0) {
      await prisma.analyticsLog.createMany({ data: logs });
      console.log(`[ANALYTICS] Logged ${logs.length} items for order ${order.id}`);
    }
  } catch (err) {
    console.error("[ANALYTICS] Failed to log order analytics:", err);
    // Don't throw — analytics should never block order flow
  }
}

/**
 * Update analytics logs when a payment is confirmed.
 * Sets the payment mode and status for all items in a session.
 */
export async function updateAnalyticsPayment(
  sessionId: string,
  paymentMode: string,
  paymentStatus: string
): Promise<void> {
  try {
    await prisma.analyticsLog.updateMany({
      where: {
        sessionId,
        paymentStatus: { not: "CONFIRMED" } // Don't overwrite already confirmed
      },
      data: {
        paymentMode,
        paymentStatus
      }
    });
    console.log(`[ANALYTICS] Updated payment info for session ${sessionId}`);
  } catch (err) {
    console.error("[ANALYTICS] Failed to update payment analytics:", err);
  }
}
