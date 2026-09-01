import type { Response, Request } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import {
  assignCase,
  makeCaseDecision,
  returnCase,
  transferCase,
  reassignCase,
  getPreviouslyHandledCases,
} from "./workflow.service.js";

import {
  assignCaseSchema,
  caseDecisionSchema,
  returnCaseSchema,
  transferCaseSchema,
  reassignCaseSchema,
} from "./workflow.validation.js";

// ============================================================
// ASSIGN CASE CONTROLLER
// ============================================================

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
        "Case has no current organizational unit.",
        "Current organizational unit not found.",
        "Destination organizational unit not found.",
        "Destination organizational unit is inactive.",
        "Assigning user not found.",
        "Assigning user is inactive.",
        "You can only assign cases currently held by your organizational unit.",
        "Case is already assigned to this organizational unit.",
      ];

      if (
        knownErrors.includes(error.message) ||
        error.message.startsWith("Invalid assignment route:") ||
        error.message.startsWith(
          "This case was returned from",
        )
      ) {
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
// RETURN CASE CONTROLLER
// ============================================================

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

    const parsed = returnCaseSchema.safeParse(req.body);

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
        "Case has no current organizational unit.",
        "Returning user not found.",
        "Returning user is inactive.",
        "Returning user is not assigned to an organizational unit.",
        "You can only return cases currently held by your organizational unit.",
        "Only Group, Directorate, and Sector users can return cases.",
        "Parent organizational unit not found.",
        "Parent organizational unit is inactive.",
        "This organizational unit has no parent unit and cannot return the case.",
        "Case is already assigned to the parent organizational unit.",
        "Records & Archive organizational unit not found.",
        "Records & Archive organizational unit is inactive.",
        "Case is already assigned to Records & Archive.",
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

// ============================================================
// REASSIGN CASE CONTROLLER
// ============================================================

export async function reassignCaseController(
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

    const parsed = reassignCaseSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid reassignment data.",
        errors: parsed.error.flatten(),
      });
    }

    const result = await reassignCase(
      caseId,
      req.user.sub,
      parsed.data,
    );

    return res.status(200).json({
      success: true,
      message: "Case reassigned successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Reassign case error:", error);

    if (error instanceof Error) {
      const knownErrors = [
        "Case not found.",
        "Case has no current organizational unit.",
        "Reassigning user not found.",
        "Reassigning user is inactive.",
        "Reassigning user is not assigned to an organizational unit.",
        "You can only reassign cases currently held by your organizational unit.",
        "Destination organizational unit not found.",
        "Destination organizational unit is inactive.",
        "Case is already held by this organizational unit.",
        "No previous workflow history found for this case.",
        "Case cannot be reassigned because no previous unit was found.",
        "Case cannot be reassigned because it was not previously assigned to the destination unit.",
        "Invalid reassignment destination. A case can only be reassigned to the same organizational unit that previously returned it.",
      ];

      if (
        knownErrors.includes(error.message) ||
        error.message.startsWith("Invalid reassignment route:")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to reassign case.",
    });
  }
}

// ============================================================
// TRANSFER CASE CONTROLLER
// ============================================================

export async function transferCaseController(
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

    const parsed = transferCaseSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid transfer data.",
        errors: parsed.error.flatten(),
      });
    }

    const result = await transferCase(
      caseId,
      req.user.sub,
      parsed.data,
    );

    return res.status(200).json({
      success: true,
      message: "Case transferred successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Transfer case error:", error);

    if (error instanceof Error) {
      const knownErrors = [
        "Case not found.",
        "Case has no current organizational unit.",
        "Transferring user not found.",
        "Transferring user is inactive.",
        "Transferring user is not assigned to an organizational unit.",
        "You can only transfer cases currently held by your organizational unit.",
        "Only Directorate users can transfer cases.",
        "Destination organizational unit not found.",
        "Destination organizational unit is inactive.",
        "Transfer is only allowed from one Directorate to another Directorate.",
        "A case cannot be transferred to the same Directorate.",
        "Current Directorate is not assigned to a Sector.",
        "Destination Directorate is not assigned to a Sector.",
        "A case can only be transferred between Directorates within the same Sector.",
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
      message: "Failed to transfer case.",
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
        "Case is already finalized.",
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


// ============================================================
// PREVIOUSLY HANDLED CASES CONTROLLER
// ============================================================

interface ExtendedRequest extends Request {
  user?: {
    userId: string;
  };
}

export async function getPreviouslyHandledCasesController(
  req: ExtendedRequest,
  res: Response
) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await getPreviouslyHandledCases(userId);

    return res.status(200).json({
      success: true,
      message: "Previously handled cases retrieved successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Get previously handled cases error:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to retrieve previously handled cases.",
    });
  }
}