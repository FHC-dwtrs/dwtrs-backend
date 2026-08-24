import { z } from "zod";

// ============================================================
// ASSIGN CASE
// ============================================================

export const assignCaseSchema = z.object({
  toUnitId: z.string().uuid(),
  remarks: z.string().max(1000).optional(),
});

export type AssignCaseInput = z.infer<typeof assignCaseSchema>;

// ============================================================
// MAKE CASE DECISION
// ============================================================

export const caseDecisionSchema = z.object({
  decisionType: z.enum(["APPROVED", "REJECTED"]),
  decisionText: z.string().max(2000).optional(),
});

export type CaseDecisionInput = z.infer<typeof caseDecisionSchema>;

// ============================================================
// RETURN CASE
// ============================================================

export const returnCaseSchema = z.object({
  remarks: z
    .string()
    .min(1, "Return remarks are required.")
    .max(1000),
});

export type ReturnCaseInput = z.infer<typeof returnCaseSchema>;

// ============================================================
// TRANSFER CASE
// ============================================================

export const transferCaseSchema = z.object({
  toUnitId: z.string().uuid(),
  remarks: z.string().max(1000).optional(),
});

export type TransferCaseInput = z.infer<typeof transferCaseSchema>;

// ============================================================
// REASSIGN CASE
// ============================================================

export const reassignCaseSchema = z.object({
  toUnitId: z.string().uuid(),
  remarks: z.string().max(1000).optional(),
});

export type ReassignCaseInput = z.infer<typeof reassignCaseSchema>;