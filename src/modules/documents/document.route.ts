import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize";

import {
  createDocumentController,
  getDocumentByIdController,
  getDocumentsByCaseController,
  updateDocumentController,
  deleteDocumentController,
} from "./document.controller";

const router = Router();

// ============================================================
// CREATE DOCUMENT
// ============================================================

router.post(
  "/",
  authenticate,
  authorize("DOCUMENT_CREATE"),
  createDocumentController,
);

// ============================================================
// GET DOCUMENTS BY CASE
// IMPORTANT: Must come BEFORE /:documentId
// ============================================================

router.get(
  "/case/:caseId",
  authenticate,
  authorize("DOCUMENT_VIEW"),
  getDocumentsByCaseController,
);




// ============================================================
// GET ONE DOCUMENT
// ============================================================

router.get(
  "/:documentId",
  authenticate,
  authorize("DOCUMENT_VIEW"),
  getDocumentByIdController,
);

// ============================================================
// UPDATE DOCUMENT
// ============================================================

router.patch(
  "/:documentId",
  authenticate,
  authorize("DOCUMENT_UPDATE"),
  updateDocumentController,
);

// ============================================================
// DELETE DOCUMENT
// ============================================================

router.delete(
  "/:documentId",
  authenticate,
  authorize("DOCUMENT_DELETE"),
  deleteDocumentController,
);

export default router;