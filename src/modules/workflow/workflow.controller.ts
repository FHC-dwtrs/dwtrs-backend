import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { assignCase, makeCaseDecision, returnCase } from "./workflow.service";
import { assignCaseSchema, caseDecisionSchema, returnCaseSchema } from "./workflow.validation";

export async function assignCaseController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { caseId } = req.params;

    if (typeof caseId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID.",
      });
    }

    if (!req.user?.sub) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    const parsed = assignCaseSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment data.",
        errors: parsed.error.flatten(),
      });
    }

    const result = await assignCase(
      caseId,
      req.user.sub,
      parsed.data,
    );

    return res.status(200).json({
      success: true,
      message: "Case assigned successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Assign case error:", error);

    if (error instanceof Error) {
      const knownErrors = [
        "Case not found.",
        "Destination organizational unit not found.",
        "Destination organizational unit is inactive.",
        "Assigning user not found.",
        "Assigning user is inactive.",
        "Case is already assigned to this organizational unit.",
      ];

      if (knownErrors.includes(error.message)) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to assign case.",
    });
  }
}


// ============================================================
// SECTOR DECISION CONTROLLER
// ============================================================

export async function makeCaseDecisionController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { caseId } = req.params;

    if (typeof caseId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID.",
      });
    }

    if (!req.user?.sub) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    const parsed = caseDecisionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid decision data.",
        errors: parsed.error.flatten(),
      });
    }

    const result = await makeCaseDecision(
      caseId,
      req.user.sub,
      parsed.data,
    );

    return res.status(200).json({
      success: true,
      message:
        parsed.data.decisionType === "APPROVED"
          ? "Case approved successfully."
          : "Case rejected successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Case decision error:", error);

    if (error instanceof Error) {
      const knownErrors = [
        "Case not found.",
        "Decision-making user not found.",
        "Decision-making user is inactive.",
        "Decision-making user is not assigned to an organizational unit.",
        "Only Sector users can approve or reject cases.",
        "You can only make a decision on cases currently held by your organizational unit.",
        "A final decision has already been made for this case.",
      ];

      if (knownErrors.includes(error.message)) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to process case decision.",
    });
  }
}


//return controller
export async function returnCaseController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { caseId } = req.params;

    if (typeof caseId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID.",
      });
    }

    if (!req.user?.sub) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    const parsed = returnCaseSchema.safeParse(
      req.body,
    );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid return data.",
        errors: parsed.error.flatten(),
      });
    }

    const result = await returnCase(
      caseId,
      req.user.sub,
      parsed.data,
    );

    return res.status(200).json({
      success: true,
      message: "Case returned successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Return case error:", error);

    if (error instanceof Error) {
      const knownErrors = [
        "Case not found.",
        "Returning user not found.",
        "Returning user is inactive.",
        "You can only return cases currently held by your organizational unit.",
        "Case has no current organizational unit.",
        "Current organizational unit not found.",
        "No previous organizational unit found for this case.",
        "Case cannot be returned because there is no previous organizational unit.",
        "Previous organizational unit not found.",
        "Previous organizational unit is inactive.",
      ];

      if (
        knownErrors.includes(error.message) ||
        error.message.startsWith("Invalid return route:")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to return case.",
    });
  }
}