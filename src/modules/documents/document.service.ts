import fs from "fs/promises";
import crypto from "crypto";
import path from "path";
import { Prisma } from "../../generated/prisma/client.js";
import prisma from "../../config/database.js";

import {
  UpdateDocumentInput,
} from "./document.validation.js";

interface CreateDocumentInput {
  caseId: string;
  documentType: string;
  title: string;
  file: Express.Multer.File;
  uploadedBy: string;
}

// ============================================================
// CHECKSUM
// ============================================================

const calculateChecksum = async (
  filePath: string,
): Promise<string> => {
  const fileBuffer = await fs.readFile(filePath);

  return crypto
    .createHash("sha256")
    .update(fileBuffer)
    .digest("hex");
};

// ============================================================
// CREATE DOCUMENT
// ============================================================

export const createDocument = async (
  input: CreateDocumentInput,
) => {
  const {
    caseId,
    documentType,
    title,
    file,
    uploadedBy,
  } = input;

  const existingCase = await prisma.case.findUnique({
    where: {
      caseId,
    },
  });

  if (!existingCase) {
    throw new Error("Case not found");
  }

  if (!file) {
    throw new Error("Document file is required");
  }

  const checksum = await calculateChecksum(
    file.path,
  );

  try {
    const document = await prisma.$transaction(
      async (tx) => {
        const createdDocument =
          await tx.document.create({
            data: {
              caseId,
              documentType,
              title,

              fileName: file.originalname,
              storageKey: file.path,
              mimeType: file.mimetype,
              fileSize: BigInt(file.size),
              checksum,

              uploadedBy,
            },
          });

        await tx.auditLog.create({
          data: {
            userId: uploadedBy,
            caseId,

            action: "DOCUMENT_CREATE",
            entityType: "DOCUMENT",
            entityId:
              createdDocument.documentId,

            oldValues: Prisma.JsonNull,

            newValues: {
              documentId:
                createdDocument.documentId,
              caseId,
              documentType,
              title,
              fileName: file.originalname,
              storageKey: file.path,
              mimeType: file.mimetype,
              fileSize: file.size,
              checksum,
              uploadedBy,
            },
          },
        });

        return createdDocument;
      },
    );

    return document;
  } catch (error) {
    try {
      await fs.unlink(file.path);
    } catch (cleanupError) {
      console.error(
        "Failed to remove uploaded file after database error:",
        cleanupError,
      );
    }

    throw error;
  }
};

// ============================================================
// GET DOCUMENTS
// ============================================================

