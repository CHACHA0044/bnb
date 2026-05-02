import { Router, Request, Response } from "express";
import { requireAdmin } from "../lib/auth";
import { generateQrToken, validateQrToken } from "../lib/qr-token";

const router = Router();

const VALID_TABLES = ["T1", "T2", "T3", "TAKEAWAY"];

/**
 * POST /api/qr/generate
 * Admin-only: Generate a fresh QR token for a table/takeaway.
 * Body: { tableId }
 */
router.post("/generate", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableId } = req.body as { tableId: string };

    if (!tableId || !VALID_TABLES.includes(tableId)) {
      res.status(400).json({ error: `Invalid tableId. Must be one of: ${VALID_TABLES.join(", ")}` });
      return;
    }

    const { token, expiresAt } = await generateQrToken(tableId);

    // Build the full URL
    const frontendUrl = process.env.FRONTEND_URL || "https://bnb-ten-omega.vercel.app";
    const path = tableId === "TAKEAWAY" ? "/takeaway" : `/table/${tableId}`;
    const url = `${frontendUrl}${path}?token=${token}`;

    res.json({ token, expiresAt: expiresAt.toISOString(), url });
  } catch (err) {
    console.error("[QR] Generate error:", err);
    res.status(500).json({ error: "Failed to generate QR token" });
  }
});

/**
 * POST /api/qr/validate
 * Public: Validate a QR token on page load.
 * Body: { tableId, token }
 */
router.post("/validate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableId, token } = req.body as { tableId: string; token: string };

    if (!tableId || !token) {
      res.status(400).json({ error: "tableId and token required" });
      return;
    }

    const valid = await validateQrToken(tableId, token);
    res.json({ valid });
  } catch (err) {
    console.error("[QR] Validate error:", err);
    res.status(500).json({ error: "Failed to validate token" });
  }
});

export default router;
