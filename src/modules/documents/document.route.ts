import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize";
import { uploadDocument } from "../../config/upload";
//import { requireCaseAccess } from "../../middleware/case-access.middleware";

import {
  createDocumentController,
  deleteDocumentController,
  getDocumentController,
  getDocumentsByCaseController,
  updateDocumentController,
} from "./document.controller";

import {
  createAttachmentController,
  deleteAttachmentController,
  getAttachmentController,
  getAttachmentsByDocumentController,
  updateAttachmentController,
} from "./attachment.controller";
import { requireRecordsArchive } from "../../middleware/requireRecordsArchive";

const router = Router();

// ============================================================
// DOCUMENTS
// ============================================================

// ------------------------------------------------------------
// UPLOAD DOCUMENT
// ------------------------------------------------------------

router.post(
  "/cases/:caseId/documents",
  authenticate,
  requireRecordsArchive,
  authorize("DOCUMENT_CREATE"),
  
  uploadDocument.single("file"),
  createDocumentController,
);

// ------------------------------------------------------------
// GET DOCUMENTS BY CASE
// ------------------------------------------------------------

router.get(
  "/cases/:caseId/documents",
  authenticate,
 // requireCaseAccess,
  getDocumentsByCaseController,
);

// ------------------------------------------------------------
// VIEW / DOWNLOAD DOCUMENT
// ------------------------------------------------------------

router.get(
  "/cases/:caseId/documents/:documentId",
  authenticate,
  //requireCaseAccess,
  getDocumentController,
);

// ============================================================
// UPDATE DOCUMENT
// ============================================================

router.patch(
  "/cases/:caseId/documents/:documentId",
  authenticate,
  authorize("DOCUMENT_UPDATE"),
  uploadDocument.single("file"),
  updateDocumentController,
);

// ------------------------------------------------------------
// DELETE DOCUMENT
// ------------------------------------------------------------

router.delete(
  "/cases/:caseId/documents/:documentId",
  authenticate,
  //requireCaseAccess,
  authorize("DOCUMENT_DELETE"),
  deleteDocumentController,
);

// ============================================================
// ATTACHMENTS
// ============================================================

// ------------------------------------------------------------
// UPLOAD ATTACHMENT
// ------------------------------------------------------------

router.post(
  "/cases/:caseId/documents/:documentId/attachments",
  authenticate,
  //requireCaseAccess,
  requireRecordsArchive,
  authorize("ATTACHMENT_UPLOAD"),
 
  uploadDocument.single("file"),
  createAttachmentController,
);

// ------------------------------------------------------------
// LIST ATTACHMENTS
// ------------------------------------------------------------

router.get(
  "/cases/:caseId/documents/:documentId/attachments",
  authenticate,
  //requireCaseAccess,
  getAttachmentsByDocumentController,
);

// ------------------------------------------------------------
// VIEW / DOWNLOAD ATTACHMENT
// ------------------------------------------------------------

router.get(
  "/cases/:caseId/documents/:documentId/attachments/:attachmentId",
  authenticate,
  //requireCaseAccess,
  getAttachmentController,
);


// ============================================================
// UPDATE / REPLACE ATTACHMENT
// ============================================================

router.patch(
  "/cases/:caseId/documents/:documentId/attachments/:attachmentId",
  authenticate,
  authorize("ATTACHMENT_UPDATE"),
  uploadDocument.single("file"),
  updateAttachmentController,
);

// ============================================================
// DELETE ATTACHMENT
// ============================================================

router.delete(
  "/cases/:caseId/documents/:documentId/attachments/:attachmentId",
  authenticate,
  //requireCaseAccess,
  authorize("ATTACHMENT_DELETE"),
  deleteAttachmentController,
);



export default router;