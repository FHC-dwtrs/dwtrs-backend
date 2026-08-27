import { Response } from "express";
import multer from "multer";

import { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import {
  createDocument,
  deleteDocument,
  getDocumentFile,
  getDocumentsByCase,
  updateDocument,
} from "./document.service.js";

import {
  createDocumentSchema,
  updateDocumentSchema,
} from "./document.validation.js";

// ============================================================
// CREATE / UPLOAD DOCUMENT
// ============================================================

export const createDocumentController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const caseId = req.params.caseId;

    if (typeof caseId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID",
      });
    }

    const validationResult =
      createDocumentSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid document information",
        errors:
          validationResult.error.flatten()
            .fieldErrors,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Document file is required",
      });
    }

    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const document = await createDocument({
      caseId,
      documentType:
        validationResult.data.documentType,
      title: validationResult.data.title,
      file: req.file,
      uploadedBy: userId,
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: {
        documentId:
          document.documentId,
        caseId: document.caseId,
        documentType:
          document.documentType,
        title: document.title,
        fileName:
          document.fileName,
        storageKey:
          document.storageKey,
        mimeType:
          document.mimeType,
        fileSize:
          document.fileSize.toString(),
        checksum:
          document.checksum,
      },
    });
  } catch (error) {
    console.error(
      "Create document error:",
      error,
    );

    if (
      error instanceof multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "File size must not exceed 10 MB",
        });
      }

      return res.status(400).json({
        success: false,
        message: `File upload error: ${error.message}`,
      });
    }

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
      message: "Failed to upload document",
    });
  }
};

// ============================================================
// GET DOCUMENTS BY CASE
// ============================================================

export const getDocumentsByCaseController =
  async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    try {
      const caseId =
        req.params.caseId;

      if (typeof caseId !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      const documents =
        await getDocumentsByCase(caseId);

      return res.status(200).json({
        success: true,
        message:
          "Documents retrieved successfully",

        data: documents.map(
          (document) => ({
            ...document,
            fileSize:
              document.fileSize.toString(),
          }),
        ),
      });
    } catch (error) {
      console.error(
        "Get documents by case error:",
        error,
      );

      if (
        error instanceof Error &&
        error.message ===
          "Case not found"
      ) {
        return res.status(404).json({
          success: false,
          message: "Case not found",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to retrieve documents",
      });
    }
  };

// ============================================================
// VIEW / DOWNLOAD DOCUMENT
// ============================================================

export const getDocumentController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const {
      caseId,
      documentId,
    } = req.params;

    if (
      typeof caseId !== "string" ||
      typeof documentId !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid case ID or document ID",
      });
    }

    const {
      document,
      filePath,
    } = await getDocumentFile(
      caseId,
      documentId,
    );

    res.setHeader(
      "Content-Type",
      document.mimeType,
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(
        document.fileName,
      )}"`,
    );

    return res.sendFile(filePath);
  } catch (error) {
    console.error(
      "Get document error:",
      error,
    );

    if (
      error instanceof Error &&
      error.message ===
        "Document not found"
    ) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "Document file not found"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Document file not found",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve document",
    });
  }
};

// ============================================================
// UPDATE DOCUMENT
//
// Content-Type: multipart/form-data
//
// Fields:
// documentType
// title
// file (optional)
// ============================================================

export const updateDocumentController =
  async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    try {
      const {
        caseId,
        documentId,
      } = req.params;

      if (
        typeof caseId !== "string" ||
        typeof documentId !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid case ID or document ID",
        });
      }

      const parsed =
        updateDocumentSchema.safeParse(
          req.body,
        );

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid document update data",
          errors:
            parsed.error.flatten()
              .fieldErrors,
        });
      }

      const userId =
        req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const document =
        await updateDocument(
          caseId,
          documentId,
          parsed.data,
          userId,
          req.file,
        );

      return res.status(200).json({
        success: true,
        message:
          "Document updated successfully",

        data: {
          documentId:
            document.documentId,
          caseId:
            document.caseId,
          documentType:
            document.documentType,
          title:
            document.title,
          fileName:
            document.fileName,
          storageKey:
            document.storageKey,
          mimeType:
            document.mimeType,
          fileSize:
            document.fileSize.toString(),
          checksum:
            document.checksum,
          uploadedBy:
            document.uploadedBy,
          updatedAt:
            document.updatedAt,
        },
      });
    } catch (error) {
      console.error(
        "Update document error:",
        error,
      );

      if (
        error instanceof multer.MulterError
      ) {
        if (
          error.code ===
          "LIMIT_FILE_SIZE"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "File size must not exceed 10 MB",
          });
        }

        return res.status(400).json({
          success: false,
          message:
            `File upload error: ${error.message}`,
        });
      }

      if (
        error instanceof Error &&
        error.message ===
          "Document not found"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found",
        });
      }

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

      return res.status(500).json({
        success: false,
        message:
          "Failed to update document",
      });
    }
  };

// ============================================================
// DELETE DOCUMENT
// ============================================================

export const deleteDocumentController =
  async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    try {
      const {
        caseId,
        documentId,
      } = req.params;

      if (
        typeof caseId !== "string" ||
        typeof documentId !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid case ID or document ID",
        });
      }

      const deletionReason =
        typeof req.body
          .deletionReason === "string"
          ? req.body.deletionReason.trim()
          : "";

      if (!deletionReason) {
        return res.status(400).json({
          success: false,
          message:
            "Deletion reason is required",
        });
      }

      if (
        deletionReason.length > 1000
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Deletion reason must not exceed 1000 characters",
        });
      }

      const userId =
        req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const document =
        await deleteDocument(
          caseId,
          documentId,
          userId,
          deletionReason,
        );

      return res.status(200).json({
        success: true,
        message:
          "Document removed successfully",
        data: {
          documentId:
            document.documentId,
          deletedAt:
            document.deletedAt,
          deletedBy:
            document.deletedBy,
          deletionReason:
            document.deletionReason,
        },
      });
    } catch (error) {
      console.error(
        "Delete document error:",
        error,
      );

      if (
        error instanceof Error &&
        error.message ===
          "Document not found"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to remove document",
      });
    }
  };