export const getDocumentsByCase = async (
  caseId: string,
) => {
  const existingCase = await prisma.case.findUnique({
    where: {
      caseId,
    },
  });

  if (!existingCase) {
    throw new Error("Case not found");
  }

  return prisma.document.findMany({
    where: {
      caseId,
      deletedAt: null,
    },

    orderBy: {
      createdAt: "desc",
    },

    select: {
      documentId: true,
      caseId: true,
      documentType: true,
      title: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      checksum: true,
      uploadedBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

// ============================================================
// GET DOCUMENT FILE
// ============================================================

export const getDocumentFile = async (
  caseId: string,
  documentId: string,
) => {
  const document =
    await prisma.document.findFirst({
      where: {
        documentId,
        caseId,
        deletedAt: null,
      },
    });

  if (!document) {
    throw new Error("Document not found");
  }

  const filePath = path.resolve(
    document.storageKey,
  );

  try {
    await fs.access(filePath);
  } catch {
    throw new Error(
      "Document file not found",
    );
  }

  return {
    document,
    filePath,
  };
};

// ============================================================
// UPDATE DOCUMENT
//
// Updates metadata and optionally replaces the file.
// ============================================================

export const updateDocument = async (
  caseId: string,
  documentId: string,
  input: UpdateDocumentInput,
  updatedBy: string,
  file?: Express.Multer.File,
) => {
  // ----------------------------------------------------------
  // 1. FIND DOCUMENT
  // ----------------------------------------------------------

  const document =
    await prisma.document.findFirst({
      where: {
        documentId,
        caseId,
        deletedAt: null,
      },
    });

  if (!document) {
    throw new Error("Document not found");
  }

  // ----------------------------------------------------------
  // 2. PREPARE FILE INFORMATION
  // ----------------------------------------------------------

  let checksum: string | null =
    document.checksum;

  let newStorageKey = document.storageKey;
  let newFileName = document.fileName;
  let newMimeType = document.mimeType;
  let newFileSize = document.fileSize;

  if (file) {
    checksum = await calculateChecksum(
      file.path,
    );

    newStorageKey = file.path;
    newFileName = file.originalname;
    newMimeType = file.mimetype;
    newFileSize = BigInt(file.size);
  }

  // ----------------------------------------------------------
  // 3. OLD VALUES
  // ----------------------------------------------------------

  const oldValues = {
    documentId: document.documentId,
    caseId: document.caseId,
    documentType: document.documentType,
    title: document.title,
    fileName: document.fileName,
    storageKey: document.storageKey,
    mimeType: document.mimeType,
    fileSize: document.fileSize.toString(),
    checksum: document.checksum,
    uploadedBy: document.uploadedBy,
  };

  try {
    const updatedDocument =
      await prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.document.update({
              where: {
                documentId,
              },

              data: {
                ...(input.documentType !==
                  undefined && {
                  documentType:
                    input.documentType,
                }),

                ...(input.title !== undefined && {
                  title: input.title,
                }),

                ...(file && {
                  storageKey: newStorageKey,
                  fileName: newFileName,
                  mimeType: newMimeType,
                  fileSize: newFileSize,
                  checksum,
                  uploadedBy: updatedBy,
                }),
              },
            });

          // ------------------------------------------------
          // AUDIT
          // ------------------------------------------------

          await tx.auditLog.create({
            data: {
              userId: updatedBy,
              caseId,

              action: "DOCUMENT_UPDATE",
              entityType: "DOCUMENT",
              entityId: documentId,

              oldValues,

              newValues: {
                documentId:
                  updated.documentId,
                caseId:
                  updated.caseId,
                documentType:
                  updated.documentType,
                title: updated.title,
                fileName:
                  updated.fileName,
                storageKey:
                  updated.storageKey,
                mimeType:
                  updated.mimeType,
                fileSize:
                  updated.fileSize.toString(),
                checksum:
                  updated.checksum,
                uploadedBy:
                  updated.uploadedBy,
              },
            },
          });

          return updated;
        },
      );

    // --------------------------------------------------------
    // REMOVE OLD PHYSICAL FILE ONLY AFTER DB SUCCESS
    // --------------------------------------------------------

    if (
      file &&
      document.storageKey !==
        updatedDocument.storageKey
    ) {
      try {
        await fs.unlink(
          path.resolve(document.storageKey),
        );
      } catch (cleanupError) {
        console.error(
          "Failed to remove old document file:",
          cleanupError,
        );
      }
    }

    return updatedDocument;
  } catch (error) {
    // Database failed → remove NEW uploaded file.
    if (file) {
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        console.error(
          "Failed to remove replacement file after database error:",
          cleanupError,
        );
      }
    }

    throw error;
  }
};

// ============================================================
// DELETE DOCUMENT
// ============================================================

export const deleteDocument = async (
  caseId: string,
  documentId: string,
  deletedBy: string,
  deletionReason: string,
) => {
  const document =
    await prisma.document.findFirst({
      where: {
        documentId,
        caseId,
      },
    });

  if (!document) {
    throw new Error("Document not found");
  }

  if (document.deletedAt) {
    throw new Error("Document already deleted");
  }

  const deletedAt = new Date();

  const result = await prisma.$transaction(
    async (tx) => {
      const deletedDocument =
        await tx.document.update({
          where: {
            documentId,
          },

          data: {
            deletedAt,
            deletedBy,
            deletionReason,
          },
        });

      await tx.auditLog.create({
        data: {
          userId: deletedBy,
          caseId,

          action: "DOCUMENT_DELETE",
          entityType: "DOCUMENT",
          entityId: documentId,

          oldValues: {
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
            uploadedBy:
              document.uploadedBy,
            createdAt:
              document.createdAt.toISOString(),
          },

          newValues: {
            deletedAt:
              deletedAt.toISOString(),
            deletedBy,
            deletionReason,
          },
        },
      });

      return deletedDocument;
    },
  );

  return result;
};