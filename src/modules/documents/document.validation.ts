import { z } from "zod";

// ============================================================
// CREATE DOCUMENT
// ============================================================

export const createDocumentSchema = z.object({
  caseId: z.string().uuid("Invalid case ID."),

  documentType: z
    .string()
    .trim()
    .min(1, "Document type cannot be empty.")
    .max(100, "Document type must not exceed 100 characters."),

  title: z
    .string()
    .trim()
    .min(1, "Document title cannot be empty.")
    .max(255, "Document title must not exceed 255 characters."),

  fileName: z
    .string()
    .trim()
    .min(1, "File name cannot be empty.")
    .max(255, "File name must not exceed 255 characters."),

  storageKey: z
    .string()
    .trim()
    .min(1, "Storage key cannot be empty.")
    .max(500, "Storage key cannot be empty."),

  mimeType: z
    .string()
    .trim()
    .min(1, "MIME type cannot be empty.")
    .max(100, "MIME type must not exceed 100 characters."),

  fileSize: z
    .number()
    .int("File size must be an integer.")
    .positive("File size must be greater than zero."),

  checksum: z
    .string()
    .trim()
    .max(255, "Checksum must not exceed 255 characters.")
    .optional(),
});

// ============================================================
// UPDATE DOCUMENT
// ============================================================

export const updateDocumentSchema = z
  .object({
    documentType: z
      .string()
      .trim()
      .min(1, "Document type cannot be empty.")
      .max(100, "Document type must not exceed 100 characters.")
      .optional(),

    title: z
      .string()
      .trim()
      .min(1, "Document title cannot be empty.")
      .max(255, "Document title must not exceed 255 characters.")
      .optional(),

    fileName: z
      .string()
      .trim()
      .min(1, "File name cannot be empty.")
      .max(255, "File name must not be empty.")
      .optional(),

    storageKey: z
      .string()
      .trim()
      .min(1, "Storage key cannot be empty.")
      .max(500, "Storage key must not exceed 500 characters.")
      .optional(),

    mimeType: z
      .string()
      .trim()
      .min(1, "MIME type cannot be empty.")
      .max(100, "MIME type must not exceed 100 characters.")
      .optional(),

    fileSize: z
      .number()
      .int("File size must be an integer.")
      .positive("File size must be greater than zero.")
      .optional(),

    checksum: z
      .string()
      .trim()
      .max(255, "Checksum must not exceed 255 characters.")
      .optional(),
  })
  .refine(
    (data) =>
      data.documentType !== undefined ||
      data.title !== undefined ||
      data.fileName !== undefined ||
      data.storageKey !== undefined ||
      data.mimeType !== undefined ||
      data.fileSize !== undefined ||
      data.checksum !== undefined,
    {
      message: "At least one field must be provided.",
    },
  );

// ============================================================
// PARAMETER SCHEMAS
// ============================================================

export const documentIdParamSchema = z.object({
  documentId: z.string().uuid("Invalid document ID."),
});

export const caseIdParamSchema = z.object({
  caseId: z.string().uuid("Invalid case ID."),
});

// ============================================================
// TYPES
// ============================================================

export type CreateDocumentInput = z.infer<
  typeof createDocumentSchema
>;

export type UpdateDocumentInput = z.infer<
  typeof updateDocumentSchema
>;