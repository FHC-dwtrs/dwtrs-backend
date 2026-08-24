import { Response } from "express";
import multer from "multer";

import { AuthenticatedRequest } from "../../middleware/auth.middleware";

import { createAttachment, deleteAttachment, getAttachmentFile, getAttachmentsByDocument } from "./attachment.service";

export const createAttachmentController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    // ----------------------------------------------------------
    // 1. Validate document ID
    // ----------------------------------------------------------

    const documentId = req.params.documentId;

    if (typeof documentId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    // ----------------------------------------------------------
    // 2. Make sure file was uploaded
    // ----------------------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Attachment file is required",
      });
    }

    // ----------------------------------------------------------
    // 3. Get authenticated user
    // ----------------------------------------------------------

    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ----------------------------------------------------------
    // 4. Create attachment
    // ----------------------------------------------------------

    const attachment = await createAttachment({
      documentId,
      file: req.file,
      uploadedBy: userId,
    });

    return res.status(201).json({
      success: true,
      message: "Attachment uploaded successfully",
      data: {
        ...attachment,
        fileSize: attachment.fileSize.toString(),
      },
    });
  } catch (error) {
    console.error("Create attachment error:", error);

    // ----------------------------------------------------------
    // Multer errors
    // ----------------------------------------------------------

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size must not exceed 10 MB",
        });
      }

      return res.status(400).json({
        success: false,
        message: `File upload error: ${error.message}`,
      });
    }

    // ----------------------------------------------------------
    // Invalid file type
    // ----------------------------------------------------------

    if (
      error instanceof Error &&
      error.message ===
        "Only PDF, JPEG, and PNG files are allowed."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // ----------------------------------------------------------
    // Document not found
    // ----------------------------------------------------------

    if (
      error instanceof Error &&
      error.message === "Document not found"
    ) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // ----------------------------------------------------------
    // Unexpected error
    // ----------------------------------------------------------

    return res.status(500).json({
      success: false,
      message: "Failed to upload attachment",
    });
  }
};


/////////////

export const getAttachmentsByDocumentController = async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    try {
      // ----------------------------------------------------------
      // 1. Get route parameters
      // ----------------------------------------------------------
  
      const caseId = req.params.caseId;
      const documentId = req.params.documentId;
  
      // ----------------------------------------------------------
      // 2. Validate route parameters
      // ----------------------------------------------------------
  
      if (
        typeof caseId !== "string" ||
        typeof documentId !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID or document ID",
        });
      }
  
      // ----------------------------------------------------------
      // 3. Get attachments
      // ----------------------------------------------------------
  
      const attachments = await getAttachmentsByDocument(
        caseId,
        documentId,
      );
  
      // ----------------------------------------------------------
      // 4. Return attachments
      // ----------------------------------------------------------
  
      return res.status(200).json({
        success: true,
        message: "Attachments retrieved successfully",
        data: attachments.map((attachment) => ({
          ...attachment,
          fileSize: attachment.fileSize.toString(),
        })),
      });
    } catch (error) {
      console.error(
        "Get attachments by document error:",
        error,
      );
  
      // ----------------------------------------------------------
      // Document not found
      // ----------------------------------------------------------
  
      if (
        error instanceof Error &&
        error.message === "Document not found"
      ) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }
  
      // ----------------------------------------------------------
      // Unexpected error
      // ----------------------------------------------------------
  
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve attachments",
      });
    }
  };


  // ============================================================
// VIEW / DOWNLOAD ATTACHMENT
// ============================================================

export const getAttachmentController = async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    try {
      const {
        caseId,
        documentId,
        attachmentId,
      } = req.params;
  
      // ----------------------------------------------------------
      // 1. Validate route parameters
      // ----------------------------------------------------------
  
      if (
        typeof caseId !== "string" ||
        typeof documentId !== "string" ||
        typeof attachmentId !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid case ID, document ID, or attachment ID",
        });
      }
  
      // ----------------------------------------------------------
      // 2. Get attachment file
      // ----------------------------------------------------------
  
      const { attachment, filePath } =
        await getAttachmentFile(
          caseId,
          documentId,
          attachmentId,
        );
  
      // ----------------------------------------------------------
      // 3. Set response headers
      // ----------------------------------------------------------
  
      res.setHeader(
        "Content-Type",
        attachment.mimeType,
      );
  
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(
          attachment.fileName,
        )}"`,
      );
  
      // ----------------------------------------------------------
      // 4. Send file
      // ----------------------------------------------------------
  
      return res.sendFile(filePath);
    } catch (error) {
      console.error("Get attachment error:", error);
  
      if (
        error instanceof Error &&
        error.message === "Attachment not found"
      ) {
        return res.status(404).json({
          success: false,
          message: "Attachment not found",
        });
      }
  
      if (
        error instanceof Error &&
        error.message === "Attachment file not found"
      ) {
        return res.status(404).json({
          success: false,
          message: "Attachment file not found",
        });
      }
  
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve attachment",
      });
    }
  };


  // ============================================================
// DELETE ATTACHMENT
// ============================================================

export const deleteAttachmentController = async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    try {
      const {
        caseId,
        documentId,
        attachmentId,
      } = req.params;
  
      // ----------------------------------------------------------
      // 1. Validate route parameters
      // ----------------------------------------------------------
  
      if (
        typeof caseId !== "string" ||
        typeof documentId !== "string" ||
        typeof attachmentId !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid case ID, document ID, or attachment ID",
        });
      }
  
      // ----------------------------------------------------------
      // 2. Validate deletion reason
      // ----------------------------------------------------------
  
      const deletionReason =
        typeof req.body.deletionReason === "string"
          ? req.body.deletionReason.trim()
          : "";
  
      if (!deletionReason) {
        return res.status(400).json({
          success: false,
          message: "Deletion reason is required",
        });
      }
  
      if (deletionReason.length > 1000) {
        return res.status(400).json({
          success: false,
          message:
            "Deletion reason must not exceed 1000 characters",
        });
      }
  
      // ----------------------------------------------------------
      // 3. Get authenticated user
      // ----------------------------------------------------------
  
      const userId = req.user?.sub;
  
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }
  
      // ----------------------------------------------------------
      // 4. Soft delete attachment
      // ----------------------------------------------------------
  
      const attachment = await deleteAttachment(
        caseId,
        documentId,
        attachmentId,
        userId,
        deletionReason,
      );
  
      // ----------------------------------------------------------
      // 5. Return success
      // ----------------------------------------------------------
  
      return res.status(200).json({
        success: true,
        message: "Attachment removed successfully",
        data: {
          attachmentId: attachment.attachmentId,
          deletedAt: attachment.deletedAt,
          deletedBy: attachment.deletedBy,
          deletionReason: attachment.deletionReason,
        },
      });
    } catch (error) {
      console.error(
        "Delete attachment error:",
        error,
      );
  
      if (
        error instanceof Error &&
        error.message === "Attachment not found"
      ) {
        return res.status(404).json({
          success: false,
          message: "Attachment not found",
        });
      }
  
      if (
        error instanceof Error &&
        error.message === "Attachment already deleted"
      ) {
        return res.status(409).json({
          success: false,
          message: "Attachment already deleted",
        });
      }
  
      return res.status(500).json({
        success: false,
        message: "Failed to remove attachment",
      });
    }
  };