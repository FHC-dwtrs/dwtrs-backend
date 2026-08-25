import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(150),

  unitType: z.enum([
    "SECTOR",
    "DIRECTORATE",
    "GROUP",
  ]),

  parentUnitId: z
    .string()
    .uuid()
    .nullable()
    .optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),

  parentUnitId: z
    .string()
    .uuid()
    .nullable()
    .optional(),
});

export const updateOrganizationStatusSchema =
  z.object({
    isActive: z.boolean(),
  });

export const organizationQuerySchema = z.object({
  unitType: z
    .enum([
      "SECTOR",
      "DIRECTORATE",
      "GROUP",
    ])
    .optional(),

  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export type CreateOrganizationInput =
  z.infer<typeof createOrganizationSchema>;

export type UpdateOrganizationInput =
  z.infer<typeof updateOrganizationSchema>;

export type UpdateOrganizationStatusInput =
  z.infer<typeof updateOrganizationStatusSchema>;

export type OrganizationQueryInput =
  z.infer<typeof organizationQuerySchema>;