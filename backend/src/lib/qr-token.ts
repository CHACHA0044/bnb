import crypto from "crypto";
import { prisma } from "./prisma";

const TOKEN_EXPIRY_MINUTES = 15;

/**
 * Generate a secure, time-limited QR token for a table/takeaway.
 * Cleans up expired tokens on each call.
 */
export async function generateQrToken(tableId: string): Promise<{ token: string; expiresAt: Date }> {
  // Clean up expired tokens
  await prisma.qrToken.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await prisma.qrToken.create({
    data: { tableId, token, expiresAt }
  });

  return { token, expiresAt };
}

/**
 * Validate a QR token.
 * Returns true if the token is valid, belongs to the table, and hasn't expired.
 * Does NOT invalidate — allows page refreshes and continued use during session.
 */
export async function validateQrToken(tableId: string, token: string): Promise<boolean> {
  const record = await prisma.qrToken.findUnique({ where: { token } });
  if (!record) return false;
  if (record.tableId !== tableId) return false;
  if (record.expiresAt < new Date()) return false;

  // Mark as used but don't delete — token stays valid until expiry
  if (!record.used) {
    await prisma.qrToken.update({
      where: { token },
      data: { used: true }
    });
  }

  return true;
}

/**
 * Check if a table has any valid (non-expired) token.
 * Used to determine if a session is still accessible.
 */
export async function hasActiveToken(tableId: string): Promise<boolean> {
  const count = await prisma.qrToken.count({
    where: {
      tableId,
      expiresAt: { gt: new Date() },
      used: true
    }
  });
  return count > 0;
}
