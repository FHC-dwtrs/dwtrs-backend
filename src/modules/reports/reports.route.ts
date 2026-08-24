import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize";

import {
  caseSummaryController,
  casesByUnitController,
  workflowReportController,
  pendingCasesController,
  periodStatisticsController,
} from "./reports.controller";

const router = Router();

// ============================================================
// CASE SUMMARY
// ============================================================

router.get(
  "/summary",
  authenticate,
  authorize("REPORT_VIEW"),
  caseSummaryController,
);

// ============================================================
// CASES BY ORGANIZATIONAL UNIT
// ============================================================

router.get(
  "/by-unit",
  authenticate,
  authorize("REPORT_VIEW"),
  casesByUnitController,
);

// ============================================================
// WORKFLOW / CASE MOVEMENT
// ============================================================

router.get(
  "/workflow",
  authenticate,
  authorize("REPORT_VIEW"),
  workflowReportController,
);

// ============================================================
// PENDING / DELAYED CASES
// ============================================================

router.get(
  "/pending",
  authenticate,
  authorize("REPORT_VIEW"),
  pendingCasesController,
);

// ============================================================
// DAILY / WEEKLY / MONTHLY / ANNUAL
// ============================================================

router.get(
  "/statistics",
  authenticate,
  authorize("REPORT_VIEW"),
  periodStatisticsController,
);

export default router;