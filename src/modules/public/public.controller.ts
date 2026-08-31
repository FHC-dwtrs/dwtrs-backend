import type { Request, Response } from "express";
import { trackCase } from "./public.service.js";

export async function trackCaseController(
  req: Request,
  res: Response,
) {
  try {
    const { trackingNumber } = req.params;

    if (typeof trackingNumber !== "string" || !trackingNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tracking number is required.",
      });
    }

    const caseRecord = await trackCase(
      trackingNumber.trim(),
    );

    return res.status(200).json({
      success: true,
      data: caseRecord,
    });
  } catch (error) {
    console.error("Track case error:", error);

    if (
      error instanceof Error &&
      error.message === "Case not found."
    ) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to track case.",
    });
  }
}