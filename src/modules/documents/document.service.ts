import crypto from "crypto";
import {
  GetObjectCommand,
} from "@aws-sdk/client-s3";

import { Prisma } from "../../generated/prisma/client.js";
import prisma from "../../config/database.js";
import storageClient from "../../config/storage.js";

import {
  UpdateDocumentInput,
} from "./document.validation.js";

import {
  uploadToStorage,
  deleteFromStorage,
  generateStorageKey,
} from "../../utils/storage.js";

interface CreateDocumentInput {
  caseId: string;
  documentType: string;
  title: string;
  file: Express.Multer.File;
  uploadedBy: string;
}

const bucket =
  process.env.SUPABASE_S3_BUCKET!;

// ============================================================
// CHECKSUM
// ============================================================

const calculateChecksum = (
  buffer: Buffer,
): string => {
  return crypto
    .createHash("sha256")
    .update(buffer)
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

  const existingCase =
    await prisma.case.findUnique({
      where: {
        caseId,
      },
    });

  if (!existingCase) {
    throw new Error("Case not found");
  }

  if (!file) {
    throw new Error(
      "Document file is required",
    );
  }

  const checksum =
    calculateChecksum(file.buffer);

  const storageKey =
    generateStorageKey(
      "documents",
      file.originalname,
    );

  try {
    // --------------------------------------------------------
    // 1. UPLOAD TO SUPABASE
    // --------------------------------------------------------

    await uploadToStorage(
      file.buffer,
      storageKey,
      file.mimetype,
    );

    // --------------------------------------------------------
    // 2. CREATE DATABASE RECORD + AUDIT
    // --------------------------------------------------------

    const document =
      await prisma.$transaction(
        async (tx) => {
          const createdDocument =
            await tx.document.create({
              data: {
                caseId,
                documentType,
                title,

                fileName:
                  file.originalname,
                storageKey,
                mimeType:
                  file.mimetype,
                fileSize:
                  BigInt(file.size),
                checksum,

                uploadedBy,
              },
            });

          await tx.auditLog.create({
            data: {
              userId: uploadedBy,
              caseId,

              action:
                "DOCUMENT_CREATE",
              entityType:
                "DOCUMENT",
              entityId:
                createdDocument.documentId,

              oldValues:
                Prisma.JsonNull,

              newValues: {
                documentId:
                  createdDocument.documentId,
                caseId,
                documentType,
                title,
                fileName:
                  file.originalname,
                storageKey,
                mimeType:
                  file.mimetype,
                fileSize:
                  file.size,
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
    // --------------------------------------------------------
    // DATABASE FAILED → REMOVE FILE FROM SUPABASE
    // --------------------------------------------------------

    try {
      await deleteFromStorage(
        storageKey,
      );
    } catch (cleanupError) {
      console.error(
        "Failed to remove uploaded document from storage:",
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
  const existingCase =
    await prisma.case.findUnique({
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
    throw new Error(
      "Document not found",
    );
  }

  try {
    const result =
      await storageClient.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: document.storageKey,
        }),
      );

    if (!result.Body) {
      throw new Error(
        "Document file not found",
      );
    }

    const fileBuffer =
      Buffer.from(
        await result.Body.transformToByteArray(),
      );

    return {
      document,
      fileBuffer,
    };
  } catch (error) {
    console.error(
      "Failed to retrieve document from storage:",
      error,
    );

    throw new Error(
      "Document file not found",
    );
  }
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
    throw new Error(
      "Document not found",
    );
  }

  // ----------------------------------------------------------
  // 2. PREPARE FILE INFORMATION
  // ----------------------------------------------------------

  let checksum:
    | string
    | null =
    document.checksum;

  let newStorageKey =
    document.storageKey;

  let newFileName =
    document.fileName;

  let newMimeType =
    document.mimeType;

  let newFileSize =
    document.fileSize;

  if (file) {
    checksum =
      calculateChecksum(
        file.buffer,
      );

    newStorageKey =
      generateStorageKey(
        "documents",
        file.originalname,
      );

    newFileName =
      file.originalname;

    newMimeType =
      file.mimetype;

    newFileSize =
      BigInt(file.size);

    // --------------------------------------------------------
    // Upload replacement BEFORE database update
    // --------------------------------------------------------

    await uploadToStorage(
      file.buffer,
      newStorageKey,
      file.mimetype,
    );
  }

  // ----------------------------------------------------------
  // 3. OLD VALUES
  // ----------------------------------------------------------

  const oldValues = {
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

                ...(input.title !==
                  undefined && {
                  title:
                    input.title,
                }),

                ...(file && {
                  storageKey:
                    newStorageKey,
                  fileName:
                    newFileName,
                  mimeType:
                    newMimeType,
                  fileSize:
                    newFileSize,
                  checksum,
                  uploadedBy:
                    updatedBy,
                }),
              },
            });

          await tx.auditLog.create({
            data: {
              userId: updatedBy,
              caseId,

              action:
                "DOCUMENT_UPDATE",
              entityType:
                "DOCUMENT",
              entityId:
                documentId,

              oldValues,

              newValues: {
                documentId:
                  updated.documentId,
                caseId:
                  updated.caseId,
                documentType:
                  updated.documentType,
                title:
                  updated.title,
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
    // DATABASE SUCCESS → REMOVE OLD STORAGE OBJECT
    // --------------------------------------------------------

    if (
      file &&
      document.storageKey !==
        updatedDocument.storageKey
    ) {
      try {
        await deleteFromStorage(
          document.storageKey,
        );
      } catch (cleanupError) {
        console.error(
          "Failed to remove old document from storage:",
          cleanupError,
        );
      }
    }

    return updatedDocument;
  } catch (error) {
    // --------------------------------------------------------
    // DATABASE FAILED → REMOVE NEW STORAGE OBJECT
    // --------------------------------------------------------

    if (file) {
      try {
        await deleteFromStorage(
          newStorageKey,
        );
      } catch (cleanupError) {
        console.error(
          "Failed to remove replacement document from storage:",
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
    throw new Error(
      "Document not found",
    );
  }

  if (document.deletedAt) {
    throw new Error(
      "Document already deleted",
    );
  }

  const deletedAt =
    new Date();

  const result =
    await prisma.$transaction(
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

            action:
              "DOCUMENT_DELETE",
            entityType:
              "DOCUMENT",
            entityId:
              documentId,

            oldValues: {
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