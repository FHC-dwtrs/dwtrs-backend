import { Router } from "express";

import {
  getCustomersController,
  getCustomerByIdController,
  getCustomerCasesController,
  createCustomerController,
  updateCustomerController,
  searchCustomersController,
} from "./customer.controller.js";

const router = Router();

// ============================================================
// CUSTOMER ROUTES
// ============================================================

/**
 * @swagger
 * /customers/search:
 *   get:
 *     summary: Search customers
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         description: Search term for finding customers
 *         schema:
 *           type: string
 *         example: Abebe
 *     responses:
 *       200:
 *         description: Customers found successfully
 *       400:
 *         description: Invalid search query
 *       500:
 *         description: Failed to search customers
 */
router.get("/search", searchCustomersController);

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: Get all customers
 *     tags:
 *       - Customers
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 *       500:
 *         description: Failed to retrieve customers
 */
router.get("/", getCustomersController);

/**
 * @swagger
 * /customers:
 *   post:
 *     summary: Create a customer
 *     tags:
 *       - Customers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 150
 *                 example: Abebe Kebede
 *               phone:
 *                 type: string
 *                 maxLength: 30
 *                 example: "0911223344"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 example: abebe@example.com
 *               address:
 *                 type: string
 *                 maxLength: 500
 *                 example: Addis Ababa
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Invalid customer data
 *       500:
 *         description: Failed to create customer
 */
router.post("/", createCustomerController);

/**
 * @swagger
 * /customers/{customerId}/cases:
 *   get:
 *     summary: Get all cases for a customer
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         description: Customer ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Customer cases retrieved successfully
 *       400:
 *         description: Invalid customer ID
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Failed to retrieve customer cases
 */
router.get(
  "/:customerId/cases",
  getCustomerCasesController,
);

/**
 * @swagger
 * /customers/{customerId}:
 *   get:
 *     summary: Get customer by ID
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         description: Customer ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *       400:
 *         description: Invalid customer ID
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Failed to retrieve customer
 */
router.get(
  "/:customerId",
  getCustomerByIdController,
);

/**
 * @swagger
 * /customers/{customerId}:
 *   patch:
 *     summary: Update a customer
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         description: Customer ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 150
 *                 example: Abebe Kebede
 *               phone:
 *                 type: string
 *                 maxLength: 30
 *                 example: "0911223344"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 nullable: true
 *                 example: abebe@example.com
 *               address:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *                 example: Addis Ababa
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       400:
 *         description: Invalid customer data
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Failed to update customer
 */
router.patch(
  "/:customerId",
  updateCustomerController,
);

export default router;