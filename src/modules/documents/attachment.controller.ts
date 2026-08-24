import { Response } from "express";
import multer from "multer";

import { AuthenticatedRequest } from "../../middleware/auth.middleware";

import { createAttachment } from "./attachment.service";

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
      data: attachment,
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