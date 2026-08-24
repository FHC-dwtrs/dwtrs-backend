import { z } from "zod";

export const createCaseSchema = z.object({
  customer: z.object({
    name: z.string().min(1).max(150),
    phone: z.string().min(1).max(30),
    email: z.string().email().max(255).optional(),
    address: z.string().max(500).optional(),
  }),

  incomingReferenceNo: z
    .string()
    .max(100)
    .optional(),

  subject: z.string().min(1).max(500),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;

// ============================================================
// UPDATE CASE
// ============================================================

export const updateCaseSchema = z
  .object({
    customer: z
      .object({
        name: z.string().trim().min(1).max(150).optional(),
        phone: z.string().trim().min(1).max(30).optional(),
        email: z.string().email().max(255).optional(),
        address: z.string().max(500).optional(),
      })
      .optional(),

    incomingReferenceNo: z
      .string()
      .trim()
      .max(100)
      .nullable()
      .optional(),

    subject: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional(),
  })
  .refine(
    (data) =>
      data.customer !== undefined ||
      data.incomingReferenceNo !== undefined ||
      data.subject !== undefined,
    {
      message: "At least one field must be provided for update.",
    },
  );

export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;