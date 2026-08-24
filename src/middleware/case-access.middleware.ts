/*import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "./auth.middleware";

import { hasCaseAccess } from "../modules/cases/case-access.service";

export const requireCaseAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // ----------------------------------------------------------
    // 1. Make sure the user is authenticated
    // ----------------------------------------------------------

    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // ----------------------------------------------------------
    // 2. Get case ID from route
    // ----------------------------------------------------------

    const caseId = req.params.caseId;

    if (typeof caseId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID.",
      });
    }

    // ----------------------------------------------------------
    // 3. Check case access
    // ----------------------------------------------------------

    const hasAccess = await hasCaseAccess(
      caseId,
      userId,
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this case.",
      });
    }

    // ----------------------------------------------------------
    // 4. Access granted
    // ----------------------------------------------------------

    next();
  } catch (error) {
    console.error("Case access check error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify case access.",
    });
  }
};*/