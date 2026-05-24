import crypto from "crypto";
import { prisma } from "./prisma";
import { getRedisClient } from "./redis";

const TOKEN_EXPIRY_MINUTES = 15;
const REDIS_TOKEN_PREFIX = "qr_token:";

/**
 * Generate a secure, time-limited QR token for a table/takeaway.
 */
export async function generateQrToken(tableId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  // Store in DB
  await prisma.qrToken.create({
    data: { tableId, token, expiresAt }
  });

  // Store in Redis for fast validation
  const redis = await getRedisClient();
  await redis.set(`${REDIS_TOKEN_PREFIX}${token}`, tableId, {
    EX: TOKEN_EXPIRY_MINUTES * 60
  });

  return { token, expiresAt };
}

/**
 * Validate a QR token.
 */
export async function validateQrToken(tableId: string, token: string): Promise<boolean> {
  const redis = await getRedisClient();
  const cachedTableId = await redis.get(`${REDIS_TOKEN_PREFIX}${token}`);

  if (cachedTableId) {
    return cachedTableId === tableId;
  }

  // Fallback to DB if Redis missed (shouldn't happen often if synced)
  const record = await prisma.qrToken.findUnique({ where: { token } });
  if (!record) return false;
  if (record.tableId !== tableId) return false;
  if (record.expiresAt < new Date()) return false;

  // Re-cache in Redis if found in DB
  const ttl = Math.floor((record.expiresAt.getTime() - Date.now()) / 1000);
  if (ttl > 0) {
    await redis.set(`${REDIS_TOKEN_PREFIX}${token}`, tableId, { EX: ttl });
  }

  return true;
}

/**
 * Check if a table has any valid token.
 */
export async function hasActiveToken(tableId: string): Promise<boolean> {
  // Since we don't have a reverse lookup (tableId -> tokens) in Redis easily 
  // without a SET per table, we'll keep the DB check for this specific admin-only call 
  // or implement a Redis SET. Given the usage, DB count is fine for now.
  const count = await prisma.qrToken.count({
    where: {
      tableId,
      expiresAt: { gt: new Date() },
      used: true
    }
  });
  return count > 0;
}
