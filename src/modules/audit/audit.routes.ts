import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize";

import {
  getAuditLogsController,
  getAuditLogByIdController,
} from "./audit.controller";

const router = Router();

// ============================================================
// GET AUDIT LOGS
// ============================================================

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Get audit logs
 *     description: Retrieve system audit logs. Access requires AUDIT_VIEW permission.
 *     tags:
 *       - Audit
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to retrieve audit logs
 */
router.get(
  "/",
  authenticate,
  authorize("AUDIT_VIEW"),
  getAuditLogsController,
);

// ============================================================
// GET SINGLE AUDIT LOG
// ============================================================

/**
 * @swagger
 * /audit/{auditLogId}:
 *   get:
 *     summary: Get audit log by ID
 *     description: Retrieve a single audit log entry.
 *     tags:
 *       - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auditLogId
 *         required: true
 *         description: Audit log ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Audit log retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Audit log not found
 *       500:
 *         description: Failed to retrieve audit log
 */
router.get(
  "/:auditLogId",
  authenticate,
  authorize("AUDIT_VIEW"),
  getAuditLogByIdController,
);

export default router;