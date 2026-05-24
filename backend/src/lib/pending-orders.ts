import { getRedisClient } from "./redis";
import { logger } from "./logger";
import { prisma } from "./prisma";

const PENDING_PREFIX = "pending_order:";
const PENDING_TTL = 60 * 60 * 2; // 2 hours

export async function savePendingOrder(orderId: string, order: any) {
  const redis = await getRedisClient();
  await redis.set(`${PENDING_PREFIX}${orderId}`, JSON.stringify(order), {
    EX: PENDING_TTL
  });
  // DB backup
  await prisma.pendingOrder.upsert({
    where: { id: orderId },
    update: { data: order },
    create: { id: orderId, data: order, sessionId: order.sessionId }
  }).catch(err => console.error("[PENDING] DB backup failed:", err));
}

export async function getPendingOrder(orderId: string) {
  const redis = await getRedisClient();
  const data = await redis.get(`${PENDING_PREFIX}${orderId}`);
  if (data) return JSON.parse(data);
  // Fallback to DB
  const dbRecord = await prisma.pendingOrder.findUnique({ where: { id: orderId } });
  return dbRecord?.data || null;
}

export async function removePendingOrder(orderId: string) {
  const redis = await getRedisClient();
  await redis.del(`${PENDING_PREFIX}${orderId}`);
  await prisma.pendingOrder.delete({ where: { id: orderId } }).catch(() => {});
}

export async function getAllPendingOrders() {
  try {
    const redis = await getRedisClient();
    let keys: string[] = [];
    let cursor = "0";
    
    do {
      const result = await redis.scan(cursor, { MATCH: `${PENDING_PREFIX}*`, COUNT: 100 });
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== "0");

    if (keys.length > 0) {
      // Use MGET for batching instead of repeated GET calls
      const dataList = await redis.mGet(keys);
      return dataList.filter(Boolean).map(data => JSON.parse(data!));
    }
  } catch (err) {
    console.warn("[PENDING] Redis getAllPendingOrders failed, falling back to DB:", err);
  }

  // Fallback to DB
  const dbRecords = await prisma.pendingOrder.findMany();
  return dbRecords.map(r => r.data);
}
