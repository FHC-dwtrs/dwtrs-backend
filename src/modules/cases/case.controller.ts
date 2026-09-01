import type { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import {
  getCases,
  getCaseById,
  createCase,
  updateCase,
  toggleCaseArchive,
} from "./case.service.js";

import {
  createCaseSchema,
  updateCaseSchema,
} from "./case.validation.js";

import { serializeBigInt } from "../../utils/serializeBigInt.js";

// ============================================================
// GET CASES
// ============================================================

export async function getCasesController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const userId = req.user?.sub;

if (!userId) {
  return res.status(401).json({
    success: false,
    message: "Authentication required.",
  });
}
    const cases = await getCases(userId);

    return res.status(200).json({
      success: true,
      data: serializeBigInt(cases),
    });
  } catch (error) {
    console.error("Get cases error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve cases.",
    });
  }
}

// ============================================================
// GET CASE BY ID
// ============================================================
/*
export async function getCaseByIdController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    
    const { caseId } = req.params;

    if (typeof caseId !== "string") {
      return res.status(400).json({
        success: false,
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
      data: serializeBigInt(caseRecord),
    });
  } catch (error) {
    console.error("Get case error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve case.",
    });
  }
}
*/

export async function getCaseByIdController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    // --------------------------------------------------------
    // 1. VALIDATE CASE ID
    // --------------------------------------------------------

    const { caseId } = req.params;

    if (typeof caseId !== "string" || !caseId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID.",
      });
    }

    // --------------------------------------------------------
    // 2. GET CASE
    // --------------------------------------------------------

    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const caseRecord = await getCaseById(caseId, userId);

    // --------------------------------------------------------
    // 3. CASE NOT FOUND
    // --------------------------------------------------------

    if (!caseRecord) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    // --------------------------------------------------------
    // 4. RESPONSE
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      data: serializeBigInt(caseRecord),
    });
  } catch (error) {
    console.error("Get case error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve case.",
    });
  }
}

// ============================================================
// CREATE CASE
// ============================================================

export async function createCaseController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const parsed =
      createCaseSchema.safeParse(req.body);

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
      data: serializeBigInt(caseRecord),
    });
  } catch (error) {
    console.error("Create case error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create case.",
    });
  }
}

// ============================================================
// UPDATE CASE
// ============================================================

export async function updateCaseController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    // --------------------------------------------------------
    // 1. Validate case ID
    // --------------------------------------------------------

    const { caseId } = req.params;

    if (typeof caseId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID",
      });
    }

    // --------------------------------------------------------
    // 2. Validate request body
    // --------------------------------------------------------

    const parsed =
      updateCaseSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid case update data.",
        errors: parsed.error.flatten(),
      });
    }

    // --------------------------------------------------------
    // 3. Authenticate user
    // --------------------------------------------------------

    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // --------------------------------------------------------
    // 4. Update case
    // --------------------------------------------------------

    const updatedCase = await updateCase(
      caseId,
      parsed.data,
      userId,
    );

    return res.status(200).json({
      success: true,
      message: "Case updated successfully.",
      data: serializeBigInt(updatedCase),
    });
  } catch (error) {
    console.error("Update case error:", error);

    if (
      error instanceof Error &&
      error.message === "Case not found"
    ) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update case.",
    });
  }
}

// ============================================================
// ARCHIVE / UNARCHIVE CASE
// ============================================================

export async function toggleCaseArchiveController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    // --------------------------------------------------------
    // 1. VALIDATE CASE ID
    // --------------------------------------------------------

    const { caseId } = req.params;

    if (typeof caseId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID.",
      });
    }

    // --------------------------------------------------------
    // 2. VALIDATE AUTHENTICATED USER
    // --------------------------------------------------------

    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // --------------------------------------------------------
    // 3. VALIDATE REQUEST BODY
    // --------------------------------------------------------

    const { archived } = req.body;

    if (typeof archived !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "The 'archived' field must be a boolean.",
      });
    }

    // --------------------------------------------------------
    // 4. TOGGLE ARCHIVE STATE
    // --------------------------------------------------------

    const updatedCase = await toggleCaseArchive(
      caseId,
      archived,
      userId,
    );

    // --------------------------------------------------------
    // 5. RESPONSE
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: archived
        ? "Case archived successfully."
        : "Case unarchived successfully.",
      data: serializeBigInt(updatedCase),
    });
  } catch (error) {
    console.error(
      "Toggle case archive error:",
      error,
    );

    // --------------------------------------------------------
    // CASE NOT FOUND
    // --------------------------------------------------------

    if (
      error instanceof Error &&
      error.message === "Case not found"
    ) {
      return res.status(404).json({
        success: false,
        message: "Case not found.",
      });
    }

    // --------------------------------------------------------
    // ALREADY IN REQUESTED STATE
    // --------------------------------------------------------

    if (
      error instanceof Error &&
      (
        error.message === "Case is already archived" ||
        error.message === "Case is already unarchived"
      )
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // --------------------------------------------------------
    // NO DECISION
    // --------------------------------------------------------

    if (
      error instanceof Error &&
      error.message ===
        "Case cannot be archived because no decision has been made."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // --------------------------------------------------------
    // NOT APPROVED
    // --------------------------------------------------------

    if (
      error instanceof Error &&
      error.message ===
        "Only approved cases can be archived."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // --------------------------------------------------------
    // SERVER ERROR
    // --------------------------------------------------------

    return res.status(500).json({
      success: false,
      message: "Failed to update case archive status.",
    });
  }
}