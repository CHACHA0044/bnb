import { prisma } from "./prisma";

export async function getNextSessionNumber(): Promise<number> {
  const now = new Date();
  let startOfBusinessDay = new Date(now);
  startOfBusinessDay.setHours(16, 0, 0, 0); // 4 PM start

  if (now < startOfBusinessDay) {
    // If it's before 4 PM, it belongs to the previous day's business cycle
    startOfBusinessDay.setDate(startOfBusinessDay.getDate() - 1);
  }

  const count = await prisma.session.count({
    where: {
      createdAt: {
        gte: startOfBusinessDay
      }
    }
  });

  return count + 1;
}
