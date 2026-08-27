import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize";
import { uploadDocument } from "../../config/upload";

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

/**
 * @swagger
 * /cases/{caseId}/documents:
 *   post:
 *     summary: Upload a document
 *     description: Upload a document to a case. This operation is restricted to Records & Archive personnel.
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         description: Case ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - documentType
 *               - title
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Document file
 *               documentType:
 *                 type: string
 *                 maxLength: 100
 *                 example: Application Form
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 example: Housing Application
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *       400:
 *         description: Invalid document data or file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 *       500:
 *         description: Failed to upload document
 */
router.post(
  "/cases/:caseId/documents",
  authenticate,
  requireRecordsArchive,
  authorize("DOCUMENT_CREATE"),
  uploadDocument.single("file"),
  createDocumentController,
);

/**
 * @swagger
 * /cases/{caseId}/documents:
 *   get:
 *     summary: Get documents by case
 *     description: Retrieve all documents belonging to a case.
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         description: Case ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Case not found
 *       500:
 *         description: Failed to retrieve documents
 */
router.get(
  "/cases/:caseId/documents",
  authenticate,
  getDocumentsByCaseController,
);

/**
 * @swagger
 * /cases/{caseId}/documents/{documentId}:
 *   get:
 *     summary: View or download a document
 *     description: Retrieve a specific document.
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         description: Case ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 *       500:
 *         description: Failed to retrieve document
 */
router.get(
  "/cases/:caseId/documents/:documentId",
  authenticate,
  getDocumentController,
);

/**
 * @swagger
 * /cases/{caseId}/documents/{documentId}:
 *   patch:
 *     summary: Update a document
 *     description: Update document metadata and optionally replace its file.
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         description: Case ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional replacement document file
 *               documentType:
 *                 type: string
 *                 maxLength: 100
 *                 example: Updated Application Form
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 example: Updated Housing Application
 *     responses:
 *       200:
 *         description: Document updated successfully
 *       400:
 *         description: Invalid document data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 *       500:
 *         description: Failed to update document
 */
router.patch(
  "/cases/:caseId/documents/:documentId",
  authenticate,
  authorize("DOCUMENT_UPDATE"),
  uploadDocument.single("file"),
  updateDocumentController,
);

/**
 * @swagger
 * /cases/{caseId}/documents/{documentId}:
 *   delete:
 *     summary: Delete a document
 *     description: Delete a document from a case.
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         description: Case ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 *       500:
 *         description: Failed to delete document
 */
router.delete(
  "/cases/:caseId/documents/:documentId",
  authenticate,
  authorize("DOCUMENT_DELETE"),
  deleteDocumentController,
);

// ============================================================
// ATTACHMENTS
// ============================================================

/**
 * @swagger
 * /cases/{caseId}/documents/{documentId}/attachments:
 *   post:
 *     summary: Upload an attachment
 *     description: Upload an attachment to an existing document. This operation is restricted to Records & Archive personnel.
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         description: Case ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Attachment file
 *     responses:
 *       201:
 *         description: Attachment uploaded successfully
 *       400:
 *         description: Invalid attachment or file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case or document not found
 *       500:
 *         description: Failed to upload attachment
 */
router.post(
  "/cases/:caseId/documents/:documentId/attachments",
  authenticate,
  requireRecordsArchive,
  authorize("ATTACHMENT_UPLOAD"),
  uploadDocument.single("file"),
  createAttachmentController,
);

/**
 * @swagger
 * /cases/{caseId}/documents/{documentId}/attachments:
 *   get:
 *     summary: Get attachments by document
 *     description: Retrieve all attachments belonging to a document.
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         description: Case ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Attachments retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 *       500:
 *         description: Failed to retrieve attachments
 */
router.get(
  "/cases/:caseId/documents/:documentId/attachments",
  authenticate,
  getAttachmentsByDocumentController,
);

/**
 * @swagger
 * /cases/{caseId}/documents/{documentId}/attachments/{attachmentId}:
 *   get:
 *     summary: View or download an attachment
 *     description: Retrieve a specific attachment.
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         description: Case ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         description: Attachment ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Attachment retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Attachment not found
 *       500:
 *         description: Failed to retrieve attachment
 */
router.get(
  "/cases/:caseId/documents/:documentId/attachments/:attachmentId",
  authenticate,
  getAttachmentController,
);

/**
 * @swagger
 * /cases/{caseId}/documents/{documentId}/attachments/{attachmentId}:
 *   patch:
 *     summary: Update or replace an attachment
 *     description: Replace an existing attachment file.
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         description: Case ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         description: Attachment ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Replacement attachment file
 *     responses:
 *       200:
 *         description: Attachment updated successfully
 *       400:
 *         description: Invalid attachment or file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Attachment not found
 *       500:
 *         description: Failed to update attachment
 */
router.patch(
  "/cases/:caseId/documents/:documentId/attachments/:attachmentId",
  authenticate,
  authorize("ATTACHMENT_UPDATE"),
  uploadDocument.single("file"),
  updateAttachmentController,
);

/**
 * @swagger
 * /cases/{caseId}/documents/{documentId}/attachments/{attachmentId}:
 *   delete:
 *     summary: Delete an attachment
 *     description: Delete an attachment from a document.
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         description: Case ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         description: Attachment ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Attachment deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Attachment not found
 *       500:
 *         description: Failed to delete attachment
 */
router.delete(
  "/cases/:caseId/documents/:documentId/attachments/:attachmentId",
  authenticate,
  authorize("ATTACHMENT_DELETE"),
  deleteAttachmentController,
);

export default router;