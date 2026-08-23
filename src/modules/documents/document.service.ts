import prisma from "../../config/database";
import { Prisma } from "../../generated/prisma/client";
import type {
  CreateDocumentInput,
  UpdateDocumentInput,
} from "./document.validation";

// ============================================================
// CREATE DOCUMENT
// ============================================================

export async function createDocument(
  userId: string,
  input: CreateDocumentInput,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // ========================================================
    // 1. CHECK CASE
    // ========================================================

    const caseRecord = await tx.case.findUnique({
      where: {
        caseId: input.caseId,
      },
    });

    if (!caseRecord) {
      throw new Error("Case not found.");
    }

    // ========================================================
    // 2. CHECK USER
    // ========================================================

    const user = await tx.user.findUnique({
      where: {
        userId,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    if (!user.isActive) {
      throw new Error("User is inactive.");
    }

    // ========================================================
    // 3. CREATE DOCUMENT
    // ========================================================

    const document = await tx.document.create({
      data: {
        caseId: input.caseId,
        documentType: input.documentType,
        title: input.title,

        fileName: input.fileName,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        fileSize: input.fileSize,

        checksum: input.checksum ?? null,

        uploadedBy: userId,
      },

      include: {
        case: true,
        attachments: true,
      },
    });

    // ========================================================
    // 4. AUDIT
    // ========================================================

    await tx.auditLog.create({
      data: {
        userId,
        caseId: input.caseId,
        action: "DOCUMENT_CREATED",
        entityType: "DOCUMENT",
        entityId: document.documentId,

        oldValues: Prisma.JsonNull,

        newValues: {
          documentId: document.documentId,
          caseId: input.caseId,
          documentType: input.documentType,
          title: input.title,
          fileName: input.fileName,
          storageKey: input.storageKey,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          checksum: input.checksum ?? null,
          uploadedBy: userId,
        },
      },
    });

    return document;
  });
}

// ============================================================
// GET DOCUMENT BY ID
// ============================================================

export async function getDocumentById(
  documentId: string,
) {
  const document = await prisma.document.findUnique({
    where: {
      documentId,
    },

    include: {
      case: true,
      attachments: true,
    },
  });

  if (!document) {
    throw new Error("Document not found.");
  }

  return document;
}

// ============================================================
// GET DOCUMENTS BY CASE
// ============================================================

export async function getDocumentsByCase(
  caseId: string,
) {
  // ========================================================
  // CHECK CASE
  // ========================================================

  const caseRecord = await prisma.case.findUnique({
    where: {
      caseId,
    },
  });

  if (!caseRecord) {
    throw new Error("Case not found.");
  }

  // ========================================================
  // GET DOCUMENTS
  // ========================================================

  return prisma.document.findMany({
    where: {
      caseId,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      attachments: true,
    },
  });
}

// ============================================================
// UPDATE DOCUMENT
// ============================================================

export async function updateDocument(
  documentId: string,
  userId: string,
  input: UpdateDocumentInput,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // ========================================================
    // 1. FIND DOCUMENT
    // ========================================================

    const existingDocument =
      await tx.document.findUnique({
        where: {
          documentId,
        },
      });

    if (!existingDocument) {
      throw new Error("Document not found.");
    }

    // ========================================================
    // 2. CHECK USER
    // ========================================================

    const user = await tx.user.findUnique({
      where: {
        userId,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    if (!user.isActive) {
      throw new Error("User is inactive.");
    }

    // ========================================================
    // 3. UPDATE DOCUMENT
    // ========================================================

    const updatedDocument =
      await tx.document.update({
        where: {
          documentId,
        },

        data: {
          ...(input.documentType !== undefined && {
            documentType: input.documentType,
          }),

          ...(input.title !== undefined && {
            title: input.title,
          }),

          ...(input.fileName !== undefined && {
            fileName: input.fileName,
          }),

          ...(input.storageKey !== undefined && {
            storageKey: input.storageKey,
          }),

          ...(input.mimeType !== undefined && {
            mimeType: input.mimeType,
          }),

          ...(input.fileSize !== undefined && {
            fileSize: input.fileSize,
          }),

          ...(input.checksum !== undefined && {
            checksum: input.checksum,
          }),
        },

        include: {
          case: true,
          attachments: true,
        },
      });

    // ========================================================
    // 4. AUDIT
    // ========================================================

    await tx.auditLog.create({
      data: {
        userId,
        caseId: existingDocument.caseId,
        action: "DOCUMENT_UPDATED",
        entityType: "DOCUMENT",
        entityId: documentId,

        oldValues: {
          documentType: existingDocument.documentType,
          title: existingDocument.title,
          fileName: existingDocument.fileName,
          storageKey: existingDocument.storageKey,
          mimeType: existingDocument.mimeType,
          fileSize: existingDocument.fileSize.toString(),
          checksum: existingDocument.checksum,
        },

        newValues: {
          documentType: updatedDocument.documentType,
          title: updatedDocument.title,
          fileName: updatedDocument.fileName,
          storageKey: updatedDocument.storageKey,
          mimeType: updatedDocument.mimeType,
          fileSize: updatedDocument.fileSize.toString(),
          checksum: updatedDocument.checksum,
        },
      },
    });

    return updatedDocument;
  });
}

// ============================================================
// DELETE DOCUMENT
// ============================================================

export async function deleteDocument(
  documentId: string,
  userId: string,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // ========================================================
    // 1. FIND DOCUMENT
    // ========================================================

    const existingDocument =
      await tx.document.findUnique({
        where: {
          documentId,
        },

        include: {
          attachments: true,
        },
      });

    if (!existingDocument) {
      throw new Error("Document not found.");
    }

    // ========================================================
    // 2. CHECK USER
    // ========================================================

    const user = await tx.user.findUnique({
      where: {
        userId,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    if (!user.isActive) {
      throw new Error("User is inactive.");
    }

    // ========================================================
    // 3. DELETE DOCUMENT
    // ========================================================

    await tx.document.delete({
      where: {
        documentId,
      },
    });

    // ========================================================
    // 4. AUDIT
    // ========================================================

    await tx.auditLog.create({
      data: {
        userId,
        caseId: existingDocument.caseId,
        action: "DOCUMENT_DELETED",
        entityType: "DOCUMENT",
        entityId: documentId,

        oldValues: {
          documentType: existingDocument.documentType,
          title: existingDocument.title,
          fileName: existingDocument.fileName,
          storageKey: existingDocument.storageKey,
          mimeType: existingDocument.mimeType,
          fileSize: existingDocument.fileSize.toString(),
          checksum: existingDocument.checksum,
          attachmentCount:
            existingDocument.attachments.length,
        },

        newValues: Prisma.JsonNull,
      },
    });

    return {
      documentId,
      message: "Document deleted successfully.",
    };
  });
}