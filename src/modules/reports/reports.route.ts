import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/authorize.js";

import {
  caseSummaryController,
  casesByUnitController,
  workflowReportController,
  pendingCasesController,
  periodStatisticsController,
} from "./reports.controller.js";

const router = Router();

// ============================================================
// CASE SUMMARY
// ============================================================

/**
 * @swagger
 * /reports/summary:
 *   get:
 *     summary: Get case summary
 *     description: Retrieve a summary of cases using optional filters.
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/dateFrom'
 *       - $ref: '#/components/parameters/dateTo'
 *       - $ref: '#/components/parameters/unitId'
 *       - $ref: '#/components/parameters/unitType'
 *       - $ref: '#/components/parameters/status'
 *     responses:
 *       200:
 *         description: Case summary retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to generate case summary
 */
router.get(
  "/summary",
  authenticate,
  authorize("REPORT_VIEW"),
  caseSummaryController,
);

// ============================================================
// CASES BY ORGANIZATIONAL UNIT
// ============================================================

/**
 * @swagger
 * /reports/by-unit:
 *   get:
 *     summary: Get cases by organizational unit
 *     description: Retrieve case statistics grouped by organizational unit.
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/dateFrom'
 *       - $ref: '#/components/parameters/dateTo'
 *       - $ref: '#/components/parameters/unitId'
 *       - $ref: '#/components/parameters/unitType'
 *       - $ref: '#/components/parameters/status'
 *     responses:
 *       200:
 *         description: Cases by organizational unit retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to generate organizational unit report
 */
router.get(
  "/by-unit",
  authenticate,
  authorize("REPORT_VIEW"),
  casesByUnitController,
);

// ============================================================
// WORKFLOW / CASE MOVEMENT
// ============================================================

/**
 * @swagger
 * /reports/workflow:
 *   get:
 *     summary: Get workflow report
 *     description: Retrieve case workflow and movement statistics.
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/dateFrom'
 *       - $ref: '#/components/parameters/dateTo'
 *       - $ref: '#/components/parameters/unitId'
 *       - $ref: '#/components/parameters/unitType'
 *       - $ref: '#/components/parameters/status'
 *     responses:
 *       200:
 *         description: Workflow report retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to generate workflow report
 */
router.get(
  "/workflow",
  authenticate,
  authorize("REPORT_VIEW"),
  workflowReportController,
);

// ============================================================
// PENDING / DELAYED CASES
// ============================================================

/**
 * @swagger
 * /reports/pending:
 *   get:
 *     summary: Get pending cases
 *     description: Retrieve pending or delayed cases using optional filters.
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/dateFrom'
 *       - $ref: '#/components/parameters/dateTo'
 *       - $ref: '#/components/parameters/unitId'
 *       - $ref: '#/components/parameters/unitType'
 *       - $ref: '#/components/parameters/status'
 *     responses:
 *       200:
 *         description: Pending cases retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to retrieve pending cases
 */
router.get(
  "/pending",
  authenticate,
  authorize("REPORT_VIEW"),
  pendingCasesController,
);

// ============================================================
// DAILY / WEEKLY / MONTHLY / ANNUAL
// ============================================================

/**
 * @swagger
 * /reports/statistics:
 *   get:
 *     summary: Get period statistics
 *     description: Retrieve daily, weekly, monthly, or annual case statistics.
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/dateFrom'
 *       - $ref: '#/components/parameters/dateTo'
 *       - $ref: '#/components/parameters/unitId'
 *       - $ref: '#/components/parameters/unitType'
 *       - $ref: '#/components/parameters/status'
 *       - in: query
 *         name: period
 *         required: false
 *         description: Reporting period. Defaults to MONTHLY.
 *         schema:
 *           type: string
 *           enum:
 *             - DAILY
 *             - WEEKLY
 *             - MONTHLY
 *             - ANNUAL
 *           default: MONTHLY
 *         example: MONTHLY
 *     responses:
 *       200:
 *         description: Period statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to generate period statistics
 */
router.get(
  "/statistics",
  authenticate,
  authorize("REPORT_VIEW"),
  periodStatisticsController,
);

export default router;