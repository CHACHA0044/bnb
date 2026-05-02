import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const date = new Date().toISOString().split("T")[0];
  
  // Clean up today's logs for testing
  await prisma.analyticsLog.deleteMany({ where: { date } });

  const mockLogs = [
    {
      date,
      tableId: "T1",
      sessionId: "test-session-1",
      sessionNumber: 1,
      orderId: "test-order-1",
      itemName: "Masala Dosa",
      quantity: 2,
      basePrice: 120,
      finalPrice: 240,
      paymentMode: "UPI",
      paymentStatus: "CONFIRMED",
      orderStatus: "SERVED",
      orderType: "DINE_IN",
      packingCharges: 0,
      locationVerified: true,
      timestamp: new Date()
    },
    {
      date,
      tableId: "T2",
      sessionId: "test-session-2",
      sessionNumber: 2,
      orderId: "test-order-2",
      itemName: "Filter Coffee",
      quantity: 3,
      basePrice: 40,
      finalPrice: 120,
      paymentMode: "CASH",
      paymentStatus: "CONFIRMED",
      orderStatus: "SERVED",
      orderType: "DINE_IN",
      packingCharges: 0,
      locationVerified: true,
      timestamp: new Date()
    },
    {
      date,
      tableId: "TAKEAWAY",
      sessionId: "test-session-3",
      sessionNumber: 1,
      orderId: "test-order-3",
      itemName: "Onion Podi Dosa",
      quantity: 1,
      basePrice: 150,
      finalPrice: 150,
      paymentMode: "UPI",
      paymentStatus: "CONFIRMED",
      orderStatus: "SERVED",
      orderType: "TAKEAWAY",
      packingCharges: 10,
      locationVerified: false,
      timestamp: new Date()
    },
    {
      date,
      tableId: "TAKEAWAY",
      sessionId: "test-session-3",
      sessionNumber: 1,
      orderId: "test-order-3",
      itemName: "Packing Charges",
      quantity: 1,
      basePrice: 10,
      finalPrice: 10,
      paymentMode: "UPI",
      paymentStatus: "CONFIRMED",
      orderStatus: "SERVED",
      orderType: "TAKEAWAY",
      packingCharges: 10,
      locationVerified: false,
      timestamp: new Date()
    }
  ];

  await prisma.analyticsLog.createMany({ data: mockLogs });
  console.log("Mock analytics data created for today!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
