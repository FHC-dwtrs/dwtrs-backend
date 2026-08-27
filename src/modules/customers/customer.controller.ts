import { Request, Response } from "express";
import {
  getCustomers,
  getCustomerById,
  getCustomerWithCases,
  createCustomer,
  updateCustomer,
  searchCustomers,
} from "./customer.service.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "./customer.validation.js";

// ============================================================
// GET ALL CUSTOMERS
// ============================================================

export async function getCustomersController(
req: Request,
  res: Response,
) {
  try {
    const customers = await getCustomers();

    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get customers",
    });
  }
}

// ============================================================
// GET CUSTOMER BY ID
// ============================================================

export async function getCustomerByIdController(
 req: Request<{ customerId: string }>,
  res: Response,
) {
  try {
    const { customerId } = req.params;

    const customer = await getCustomerById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Get customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get customer",
    });
  }
}

// ============================================================
// GET CUSTOMER WITH CASES
// ============================================================

export async function getCustomerCasesController(
    req: Request<{ customerId: string }>,
  res: Response,
) {
  try {
    const { customerId } = req.params;

    const customer =
      await getCustomerWithCases(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Get customer cases error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get customer cases",
    });
  }
}

// ============================================================
// CREATE CUSTOMER
// ============================================================

export async function createCustomerController(
  req: Request,
  res: Response,
) {
  try {
    const result =
      createCustomerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const customer = await createCustomer(result.data);

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
}

// ============================================================
// UPDATE CUSTOMER
// ============================================================

export async function updateCustomerController(
    req: Request<{ customerId: string }>,
  res: Response,
) {
  try {
    const { customerId } = req.params;

    const result =
      updateCustomerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const customer = await updateCustomer(
      customerId,
      result.data,
    );

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);

    if (
      error instanceof Error &&
      error.message === "Customer not found"
    ) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
}

// ============================================================
// SEARCH CUSTOMERS
// ============================================================

export async function searchCustomersController(
  req: Request,
  res: Response,
) {
  try {
    const search = String(req.query.search ?? "").trim();

    if (!search) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const customers = await searchCustomers(search);

    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Search customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to search customers",
    });
  }
}