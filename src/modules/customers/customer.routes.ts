import { Router } from "express";

import {
  getCustomersController,
  getCustomerByIdController,
  getCustomerCasesController,
  createCustomerController,
  updateCustomerController,
  searchCustomersController,
} from "./customer.controller";

const router = Router();

// ============================================================
// CUSTOMER ROUTES
// ============================================================

// Search customers
router.get("/search", searchCustomersController);

// Get all customers
router.get("/", getCustomersController);

// Create customer
router.post("/", createCustomerController);

// Get customer with cases
router.get(
  "/:customerId/cases",
  getCustomerCasesController,
);

// Get customer by ID
router.get(
  "/:customerId",
  getCustomerByIdController,
);

// Update customer
router.patch(
  "/:customerId",
  updateCustomerController,
);

export default router;