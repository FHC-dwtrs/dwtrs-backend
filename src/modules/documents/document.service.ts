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
    // --------------------------------------------------------
    // 1. Check case exists
    // --------------------------------------------------------

    const caseRecord = await tx.case.findUnique({
      where: {
        caseId: input.caseId,
      },
    });

    if (!caseRecord) {
      throw new Error("Case not found.");
    }

    // --------------------------------------------------------
    // 2. Check user exists
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // 3. Create document
    // --------------------------------------------------------

    const document = await tx.document.create({
      data: {
        caseId: input.caseId,
        documentType: input.documentType,
        title: input.title,
      },
      include: {
        case: true,
        versions: true,
      },
    });

    // --------------------------------------------------------
    // 4. Audit
    // --------------------------------------------------------

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

      versions: {
        orderBy: {
          versionNumber: "desc",
        },

        include: {
          creator: {
            select: {
              userId: true,
              name: true,
              email: true,
            },
          },

          attachments: true,
        },
      },
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
  // ----------------------------------------------------------
  // Check case exists
  // ----------------------------------------------------------

  const caseRecord = await prisma.case.findUnique({
    where: {
      caseId,
    },
  });

  if (!caseRecord) {
    throw new Error("Case not found.");
  }

  // ----------------------------------------------------------
  // Get documents
  // ----------------------------------------------------------

  return prisma.document.findMany({
    where: {
      caseId,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      versions: {
        orderBy: {
          versionNumber: "desc",
        },

        include: {
          attachments: true,
        },
      },
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
    // --------------------------------------------------------
    // 1. Find document
    // --------------------------------------------------------

    const existingDocument =
      await tx.document.findUnique({
        where: {
          documentId,
        },
      });

    if (!existingDocument) {
      throw new Error("Document not found.");
    }

    // --------------------------------------------------------
    // 2. Check user
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // 3. Update
    // --------------------------------------------------------

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
        },

        include: {
          case: true,
          versions: true,
        },
      });

    // --------------------------------------------------------
    // 4. Audit
    // --------------------------------------------------------

    await tx.auditLog.create({
      data: {
        userId,
        caseId: existingDocument.caseId,
        action: "DOCUMENT_UPDATED",
        entityType: "DOCUMENT",
        entityId: documentId,

        oldValues: {
          documentType:
            existingDocument.documentType,
          title: existingDocument.title,
        },

        newValues: {
          documentType:
            updatedDocument.documentType,
          title: updatedDocument.title,
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
    // --------------------------------------------------------
    // 1. Find document
    // --------------------------------------------------------

    const existingDocument =
      await tx.document.findUnique({
        where: {
          documentId,
        },

        include: {
          versions: {
            include: {
              attachments: true,
            },
          },
        },
      });

    if (!existingDocument) {
      throw new Error("Document not found.");
    }

    // --------------------------------------------------------
    // 2. Check user
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // 3. Delete document
    //
    // Cascade will delete:
    //
    // Document
    //   ↓
    // DocumentVersion
    //   ↓
    // Attachment
    //
    // --------------------------------------------------------

    await tx.document.delete({
      where: {
        documentId,
      },
    });

    // --------------------------------------------------------
    // 4. Audit
    // --------------------------------------------------------

    await tx.auditLog.create({
      data: {
        userId,
        caseId: existingDocument.caseId,
        action: "DOCUMENT_DELETED",
        entityType: "DOCUMENT",
        entityId: documentId,

        oldValues: {
          documentType:
            existingDocument.documentType,

          title: existingDocument.title,

          versionCount:
            existingDocument.versions.length,
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