import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize";
import {
  getCasesController,
  getCaseByIdController,
  createCaseController,
  updateCaseController,
} from "./case.controller";


const router = Router();
/**
 * @swagger
 * /cases:
 *   post:
 *     summary: Create a new case
 *     description: Create a new case with customer information and case details.
 *     tags:
 *       - Cases
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer
 *               - subject
 *             properties:
 *               customer:
 *                 type: object
 *                 required:
 *                   - name
 *                   - phone
 *                 properties:
 *                   name:
 *                     type: string
 *                     maxLength: 150
 *                     example: Abebe Kebede
 *                   phone:
 *                     type: string
 *                     maxLength: 30
 *                     example: "0911223344"
 *                   email:
 *                     type: string
 *                     format: email
 *                     maxLength: 255
 *                     example: abebe@example.com
 *                   address:
 *                     type: string
 *                     maxLength: 500
 *                     example: Addis Ababa
 *               incomingReferenceNo:
 *                 type: string
 *                 maxLength: 100
 *                 example: FHC/RA/001
 *               subject:
 *                 type: string
 *                 maxLength: 500
 *                 example: Housing application
 *     responses:
 *       201:
 *         description: Case created successfully
 *       400:
 *         description: Invalid case data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to create case
 */
router.post(
  "/",
  authenticate,
  authorize("CASE_CREATE"),
  createCaseController,
);

/**
 * @swagger
 * /cases:
 *   get:
 *     summary: Get all cases
 *     description: Retrieve all cases.
 *     tags:
 *       - Cases
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cases retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to retrieve cases
 */
router.get(
  "/",
  authenticate,
  authorize("CASE_VIEW"),
  getCasesController,
);

/**
 * @swagger
 * /cases/{caseId}:
 *   get:
 *     summary: Get case by ID
 *     description: Retrieve a specific case using its ID.
 *     tags:
 *       - Cases
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: caseId
 *         in: path
 *         required: true
 *         description: Case ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Case retrieved successfully
 *       400:
 *         description: Invalid case ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 *       500:
 *         description: Failed to retrieve case
 */
router.get(
  "/:caseId",
  authenticate,
  authorize("CASE_VIEW"),
  getCaseByIdController,
);

/**
 * @swagger
 * /cases/{caseId}:
 *   patch:
 *     summary: Update a case
 *     description: Update one or more fields of an existing case. At least one field must be provided.
 *     tags:
 *       - Cases
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: caseId
 *         in: path
 *         required: true
 *         description: Case ID
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
 *               customer:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     maxLength: 150
 *                     example: Abebe Kebede
 *                   phone:
 *                     type: string
 *                     maxLength: 30
 *                     example: "0911223344"
 *                   email:
 *                     type: string
 *                     format: email
 *                     maxLength: 255
 *                     example: abebe@example.com
 *                   address:
 *                     type: string
 *                     maxLength: 500
 *                     example: Addis Ababa
 *               incomingReferenceNo:
 *                 type: string
 *                 maxLength: 100
 *                 nullable: true
 *                 example: FHC/RA/002
 *               subject:
 *                 type: string
 *                 maxLength: 500
 *                 example: Updated housing application
 *     responses:
 *       200:
 *         description: Case updated successfully
 *       400:
 *         description: Invalid case ID or update data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 *       500:
 *         description: Failed to update case
 */
router.patch(
  "/:caseId",
  authenticate,
  authorize("CASE_UPDATE"),
  updateCaseController,
);
export default router;