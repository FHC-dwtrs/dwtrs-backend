import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize";

import {
  createOrganizationController,
  getOrganizationsController,
  getOrganizationByIdController,
  updateOrganizationController,
  updateOrganizationStatusController,
  getOrganizationChildrenController,
  getOrganizationUsersController,
} from "./organization.controller";

const router = Router();

// ============================================================
// LIST
// ============================================================

router.get(
  "/",
  authenticate,
  authorize("UNIT_VIEW"),
  getOrganizationsController,
);

// ============================================================
// CREATE
// ============================================================

router.post(
  "/",
  authenticate,
  authorize("UNIT_CREATE"),
  createOrganizationController,
);

// ============================================================
// CHILDREN
// ============================================================

router.get(
  "/:unitId/children",
  authenticate,
  authorize("UNIT_VIEW"),
  getOrganizationChildrenController,
);

// ============================================================
// USERS IN UNIT
// ============================================================

router.get(
  "/:unitId/users",
  authenticate,
  authorize("UNIT_VIEW"),
  getOrganizationUsersController,
);

// ============================================================
// GET ONE
// ============================================================

router.get(
  "/:unitId",
  authenticate,
  authorize("UNIT_VIEW"),
  getOrganizationByIdController,
);

// ============================================================
// UPDATE
// ============================================================

router.patch(
  "/:unitId",
  authenticate,
  authorize("UNIT_UPDATE"),
  updateOrganizationController,
);

// ============================================================
// ACTIVATE / DEACTIVATE
// ============================================================

router.patch(
  "/:unitId/status",
  authenticate,
 // authorize("UNIT_UPDATE"),
 //authorize("UNIT_DEACTIVATE"),
  updateOrganizationStatusController,
);

export default router;