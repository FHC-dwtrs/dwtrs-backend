import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { Prisma } from "../../generated/prisma/client.js";
import prisma from "../../config/database.js";

interface CreateAttachmentInput {
  documentId: string;
  file: Express.Multer.File;
  uploadedBy: string;
}

// ============================================================
// CHECKSUM
// ============================================================

const calculateChecksum = async (
  filePath: string,
): Promise<string> => {
  const fileBuffer = await fs.readFile(
    filePath,
  );

  return crypto
    .createHash("sha256")
    .update(fileBuffer)
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
    await calculateChecksum(file.path);

  try {
    const attachment =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.attachment.create({
              data: {
                documentId,

                fileName:
                  file.originalname,
                storageKey:
                  file.path,
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

              oldValues: Prisma.JsonNull,

              newValues: {
                attachmentId:
                  created.attachmentId,
                documentId,
                fileName:
                  file.originalname,
                storageKey:
                  file.path,
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
    try {
      await fs.unlink(file.path);
    } catch (cleanupError) {
      console.error(
        "Failed to remove uploaded attachment after database error:",
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

  const filePath = path.resolve(
    attachment.storageKey,
  );

  try {
    await fs.access(filePath);
  } catch {
    throw new Error(
      "Attachment file not found",
    );
  }

  return {
    attachment,
    filePath,
  };
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
    // 2. NEW FILE DATA
    // --------------------------------------------------------

    const checksum =
      await calculateChecksum(
        file.path,
      );

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
                    file.path,
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

            // ------------------------------------------------
            // AUDIT
            // ------------------------------------------------

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
      // REMOVE OLD PHYSICAL FILE
      // ------------------------------------------------------

      try {
        await fs.unlink(
          path.resolve(
            attachment.storageKey,
          ),
        );
      } catch (cleanupError) {
        console.error(
          "Failed to remove old attachment file:",
          cleanupError,
        );
      }

      return updated;
    } catch (error) {
      // DB failed → remove replacement file.
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        console.error(
          "Failed to remove replacement attachment after database error:",
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

    const deletedAt = new Date();

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

          // ------------------------------------------------
          // AUDIT
          // ------------------------------------------------

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