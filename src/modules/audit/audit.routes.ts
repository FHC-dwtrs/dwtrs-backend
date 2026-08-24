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

router.get(
  "/",
  authenticate,
  authorize("AUDIT_VIEW"),
  getAuditLogsController,
);

// ============================================================
// GET SINGLE AUDIT LOG
// ============================================================

router.get(
  "/:auditLogId",
  authenticate,
  authorize("AUDIT_VIEW"),
  getAuditLogByIdController,
);

export default router;