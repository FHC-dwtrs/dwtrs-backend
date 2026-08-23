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

// CREATE
router.post(
  "/",
  authenticate,
  authorize("DOCUMENT_CREATE"),
  createDocumentController,
);

// GET ONE
router.get(
  "/:documentId",
  authenticate,
  authorize("DOCUMENT_VIEW"),
  getDocumentByIdController,
);

// GET CASE DOCUMENTS
router.get(
  "/case/:caseId",
  authenticate,
  authorize("DOCUMENT_VIEW"),
  getDocumentsByCaseController,
);

// UPDATE
router.patch(
  "/:documentId",
  authenticate,
  authorize("DOCUMENT_UPDATE"),
  updateDocumentController,
);

// DELETE
router.delete(
  "/:documentId",
  authenticate,
  authorize("DOCUMENT_DELETE"),
  deleteDocumentController,
);

export default router;