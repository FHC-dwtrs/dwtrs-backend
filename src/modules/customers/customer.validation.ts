import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z
    .string()
    .min(1, "Customer name is required")
    .max(150, "Customer name must not exceed 150 characters"),

  phone: z
    .string()
    .min(1, "Customer phone is required")
    .max(30, "Customer phone must not exceed 30 characters"),

  email: z
    .string()
    .email("Invalid email address")
    .max(255)
    .optional(),

  address: z
    .string()
    .max(500, "Address must not exceed 500 characters")
    .optional(),
});

export const updateCustomerSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(150)
    .optional(),

  phone: z
    .string()
    .min(1)
    .max(30)
    .optional(),

  email: z
    .string()
    .email("Invalid email address")
    .max(255)
    .optional()
    .nullable(),

  address: z
    .string()
    .max(500)
    .optional()
    .nullable(),
});

export type CreateCustomerInput = z.infer<
  typeof createCustomerSchema
>;

export type UpdateCustomerInput = z.infer<
  typeof updateCustomerSchema
>;