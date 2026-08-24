import { z } from "zod";

// ============================================================
// CREATE DOCUMENT
// ============================================================

export const createDocumentSchema = z.object({
  documentType: z
    .string()
    .trim()
    .min(1, "Document type is required")
    .max(
      100,
      "Document type must not exceed 100 characters",
    ),

  title: z
    .string()
    .trim()
    .min(1, "Document title is required")
    .max(
      255,
      "Document title must not exceed 255 characters",
    ),
});

// ============================================================
// UPDATE DOCUMENT
// ============================================================

export const updateDocumentSchema = z
  .object({
    documentType: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    title: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .optional(),
  })
  .refine(
    (data) =>
      data.documentType !== undefined ||
      data.title !== undefined,
    {
      message:
        "At least one document field must be provided.",
    },
  );

export type UpdateDocumentInput =
  z.infer<typeof updateDocumentSchema>;