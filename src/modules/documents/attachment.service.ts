import crypto from "crypto";
import {
  GetObjectCommand,
} from "@aws-sdk/client-s3";

import { Prisma } from "../../generated/prisma/client.js";
import prisma from "../../config/database.js";
import storageClient from "../../config/storage.js";

import {
  uploadToStorage,
  deleteFromStorage,
  generateStorageKey,
} from "../../utils/storage.js";

interface CreateAttachmentInput {
  documentId: string;
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
// CREATE ATTACHMENT
// ============================================================

export const createAttachment = async (
  input: CreateAttachmentInput,
) => {
  const {
    documentId,
    file,
    uploadedBy,
  } = input;

  const document =
    await prisma.document.findFirst({
      where: {
        documentId,
        deletedAt: null,
      },

      select: {
        documentId: true,
        caseId: true,
      },
    });

  if (!document) {
    throw new Error("Document not found");
  }

  if (!file) {
    throw new Error(
      "Attachment file is required",
    );
  }

  const checksum =
    calculateChecksum(file.buffer);

  const storageKey =
    generateStorageKey(
      "attachments",
      file.originalname,
    );

  try {
    // --------------------------------------------------------
    // 1. UPLOAD TO SUPABASE STORAGE
    // --------------------------------------------------------

    await uploadToStorage(
      file.buffer,
      storageKey,
      file.mimetype,
    );

    // --------------------------------------------------------
    // 2. CREATE DATABASE RECORD + AUDIT
    // --------------------------------------------------------

    const attachment =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.attachment.create({
              data: {
                documentId,

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
              caseId:
                document.caseId,

              action:
                "ATTACHMENT_CREATE",

              entityType:
                "ATTACHMENT",

              entityId:
                created.attachmentId,

              oldValues:
                Prisma.JsonNull,

              newValues: {
                attachmentId:
                  created.attachmentId,

                documentId,

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

          return created;
        },
      );

    return attachment;
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
        "Failed to remove uploaded attachment from storage:",
        cleanupError,
      );
    }

    throw error;
  }
};

// ============================================================
// GET ATTACHMENT FILE
// ============================================================

export const getAttachmentFile = async (
  caseId: string,
  documentId: string,
  attachmentId: string,
) => {
  const attachment =
    await prisma.attachment.findFirst({
      where: {
        attachmentId,
        documentId,
        deletedAt: null,

        document: {
          caseId,
          deletedAt: null,
        },
      },
    });

  if (!attachment) {
    throw new Error(
      "Attachment not found",
    );
  }

  try {
    const result =
      await storageClient.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: attachment.storageKey,
        }),
      );

    if (!result.Body) {
      throw new Error(
        "Attachment file not found",
      );
    }

    const fileBuffer =
      Buffer.from(
        await result.Body.transformToByteArray(),
      );

    return {
      attachment,
      fileBuffer,
    };
  } catch (error) {
    console.error(
      "Failed to retrieve attachment from storage:",
      error,
    );

    throw new Error(
      "Attachment file not found",
    );
  }
};

// ============================================================
// GET ATTACHMENTS BY DOCUMENT
// ============================================================

export const getAttachmentsByDocument =
  async (
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

        select: {
          documentId: true,
        },
      });

    if (!document) {
      throw new Error(
        "Document not found",
      );
    }

    return prisma.attachment.findMany({
      where: {
        documentId,
        deletedAt: null,
      },

      orderBy: {
        uploadedAt: "desc",
      },

      select: {
        attachmentId: true,
        documentId: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        checksum: true,
        uploadedBy: true,
        uploadedAt: true,
        deletedAt: true,
      },
    });
  };

// ============================================================
// UPDATE / REPLACE ATTACHMENT
// ============================================================

