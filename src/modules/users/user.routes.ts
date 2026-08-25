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
// USERS
// ============================================================

// Create user
router.post(
  "/users",
  authenticate,
  authorize("USER_CREATE"),
  createUserController,
);

// Get all users
router.get(
  "/users",
  authenticate,
  authorize("USER_VIEW"),
  getUsersController,
);

// Get user
router.get(
  "/users/:userId",
  authenticate,
  authorize("USER_VIEW"),
  getUserController,
);

// Update user
router.patch(
  "/users/:userId",
  authenticate,
  authorize("USER_UPDATE"),
  updateUserController,
);

// Activate / deactivate
router.patch(
  "/users/:userId/status",
  authenticate,
  authorize("USER_UPDATE"),
  updateUserStatusController,
);

// Assign organizational unit
router.patch(
  "/users/:userId/unit",
  authenticate,
  authorize("USER_UPDATE"),
  assignUserUnitController,
);

export default router;