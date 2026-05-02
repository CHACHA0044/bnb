import { prisma } from "./prisma";

/**
 * Get the next session number for a given context (table or takeaway).
 * Tables share one counter; takeaway has its own (TW1, TW2, etc.).
 * Resets daily at 4 PM (business day start).
 */
export async function getNextSessionNumber(tableId?: string): Promise<number> {
  const now = new Date();
  let startOfBusinessDay = new Date(now);
  startOfBusinessDay.setHours(16, 0, 0, 0); // 4 PM start

  if (now < startOfBusinessDay) {
    // If it's before 4 PM, it belongs to the previous day's business cycle
    startOfBusinessDay.setDate(startOfBusinessDay.getDate() - 1);
  }

  const isTakeaway = tableId === "TAKEAWAY";

  const count = await prisma.session.count({
    where: {
      createdAt: {
        gte: startOfBusinessDay
      },
      ...(isTakeaway
        ? { tableId: "TAKEAWAY" }
        : { tableId: { not: "TAKEAWAY" } }
      )
    }
  });

  return count + 1;
}
