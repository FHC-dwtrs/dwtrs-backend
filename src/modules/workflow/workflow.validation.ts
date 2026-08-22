import { z } from "zod";
//for assigning a case to a unit
export const assignCaseSchema = z.object({
  toUnitId: z.string().uuid(),
  remarks: z.string().max(1000).optional(),
});

export type AssignCaseInput = z.infer<typeof assignCaseSchema>;


//for making a decision on a case
export const caseDecisionSchema = z.object({
  decisionType: z.enum(["APPROVED", "REJECTED"]),
  decisionText: z.string().max(2000).optional(),
});

export type CaseDecisionInput = z.infer<
  typeof caseDecisionSchema
>;

//returning a case to the previous unit
export const returnCaseSchema = z.object({
  remarks: z
    .string()
    .min(1, "Return remarks are required.")
    .max(1000),
});

export type ReturnCaseInput = z.infer<typeof returnCaseSchema>;