import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import {
  getCases,
  getCaseById,
  createCase,
} from "./case.service";
import { createCaseSchema } from "./case.validation";

export async function getCasesController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const cases = await getCases();

    return res.status(200).json({
      success: true,
      data: cases,
    });
  } catch (error) {
    console.error("Get cases error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve cases.",
    });
  }
}

export async function getCaseByIdController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { caseId } = req.params;

    if (typeof caseId !== "string") {
        return res.status(400).json({
          message: "Invalid case ID",
        });
      }

    const caseRecord = await getCaseById(caseId);

    if (!caseRecord) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: caseRecord,
    });
  } catch (error) {
    console.error("Get case error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve case.",
    });
  }
}

export async function createCaseController(
    req: AuthenticatedRequest,
    res: Response,
  ) {
    try {
      const parsed = createCaseSchema.safeParse(req.body);
  
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid case data.",
          errors: parsed.error.flatten(),
        });
      }
  
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }
  
      const caseRecord = await createCase(
        parsed.data,
        req.user.sub,
      );
  
      return res.status(201).json({
        success: true,
        message: "Case created successfully.",
        data: caseRecord,
      });
    } catch (error) {
      console.error("Create case error:", error);
  
      return res.status(500).json({
        success: false,
        message: "Failed to create case.",
      });
    }
  }