export const updateAttachment =
  async (
    caseId: string,
    documentId: string,
    attachmentId: string,
    updatedBy: string,
    file: Express.Multer.File,
  ) => {
    // --------------------------------------------------------
    // 1. FIND ATTACHMENT
    // --------------------------------------------------------

    const attachment =
      await prisma.attachment.findFirst({
        where: {
          attachmentId,
          documentId,
          deletedAt: null,

          document: {
            caseId,
            deletedAt: null,
          },
        },
      });

    if (!attachment) {
      throw new Error(
        "Attachment not found",
      );
    }

    if (!file) {
      throw new Error(
        "Attachment file is required",
      );
    }

    // --------------------------------------------------------
    // 2. PREPARE NEW FILE
    // --------------------------------------------------------

    const checksum =
      calculateChecksum(
        file.buffer,
      );

    const newStorageKey =
      generateStorageKey(
        "attachments",
        file.originalname,
      );

    // --------------------------------------------------------
    // 3. OLD VALUES FOR AUDIT
    // --------------------------------------------------------

    const oldValues = {
      attachmentId:
        attachment.attachmentId,

      documentId:
        attachment.documentId,

      fileName:
        attachment.fileName,

      storageKey:
        attachment.storageKey,

      mimeType:
        attachment.mimeType,

      fileSize:
        attachment.fileSize.toString(),

      checksum:
        attachment.checksum,

      uploadedBy:
        attachment.uploadedBy,
    };

    try {
      // ------------------------------------------------------
      // 4. UPLOAD NEW FILE FIRST
      // ------------------------------------------------------

      await uploadToStorage(
        file.buffer,
        newStorageKey,
        file.mimetype,
      );

      // ------------------------------------------------------
      // 5. UPDATE DATABASE + AUDIT
      // ------------------------------------------------------

      const updated =
        await prisma.$transaction(
          async (tx) => {
            const result =
              await tx.attachment.update({
                where: {
                  attachmentId,
                },

                data: {
                  fileName:
                    file.originalname,

                  storageKey:
                    newStorageKey,

                  mimeType:
                    file.mimetype,

                  fileSize:
                    BigInt(file.size),

                  checksum,

                  uploadedBy:
                    updatedBy,

                  uploadedAt:
                    new Date(),
                },
              });

            await tx.auditLog.create({
              data: {
                userId: updatedBy,
                caseId,

                action:
                  "ATTACHMENT_UPDATE",

                entityType:
                  "ATTACHMENT",

                entityId:
                  attachmentId,

                oldValues,

                newValues: {
                  attachmentId:
                    result.attachmentId,

                  documentId:
                    result.documentId,

                  fileName:
                    result.fileName,

                  storageKey:
                    result.storageKey,

                  mimeType:
                    result.mimeType,

                  fileSize:
                    result.fileSize.toString(),

                  checksum:
                    result.checksum,

                  uploadedBy:
                    result.uploadedBy,
                },
              },
            });

            return result;
          },
        );

      // ------------------------------------------------------
      // 6. DATABASE SUCCESS → DELETE OLD FILE
      // ------------------------------------------------------

      try {
        await deleteFromStorage(
          attachment.storageKey,
        );
      } catch (cleanupError) {
        console.error(
          "Failed to remove old attachment from storage:",
          cleanupError,
        );
      }

      return updated;
    } catch (error) {
      // ------------------------------------------------------
      // FAILED → DELETE NEW FILE
      // ------------------------------------------------------

      try {
        await deleteFromStorage(
          newStorageKey,
        );
      } catch (cleanupError) {
        console.error(
          "Failed to remove replacement attachment from storage:",
          cleanupError,
        );
      }

      throw error;
    }
  };

// ============================================================
// DELETE ATTACHMENT
// ============================================================

export const deleteAttachment =
  async (
    caseId: string,
    documentId: string,
    attachmentId: string,
    deletedBy: string,
    deletionReason: string,
  ) => {
    const attachment =
      await prisma.attachment.findFirst({
        where: {
          attachmentId,
          documentId,

          document: {
            caseId,
          },
        },
      });

    if (!attachment) {
      throw new Error(
        "Attachment not found",
      );
    }

    if (attachment.deletedAt) {
      throw new Error(
        "Attachment already deleted",
      );
    }

    const deletedAt =
      new Date();

    const deletedAttachment =
      await prisma.$transaction(
        async (tx) => {
          const deleted =
            await tx.attachment.update({
              where: {
                attachmentId,
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
                "ATTACHMENT_DELETE",

              entityType:
                "ATTACHMENT",

              entityId:
                attachmentId,

              oldValues: {
                attachmentId:
                  attachment.attachmentId,

                documentId:
                  attachment.documentId,

                fileName:
                  attachment.fileName,

                storageKey:
                  attachment.storageKey,

                mimeType:
                  attachment.mimeType,

                fileSize:
                  attachment.fileSize.toString(),

                checksum:
                  attachment.checksum,

                uploadedBy:
                  attachment.uploadedBy,
              },

              newValues: {
                deletedAt:
                  deletedAt.toISOString(),

                deletedBy,

                deletionReason,
              },
            },
          });

          return deleted;
        },
      );

    return deletedAttachment;
  };