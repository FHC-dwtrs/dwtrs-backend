import { Router } from "express";
import { trackCaseController } from "./public.controller.js";

const router = Router();

/**
 * @swagger
 * /public/track/{trackingNumber}:
 *   get:
 *     summary: Track a case publicly
 *     description: Retrieve public case tracking information using a tracking number. Authentication is not required.
 *     tags:
 *       - Public Tracking
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         description: Case tracking number
 *         schema:
 *           type: string
 *         example: FHC-2026-001
 *     responses:
 *       200:
 *         description: Case tracking information retrieved successfully
 *       400:
 *         description: Tracking number is required
 *       404:
 *         description: Case not found
 *       500:
 *         description: Failed to track case
 */
router.get(
  "/track/:trackingNumber",
  trackCaseController,
);

export default router;