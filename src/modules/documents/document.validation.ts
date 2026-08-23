import { z } from "zod";

// ============================================================
// CREATE DOCUMENT
// ============================================================

export const createDocumentSchema = z.object({
  caseId: z
    .string()
    .uuid("Invalid case ID."),

  documentType: z
    .string()
    .trim()
    .min(1, "Document type is required.")
    .max(100, "Document type must not exceed 100 characters."),

  title: z
    .string()
    .trim()
    .min(1, "Document title is required.")
    .max(255, "Document title must not exceed 255 characters."),
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
  })
  .refine(
    (data) =>
      data.documentType !== undefined ||
      data.title !== undefined,
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

