import fs from "fs/promises";
import crypto from "crypto";

import prisma from "../../config/database";

interface CreateAttachmentInput {
  documentId: string;
  file: Express.Multer.File;
  uploadedBy: string;
}

const calculateChecksum = async (
  filePath: string,
): Promise<string> => {
  const fileBuffer = await fs.readFile(filePath);

  return crypto
    .createHash("sha256")
    .update(fileBuffer)
    .digest("hex");
};

export const createAttachment = async (
  input: CreateAttachmentInput,
) => {
  const {
    documentId,
    file,
    uploadedBy,
  } = input;

  // ----------------------------------------------------------
  // 1. Check that the document exists
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