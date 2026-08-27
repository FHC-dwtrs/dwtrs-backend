import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize";

import {
  createUserController,
  getUsersController,
  getUserController,
  updateUserController,
  updateUserStatusController,
  assignUserUnitController,
} from "./user.controller";

const router = Router();

// ============================================================
// CREATE USER
// ============================================================

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a user
 *     description: Create a new system user and optionally assign them to an organizational unit.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 150
 *                 example: Abebe Kebede
 *               email:
 *                 type: string
 *                 format: email
 *                 example: abebe@fhc.gov.et
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 100
 *                 example: Password123!
 *               unitId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid user data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to create user
 */
router.post(
  "/users",
  authenticate,
  authorize("USER_CREATE"),
  createUserController,
);

// ============================================================
// GET ALL USERS
// ============================================================

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve all system users.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to retrieve users
 */
router.get(
  "/users",
  authenticate,
  authorize("USER_VIEW"),
  getUsersController,
);

// ============================================================
// GET USER
// ============================================================

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: User ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to retrieve user
 */
router.get(
  "/users/:userId",
  authenticate,
  authorize("USER_VIEW"),
  getUserController,
);

// ============================================================
// UPDATE USER
// ============================================================

/**
 * @swagger
 * /users/{userId}:
 *   patch:
 *     summary: Update user
 *     description: Update a user's name, email, or organizational unit.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: User ID
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
 *                 minLength: 2
 *                 maxLength: 150
 *                 example: Abebe Kebede
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 example: abebe@fhc.gov.et
 *               unitId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Invalid user data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to update user
 */
router.patch(
  "/users/:userId",
  authenticate,
  authorize("USER_UPDATE"),
  updateUserController,
);

// ============================================================
// ACTIVATE / DEACTIVATE USER
// ============================================================

/**
 * @swagger
 * /users/{userId}/status:
 *   patch:
 *     summary: Activate or deactivate a user
 *     description: Change the active status of a user.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: User ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       400:
 *         description: Invalid status value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to update user status
 */
router.patch(
  "/users/:userId/status",
  authenticate,
  authorize("USER_UPDATE"),
  updateUserStatusController,
);

// ============================================================
// ASSIGN ORGANIZATIONAL UNIT
// ============================================================

/**
 * @swagger
 * /users/{userId}/unit:
 *   patch:
 *     summary: Assign user to an organizational unit
 *     description: Assign or remove a user's organizational unit.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: User ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *             properties:
 *               unitId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Organizational unit ID. Set to null to remove the user's unit.
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: User organizational unit updated successfully
 *       400:
 *         description: Invalid organizational unit ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User or organizational unit not found
 *       500:
 *         description: Failed to assign organizational unit
 */
router.patch(
  "/users/:userId/unit",
  authenticate,
  authorize("USER_UPDATE"),
  assignUserUnitController,
);

export default router;