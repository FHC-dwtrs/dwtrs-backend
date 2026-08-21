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