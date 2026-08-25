import { z } from "zod";

// ============================================================
// CREATE USER
// ============================================================

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .max(150, "Name cannot exceed 150 characters."),

  email: z
    .string()
    .email("Invalid email address.")
    .max(255, "Email cannot exceed 255 characters."),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password cannot exceed 100 characters."),

  unitId: z
    .string()
    .uuid("Invalid organizational unit ID.")
    .nullable()
    .optional(),

  isActive: z.boolean().optional(),
});

// ============================================================
// UPDATE USER
// ============================================================

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(150)
    .optional(),

  email: z
    .string()
    .email("Invalid email address.")
    .max(255)
    .optional(),

  unitId: z
    .string()
    .uuid("Invalid organizational unit ID.")
    .nullable()
    .optional(),
});

// ============================================================
// UPDATE USER STATUS
// ============================================================

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

// ============================================================
// ASSIGN UNIT
// ============================================================

export const assignUserUnitSchema = z.object({
  unitId: z
    .string()
    .uuid("Invalid organizational unit ID.")
    .nullable(),
});

// ============================================================
// TYPES
// ============================================================

export type CreateUserInput = z.infer<
  typeof createUserSchema
>;

export type UpdateUserInput = z.infer<
  typeof updateUserSchema
>;

export type UpdateUserStatusInput = z.infer<
  typeof updateUserStatusSchema
>;

export type AssignUserUnitInput = z.infer<
  typeof assignUserUnitSchema
>;