import type { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import {
  getAuditLogs,
  getAuditLogById,
} from "./audit.service.js";

import {
  auditLogQuerySchema,
} from "./audit.validation.js";

// ============================================================
// GET AUDIT LOGS
// ============================================================

export async function getAuditLogsController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const parsed = auditLogQuerySchema.safeParse(
      req.query,
    );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid audit log filters.",
        errors: parsed.error.flatten(),
      });
    }

    const result = await getAuditLogs(
      parsed.data,
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error(
      "Get audit logs error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit logs.",
    });
  }
}

// ============================================================
// GET SINGLE AUDIT LOG
// ============================================================

export async function getAuditLogByIdController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { auditLogId } = req.params;

    if (typeof auditLogId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid audit log ID.",
      });
    }

    const auditLog =
      await getAuditLogById(auditLogId);

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: auditLog,
    });
  } catch (error) {
    console.error(
      "Get audit log error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit log.",
    });
  }
}