import { z } from "zod";

export const createDocumentSchema = z.object({
  documentType: z
    .string()
    .trim()
    .min(1, "Document type is required")
    .max(100, "Document type must not exceed 100 characters"),

  title: z
    .string()
    .trim()
    .min(1, "Document title is required")
    .max(255, "Document title must not exceed 255 characters"),
});