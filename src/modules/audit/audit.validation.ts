import { z } from "zod";

export const auditLogQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  caseId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  action: z.string().optional(),

  from: z
    .string()
    .datetime()
    .optional(),

  to: z
    .string()
    .datetime()
    .optional(),

  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
});

export type AuditLogQueryInput = z.infer<
  typeof auditLogQuerySchema
>;