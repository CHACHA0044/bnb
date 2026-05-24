import { prisma } from "./prisma";
import { debouncedUpdateDailySummary } from "./summaries";

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
  packingCharges?: number;
}

interface AnalyticsMetadata {
  deviceType?: string;
  browserName?: string;
  osName?: string;
  adminId?: string;
  adminAction?: boolean;
}

/**
 * Log order items to the AnalyticsLog table.
 * Called after every order creation (both customer and admin).
 */
export async function logOrderAnalytics(
  session: AnalyticsSession,
  order: AnalyticsOrder,
  paymentInfo?: { mode: string; status: string },
  metadata?: AnalyticsMetadata
): Promise<void> {
  try {
    if (order.status === "CANCELLED" || order.status === "REJECTED") {
      return;
    }
    const now = new Date();
    const date = now.toISOString().split("T")[0]; // YYYY-MM-DD

    const logs = order.items
      .filter(i => i.name !== "Packing Charges")
      .map((item: AnalyticsOrderItem, idx: number) => ({
        date,
        tableId: session.tableId,
        sessionId: session.id,
        sessionNumber: session.sessionNumber,
        orderId: order.id,
        itemName: item.name,
        quantity: item.quantity,
        basePrice: item.price,
        discountApplied: null as string | null,
        finalPrice: item.price * item.quantity,
        paymentMode: paymentInfo?.mode || null,
        paymentStatus: paymentInfo?.status || "PENDING",
        orderStatus: order.status,
        orderType: item.type || "DINE_IN",
        packingCharges: idx === 0 ? (order.packingCharges || 0) : 0,
        locationVerified: session.locationVerified,
        // Deep analytics
        deviceType: metadata?.deviceType || null,
        browserName: metadata?.browserName || null,
        osName: metadata?.osName || null,
        adminAction: metadata?.adminAction || false,
        adminId: metadata?.adminId || null,
      }));

    if (logs.length > 0) {
      await prisma.analyticsLog.createMany({ data: logs as any });
      
      // Update summary cache in background
      debouncedUpdateDailySummary(date).catch(() => {});
    }
  } catch (err) {
    console.error("[ANALYTICS] Failed to log order analytics:", err);
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
    
    // Update summary cache
    const date = new Date().toISOString().split("T")[0];
    debouncedUpdateDailySummary(date).catch(() => {});
  } catch (err) {
    console.error("[ANALYTICS] Failed to update payment analytics:", err);
  }
}

/**
 * Update performance metrics for an order.
 * Calculates confirmation time (place -> placed) and preparation time (placed -> served).
 */
export async function updateOrderPerformanceMetrics(
  orderId: string,
  newStatus: string
): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { session: true }
    });
    if (!order) return;

    const timeline = order.statusTimeline as any[];
    if (!timeline || timeline.length === 0) return;

    const placedEvent = timeline.find(t => t.status === "PLACED" || t.status === "PREPARING");
    const servedEvent = timeline.find(t => t.status === "SERVED");
    const createdTime = order.createdAt.getTime();

    let confirmationTime: number | null = null;
    let preparationTime: number | null = null;
    let totalDuration: number | null = null;

    if (placedEvent) {
      confirmationTime = Math.floor((new Date(placedEvent.timestamp).getTime() - createdTime) / 1000);
    }

    if (placedEvent && servedEvent) {
      preparationTime = Math.floor((new Date(servedEvent.timestamp).getTime() - new Date(placedEvent.timestamp).getTime()) / 1000);
      totalDuration = Math.floor((new Date(servedEvent.timestamp).getTime() - createdTime) / 1000);
    }

    await prisma.analyticsLog.updateMany({
      where: { orderId },
      data: {
        orderStatus: newStatus,
        confirmationTime,
        preparationTime,
        totalDuration
      } as any
    });

    const date = order.createdAt.toISOString().split("T")[0];
    debouncedUpdateDailySummary(date).catch(() => {});
  } catch (err) {
    console.error("[ANALYTICS] Failed to update performance metrics:", err);
  }
}

/**
 * Remove analytics logs for a specific order.
 * Called when an order is cancelled, rejected, or deleted.
 */
export async function removeOrderAnalytics(orderId: string): Promise<void> {
  try {
    await prisma.analyticsLog.deleteMany({
      where: { orderId }
    });

    // Update summary cache
    const date = new Date().toISOString().split("T")[0];
    debouncedUpdateDailySummary(date).catch(() => {});
  } catch (err) {
    console.error(`[ANALYTICS] Failed to remove logs for order ${orderId}:`, err);
  }
}
