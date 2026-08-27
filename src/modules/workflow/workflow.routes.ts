import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize";

import {
  assignCaseController,
  makeCaseDecisionController,
  returnCaseController,
  transferCaseController,
  reassignCaseController,
} from "./workflow.controller";

const router = Router();

// ============================================================
// ASSIGN
// ============================================================

/**
 * @swagger
 * /workflow/cases/{caseId}/assign:
 *   post:
 *     summary: Assign a case
 *     description: Assign a case to an organizational unit.
 *     tags:
 *       - Workflow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
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
 *             required:
 *               - toUnitId
 *             properties:
 *               toUnitId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the organizational unit receiving the case
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               remarks:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Please review this case.
 *     responses:
 *       200:
 *         description: Case assigned successfully
 *       400:
 *         description: Invalid case ID or request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case or organizational unit not found
 *       500:
 *         description: Failed to assign case
 */
router.post(
  "/cases/:caseId/assign",
  authenticate,
  authorize("WORKFLOW_ASSIGN"),
  assignCaseController,
);

// ============================================================
// RETURN
// ============================================================

/**
 * @swagger
 * /workflow/cases/{caseId}/return:
 *   post:
 *     summary: Return a case
 *     description: Return a case to the previous organizational unit with remarks.
 *     tags:
 *       - Workflow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
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
 *             required:
 *               - remarks
 *             properties:
 *               remarks:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *                 example: Missing supporting document. Please provide it.
 *     responses:
 *       200:
 *         description: Case returned successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 *       500:
 *         description: Failed to return case
 */
router.post(
  "/cases/:caseId/return",
  authenticate,
  authorize("WORKFLOW_RETURN"),
  returnCaseController,
);

// ============================================================
// TRANSFER
// ============================================================

/**
 * @swagger
 * /workflow/cases/{caseId}/transfer:
 *   post:
 *     summary: Transfer a case
 *     description: Transfer a case to another organizational unit.
 *     tags:
 *       - Workflow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
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
 *             required:
 *               - toUnitId
 *             properties:
 *               toUnitId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the organizational unit receiving the case
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               remarks:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Transferring this case to the appropriate sector.
 *     responses:
 *       200:
 *         description: Case transferred successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case or organizational unit not found
 *       500:
 *         description: Failed to transfer case
 */
router.post(
  "/cases/:caseId/transfer",
  authenticate,
  authorize("WORKFLOW_ASSIGN"),
  transferCaseController,
);

// ============================================================
// REASSIGN
// ============================================================

/**
 * @swagger
 * /workflow/cases/{caseId}/reassign:
 *   post:
 *     summary: Reassign a case
 *     description: Reassign a case to another organizational unit.
 *     tags:
 *       - Workflow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
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
 *             required:
 *               - toUnitId
 *             properties:
 *               toUnitId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the organizational unit receiving the case
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               remarks:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Reassigning to the correct organizational unit.
 *     responses:
 *       200:
 *         description: Case reassigned successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case or organizational unit not found
 *       500:
 *         description: Failed to reassign case
 */
router.post(
  "/cases/:caseId/reassign",
  authenticate,
  authorize("WORKFLOW_REASSIGN"),
  reassignCaseController,
);

// ============================================================
// DECISION
// ============================================================

/**
 * @swagger
 * /workflow/cases/{caseId}/decision:
 *   post:
 *     summary: Make a case decision
 *     description: Approve or reject a case.
 *     tags:
 *       - Workflow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caseId
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
 *             required:
 *               - decisionType
 *             properties:
 *               decisionType:
 *                 type: string
 *                 enum:
 *                   - APPROVED
 *                   - REJECTED
 *                 example: APPROVED
 *               decisionText:
 *                 type: string
 *                 maxLength: 2000
 *                 example: The case has been reviewed and approved.
 *     responses:
 *       200:
 *         description: Case decision recorded successfully
 *       400:
 *         description: Invalid decision data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 *       500:
 *         description: Failed to make case decision
 */
router.post(
  "/cases/:caseId/decision",
  authenticate,
  authorize("CASE_CHANGE_STATUS"),
  makeCaseDecisionController,
);

export default router;