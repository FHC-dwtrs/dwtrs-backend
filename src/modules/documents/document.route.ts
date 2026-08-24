import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize";

import { uploadDocument } from "../../config/upload";

import {
  createDocumentController,
  deleteDocumentController,
  getDocumentController,
  getDocumentsByCaseController,
} from "./document.controller";
import { requireCaseAccess } from "../../middleware/case-access.middleware";

const router = Router();

/**
 * Upload a document to a case.
 *
 * Only Records & Archive users with DOCUMENT_UPLOAD
 * permission can perform this action.
 */
router.post(
  "/cases/:caseId/documents",
  authenticate,
  authorize("DOCUMENT_UPLOAD"),
  uploadDocument.single("file"),
  createDocumentController,
);

// ============================================================
// GET DOCUMENTS BY CASE
// ============================================================

/**
 * Any authenticated user who has access to the case
 * can view its documents.
 */
router.get(
  "/cases/:caseId/documents",
  authenticate,
  requireCaseAccess,
  getDocumentsByCaseController,
);
// ============================================================
// VIEW / DOWNLOAD DOCUMENT
// ============================================================

router.get(
  "/cases/:caseId/documents/:documentId",
  authenticate,
  requireCaseAccess,
  getDocumentController,
);


/**
 * Soft delete a document.
 *
 * Only users with DOCUMENT_DELETE permission can
 * remove a document.
 */
router.delete(
  "/cases/:caseId/documents/:documentId",
  authenticate,
  authorize("DOCUMENT_DELETE"),
  deleteDocumentController,
);

export default router;