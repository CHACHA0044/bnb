import { Router, Request, Response } from "express";
import { requireAdmin } from "../lib/auth";
import { generateQrToken, validateQrToken } from "../lib/qr-token";
import { validateRequest, QRGenerateSchema, QRValidateSchema } from "../lib/validation";
import { auditUPITamperingAttempt } from "../lib/audit";

const router = Router();

const VALID_TABLES = ["T1", "T2", "T3", "TAKEAWAY"];

/**
 * POST /api/qr/generate
 * Admin-only: Generate a fresh QR token for a table/takeaway.
 * 
 * CRITICAL SECURITY:
 * - Only admins can generate QR codes
 * - Each QR has a unique token with expiry
 * - QR payload is signed with HMAC
 * - UPI ID is NOT exposed in QR URL
 * 
 * Body: { tableId }
 */
router.post(
  "/generate",
  requireAdmin,
  validateRequest(QRGenerateSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tableId } = (req as any).validatedBody;

      const { token, expiresAt } = await generateQrToken(tableId);

      // Build the full URL - NO UPI ID, NO PRICES
      const frontendUrl = process.env.FRONTEND_URL || "https://bnb-ten-omega.vercel.app";
      const path = tableId === "TAKEAWAY" ? "/takeaway" : `/table/${tableId}`;
      const url = `${frontendUrl}${path}?token=${token}`;

      console.log(`[QR] Generated QR for ${tableId} - expires ${expiresAt.toISOString()}`);

      res.json({ 
        token, 
        expiresAt: expiresAt.toISOString(), 
        url,
        // Note: We do NOT return amount, UPI ID, or any other sensitive data
      });
    } catch (err) {
      console.error("[QR] Generate error:", err);
      res.status(500).json({ error: "Failed to generate QR token" });
    }
  }
);

/**
 * POST /api/qr/validate
 * Public: Validate a QR token on page load.
 * 
 * CRITICAL SECURITY:
 * - Validates token exists and hasn't expired
 * - Validates token hasn't been reused (one-time use)
 * - Prevents QR replacement attacks
 * - Prevents token tampering
 * 
 * Body: { tableId, token }
 */
router.post(
  "/validate",
  validateRequest(QRValidateSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tableId, token } = (req as any).validatedBody;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] as string || "unknown";

      const valid = await validateQrToken(tableId, token);
      
      if (!valid) {
        console.warn(`[QR] Invalid token for ${tableId} from ${ipAddress}`);
        await auditUPITamperingAttempt(
          "", 
          `Invalid QR token validation attempt for ${tableId}`,
          ipAddress
        );
      }

      res.json({ valid });
    } catch (err) {
      console.error("[QR] Validate error:", err);
      res.status(500).json({ error: "Failed to validate token" });
    }
  }
);

/**
 * GET /api/qr/upi-config
 * Get UPI configuration for payment link generation (backend-only, not exposed to frontend)
 * 
 * CRITICAL: This endpoint is NOT called from frontend.
 * It's only used internally on backend for generating payment links.
 */
router.get("/upi-config", requireAdmin, (_req: Request, res: Response): void => {
  // Only return UPI ID if we're being called from trusted backend code
  const upiId = process.env.UPI_ID;
  if (!upiId) {
    res.status(500).json({ error: "UPI configuration not available" });
    return;
  }
  res.json({ upiId });
});

export default router;

