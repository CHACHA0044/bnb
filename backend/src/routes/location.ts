import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { isWithinRestaurant } from "../lib/geo";
import { getIO } from "../lib/socket";

const router = Router();

/**
 * POST /api/location/verify
 * Verify user's location against restaurant coordinates.
 * Body: { latitude, longitude, sessionId }
 */
router.post("/verify", async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, sessionId } = req.body as {
      latitude: number;
      longitude: number;
      sessionId: string;
    };

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      res.status(400).json({ error: "latitude and longitude required as numbers" });
      return;
    }

    const { verified, distance } = isWithinRestaurant(latitude, longitude);

    // Update session if sessionId provided
    if (sessionId) {
      try {
        await prisma.session.update({
          where: { id: sessionId },
          data: { locationVerified: verified }
        });

        // Notify admin of verification status
        try {
          const io = getIO();
          io.to("admin").emit("session_updated", { sessionId, locationVerified: verified });
        } catch { /* skip */ }
      } catch (err) {
        console.error("[LOCATION] Failed to update session:", err);
      }
    }

    console.log(`[LOCATION] Verify: ${verified ? "✓" : "✗"} (${distance}m from restaurant)`);

    res.json({ verified, distance });
  } catch (err) {
    console.error("[LOCATION] Verify error:", err);
    res.status(500).json({ error: "Failed to verify location" });
  }
});

export default router;
