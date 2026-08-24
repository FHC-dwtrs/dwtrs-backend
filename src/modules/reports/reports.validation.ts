import { z } from "zod";

export const reportFilterSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),

  unitId: z.string().uuid().optional(),

  unitType: z
    .enum(["SECTOR", "DIRECTORATE", "GROUP"])
    .optional(),

  status: z
    .enum([
      "SUBMITTED",
      "UNDER_REVIEW",
      "IN_PROGRESS",
      "PENDING_CLARIFICATION",
      "SENT_BACK_FOR_CORRECTION",
      "APPROVED",
      "REJECTED",
      "COMPLETED",
      "ARCHIVED",
    ])
    .optional(),

  period: z
    .enum(["DAILY", "WEEKLY", "MONTHLY", "ANNUAL"])
    .default("MONTHLY"),
});

export type ReportFilterInput = z.infer<
  typeof reportFilterSchema
>;