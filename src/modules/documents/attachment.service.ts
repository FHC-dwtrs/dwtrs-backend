import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import prisma from "../../config/database";

interface CreateAttachmentInput {
  documentId: string;
  file: Express.Multer.File;
  uploadedBy: string;
}

// ============================================================
// CALCULATE CHECKSUM
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
// CREATE / UPLOAD ATTACHMENT
// ============================================================

export const createAttachment = async (
  input: CreateAttachmentInput,
) => {
  const {
    documentId,
    file,
    uploadedBy,
  } = input;

  // ----------------------------------------------------------
  // 1. Check that the document exists and is active
  // ----------------------------------------------------------

  const document = await prisma.document.findFirst({
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

  // ----------------------------------------------------------
  // 2. Make sure a file was uploaded
  // ----------------------------------------------------------

  if (!file) {
    throw new Error("Attachment file is required");
  }

  // ----------------------------------------------------------
  // 3. Calculate SHA-256 checksum
  // ----------------------------------------------------------

  const checksum = await calculateChecksum(file.path);

  try {
    // --------------------------------------------------------
    // 4. Create attachment database record
    // --------------------------------------------------------

    const attachment = await prisma.attachment.create({
      data: {
        documentId,

        fileName: file.originalname,
        storageKey: file.path,
        mimeType: file.mimetype,
        fileSize: BigInt(file.size),
        checksum,

        uploadedBy,
      },
    });

    return attachment;
  } catch (error) {
    // --------------------------------------------------------
    // 5. Database failed → remove physical file
    // --------------------------------------------------------

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
  // ----------------------------------------------------------
  // 1. Verify complete relationship:
  //
  // Case
  //   ↓
  // Document
  //   ↓
  // Attachment
  //
  // Also make sure both document and attachment are active.
  // ----------------------------------------------------------

  const attachment = await prisma.attachment.findFirst({
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

  // ----------------------------------------------------------
  // 2. Attachment not found / invalid relationship
  // ----------------------------------------------------------

  if (!attachment) {
    throw new Error("Attachment not found");
  }

  // ----------------------------------------------------------
  // 3. Resolve physical file path
  // ----------------------------------------------------------

  const filePath = path.resolve(attachment.storageKey);

  // ----------------------------------------------------------
  // 4. Make sure physical file still exists
  // ----------------------------------------------------------

  try {
    await fs.access(filePath);
  } catch {
    throw new Error("Attachment file not found");
  }

  // ----------------------------------------------------------
  // 5. Return attachment metadata + physical path
  // ----------------------------------------------------------

  return {
    attachment,
    filePath,
  };
};

// ============================================================
// GET ATTACHMENTS BY DOCUMENT
// ============================================================

export const getAttachmentsByDocument = async (
  caseId: string,
  documentId: string,
) => {
  // ----------------------------------------------------------
  // 1. Make sure document exists, belongs to this case,
  //    and is active
  // ----------------------------------------------------------

  const document = await prisma.document.findFirst({
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
    throw new Error("Document not found");
  }

  // ----------------------------------------------------------
  // 2. Get only active attachments
  // ----------------------------------------------------------

  const attachments = await prisma.attachment.findMany({
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
    },
  });

  return attachments;
};

// ============================================================
// DELETE ATTACHMENT
// ============================================================

export const deleteAttachment = async (
    caseId: string,
    documentId: string,
    attachmentId: string,
    deletedBy: string,
    deletionReason: string,
  ) => {
    // ----------------------------------------------------------
    // 1. Find the attachment and verify the case relationship
    // ----------------------------------------------------------
  
    const attachment = await prisma.attachment.findFirst({
      where: {
        attachmentId,
        documentId,
        document: {
          caseId,
        },
      },
    });
  
    if (!attachment) {
      throw new Error("Attachment not found");
    }
  
    // ----------------------------------------------------------
    // 2. Make sure the attachment is not already deleted
    // ----------------------------------------------------------
  
    if (attachment.deletedAt) {
      throw new Error("Attachment already deleted");
    }
  
    // ----------------------------------------------------------
    // 3. Soft delete the attachment
    // ----------------------------------------------------------
    // The physical file is intentionally NOT deleted.
    //
    // This preserves the file for audit/history purposes.
    // The attachment is simply hidden from normal queries
    // using deletedAt: null.
    // ----------------------------------------------------------
  
    const deletedAttachment =
      await prisma.attachment.update({
        where: {
          attachmentId,
        },
        data: {
          deletedAt: new Date(),
          deletedBy,
          deletionReason,
        },
      });
  
    return deletedAttachment;
  };