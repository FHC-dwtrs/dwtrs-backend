import type { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware";

import {
  getCaseSummary,
  getCasesByOrganizationalUnit,
  getWorkflowReport,
  getPendingCases,
  getPeriodStatistics,
} from "./reports.service";

import {
  reportFilterSchema,
} from "./reports.validation";

// ============================================================
// CASE SUMMARY
// ============================================================

export async function caseSummaryController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const parsed =
      reportFilterSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid report filters.",
        errors: parsed.error.flatten(),
      });
    }

    const result =
      await getCaseSummary(parsed.data);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Case summary report error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate case summary report.",
    });
  }
}

// ============================================================
// CASES BY ORGANIZATIONAL UNIT
// ============================================================

export async function casesByUnitController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const parsed =
      reportFilterSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid report filters.",
        errors: parsed.error.flatten(),
      });
    }

    const result =
      await getCasesByOrganizationalUnit(
        parsed.data,
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Cases by unit report error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate organizational unit report.",
    });
  }
}

// ============================================================
// WORKFLOW REPORT
// ============================================================

export async function workflowReportController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const parsed =
      reportFilterSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid report filters.",
        errors: parsed.error.flatten(),
      });
    }

    const result =
      await getWorkflowReport(parsed.data);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Workflow report error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate workflow report.",
    });
  }
}

// ============================================================
// PENDING CASES
// ============================================================

export async function pendingCasesController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const parsed =
      reportFilterSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid report filters.",
        errors: parsed.error.flatten(),
      });
    }

    const result =
      await getPendingCases(parsed.data);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Pending cases report error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate pending cases report.",
    });
  }
}

// ============================================================
// PERIOD STATISTICS
// ============================================================

export async function periodStatisticsController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const parsed =
      reportFilterSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid report filters.",
        errors: parsed.error.flatten(),
      });
    }

    const result =
      await getPeriodStatistics(parsed.data);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Period statistics report error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate period statistics.",
    });
  }
}