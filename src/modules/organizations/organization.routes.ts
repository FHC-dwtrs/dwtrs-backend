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

/**
 * @swagger
 * /organizations:
 *   get:
 *     summary: Get organizational units
 *     description: Retrieve organizational units, optionally filtered by unit type and active status.
 *     tags:
 *       - Organizations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unitType
 *         required: false
 *         description: Filter by organizational unit type.
 *         schema:
 *           type: string
 *           enum:
 *             - SECTOR
 *             - DIRECTORATE
 *             - GROUP
 *         example: SECTOR
 *       - in: query
 *         name: isActive
 *         required: false
 *         description: Filter by active status.
 *         schema:
 *           type: boolean
 *         example: true
 *     responses:
 *       200:
 *         description: Organizational units retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to retrieve organizational units
 */
router.get(
  "/",
  authenticate,
  authorize("UNIT_VIEW"),
  getOrganizationsController,
);

/**
 * @swagger
 * /organizations:
 *   post:
 *     summary: Create an organizational unit
 *     description: Create a Sector, Directorate, or Group.
 *     tags:
 *       - Organizations
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
 *               - unitType
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 150
 *                 example: Records & Archive Directorate
 *               unitType:
 *                 type: string
 *                 enum:
 *                   - SECTOR
 *                   - DIRECTORATE
 *                   - GROUP
 *                 example: DIRECTORATE
 *               parentUnitId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Parent organizational unit ID.
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       201:
 *         description: Organizational unit created successfully
 *       400:
 *         description: Invalid organizational unit data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to create organizational unit
 */
router.post(
  "/",
  authenticate,
  authorize("UNIT_CREATE"),
  createOrganizationController,
);

/**
 * @swagger
 * /organizations/{unitId}/children:
 *   get:
 *     summary: Get child organizational units
 *     description: Retrieve the organizational units directly under a parent unit.
 *     tags:
 *       - Organizations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unitId
 *         required: true
 *         description: Parent organizational unit ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Child organizational units retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Organizational unit not found
 *       500:
 *         description: Failed to retrieve child units
 */
router.get(
  "/:unitId/children",
  authenticate,
  authorize("UNIT_VIEW"),
  getOrganizationChildrenController,
);

/**
 * @swagger
 * /organizations/{unitId}/users:
 *   get:
 *     summary: Get users in an organizational unit
 *     description: Retrieve users belonging to an organizational unit.
 *     tags:
 *       - Organizations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unitId
 *         required: true
 *         description: Organizational unit ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Organizational unit not found
 *       500:
 *         description: Failed to retrieve organizational unit users
 */
router.get(
  "/:unitId/users",
  authenticate,
  authorize("UNIT_VIEW"),
  getOrganizationUsersController,
);

/**
 * @swagger
 * /organizations/{unitId}:
 *   get:
 *     summary: Get organizational unit by ID
 *     tags:
 *       - Organizations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unitId
 *         required: true
 *         description: Organizational unit ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Organizational unit retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Organizational unit not found
 *       500:
 *         description: Failed to retrieve organizational unit
 */
router.get(
  "/:unitId",
  authenticate,
  authorize("UNIT_VIEW"),
  getOrganizationByIdController,
);

/**
 * @swagger
 * /organizations/{unitId}:
 *   patch:
 *     summary: Update an organizational unit
 *     description: Update the name or parent organizational unit.
 *     tags:
 *       - Organizations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unitId
 *         required: true
 *         description: Organizational unit ID
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
 *                 example: Updated Records & Archive Directorate
 *               parentUnitId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Organizational unit updated successfully
 *       400:
 *         description: Invalid organizational unit data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Organizational unit not found
 *       500:
 *         description: Failed to update organizational unit
 */
router.patch(
  "/:unitId",
  authenticate,
  authorize("UNIT_UPDATE"),
  updateOrganizationController,
);

/**
 * @swagger
 * /organizations/{unitId}/status:
 *   patch:
 *     summary: Activate or deactivate an organizational unit
 *     description: Change the active status of an organizational unit.
 *     tags:
 *       - Organizations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unitId
 *         required: true
 *         description: Organizational unit ID
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
 *         description: Organizational unit status updated successfully
 *       400:
 *         description: Invalid status value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Organizational unit not found
 *       500:
 *         description: Failed to update organizational unit status
 */
router.patch(
  "/:unitId/status",
  authenticate,
  // authorize("UNIT_UPDATE"),
  // authorize("UNIT_DEACTIVATE"),
  updateOrganizationStatusController,
);

export default router;