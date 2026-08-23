import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";

import {
  createDocument,
  getDocumentById,
  getDocumentsByCase,
  updateDocument,
  deleteDocument,
} from "./document.service";


// ============================================================
// CREATE DOCUMENT
// ============================================================

export async function createDocumentController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const result = await createDocument(
      req.user.sub,
      req.body,
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// GET DOCUMENT BY ID
// ============================================================

export async function getDocumentByIdController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const documentId = req.params.documentId as string;

    const result = await getDocumentById(documentId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// GET DOCUMENTS BY CASE
// ============================================================

export async function getDocumentsByCaseController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const caseId = req.params.caseId as string;

    const result = await getDocumentsByCase(caseId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// UPDATE DOCUMENT
// ============================================================

export async function updateDocumentController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const documentId = req.params.documentId as string;

    const result = await updateDocument(
      documentId,
      req.user.sub,
      req.body,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// DELETE DOCUMENT
// ============================================================

export async function deleteDocumentController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const documentId = req.params.documentId as string;

    const result = await deleteDocument(
      documentId,
      req.user.sub,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

