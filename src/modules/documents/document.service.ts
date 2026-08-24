import fs from "fs/promises";
import crypto from "crypto";
import path from "path";

import prisma from "../../config/database";

interface CreateDocumentInput {
  caseId: string;
  documentType: string;
  title: string;
  file: Express.Multer.File;
  uploadedBy: string;
}

const calculateChecksum = async (filePath: string): Promise<string> => {
  const fileBuffer = await fs.readFile(filePath);

  return crypto
    .createHash("sha256")
    .update(fileBuffer)
    .digest("hex");
};

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

  // ----------------------------------------------------------
  // 1. Check that the case exists
  // ----------------------------------------------------------

  const existingCase = await prisma.case.findUnique({
    where: {
      caseId,
    },
  });

  if (!existingCase) {
    throw new Error("Case not found");
  }

  // ----------------------------------------------------------
  // 2. Make sure a file was uploaded
  // ----------------------------------------------------------

  if (!file) {
    throw new Error("Document file is required");
  }

  // ----------------------------------------------------------
  // 3. Calculate SHA-256 checksum
  // ----------------------------------------------------------

  const checksum = await calculateChecksum(file.path);

  try {
    // --------------------------------------------------------
    // 4. Create the document database record
    // --------------------------------------------------------

    const document = await prisma.document.create({
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

    return document;
  } catch (error) {
    // --------------------------------------------------------
    // 5. Database failed → remove uploaded physical file
    // --------------------------------------------------------

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

export const getDocumentsByCase = async (caseId: string) => {
  const existingCase = await prisma.case.findUnique({
    where: {
      caseId,
    },
  });

  if (!existingCase) {
    throw new Error("Case not found");
  }

  const documents = await prisma.document.findMany({
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
      uploadedBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return documents;
};

export const getDocumentFile = async (
  caseId: string,
  documentId: string,
) => {
  const document = await prisma.document.findFirst({
    where: {
      documentId,
      caseId,
      deletedAt: null,
    },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  const filePath = path.resolve(document.storageKey);

  try {
    await fs.access(filePath);
  } catch {
    throw new Error("Document file not found");
  }

  return {
    document,
    filePath,
  };
};


/////delete


export const deleteDocument = async (
  caseId: string,
  documentId: string,
  deletedBy: string,
  deletionReason: string,
) => {
  // ----------------------------------------------------------
  // 1. Find the document
  // ----------------------------------------------------------

  const document = await prisma.document.findFirst({
    where: {
      documentId,
      caseId,
    },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  // ----------------------------------------------------------
  // 2. Make sure the document is not already deleted
  // ----------------------------------------------------------

  if (document.deletedAt) {
    throw new Error("Document already deleted");
  }

  // ----------------------------------------------------------
  // 3. Soft delete the document
  // ----------------------------------------------------------
  // We DO NOT delete the physical file.
  // The document remains available for audit/history purposes.

  const deletedDocument = await prisma.document.update({
    where: {
      documentId,
    },
    data: {
      deletedAt: new Date(),
      deletedBy,
      deletionReason,
    },
  });

  return deletedDocument;
};