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
  authorize("ORGANIZATION_VIEW"),
  getOrganizationsController,
);

// ============================================================
// CREATE
// ============================================================

router.post(
  "/",
  authenticate,
  authorize("ORGANIZATION_CREATE"),
  createOrganizationController,
);

// ============================================================
// CHILDREN
// ============================================================

router.get(
  "/:unitId/children",
  authenticate,
  authorize("ORGANIZATION_VIEW"),
  getOrganizationChildrenController,
);

// ============================================================
// USERS IN UNIT
// ============================================================

router.get(
  "/:unitId/users",
  authenticate,
  authorize("ORGANIZATION_VIEW"),
  getOrganizationUsersController,
);

// ============================================================
// GET ONE
// ============================================================

router.get(
  "/:unitId",
  authenticate,
  authorize("ORGANIZATION_VIEW"),
  getOrganizationByIdController,
);

// ============================================================
// UPDATE
// ============================================================

router.patch(
  "/:unitId",
  authenticate,
  authorize("ORGANIZATION_UPDATE"),
  updateOrganizationController,
);

// ============================================================
// ACTIVATE / DEACTIVATE
// ============================================================

router.patch(
  "/:unitId/status",
  authenticate,
  authorize("ORGANIZATION_UPDATE"),
  updateOrganizationStatusController,
);

export default router;