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

router.post(
  "/cases/:caseId/assign",
  authenticate,
  authorize("WORKFLOW_ASSIGN"),
  assignCaseController,
);

// ============================================================
// RETURN
// ============================================================

router.post(
  "/cases/:caseId/return",
  authenticate,
  authorize("WORKFLOW_RETURN"),
  returnCaseController,
);

// ============================================================
// TRANSFER
// ============================================================

router.post(
  "/cases/:caseId/transfer",
  authenticate,
  authorize("WORKFLOW_ASSIGN"),
  transferCaseController,
);

// ============================================================
// REASSIGN
// ============================================================

router.post(
  "/cases/:caseId/reassign",
  authenticate,
  authorize("WORKFLOW_REASSIGN"),
  reassignCaseController,
);

// ============================================================
// DECISION
// ============================================================

router.post(
  "/cases/:caseId/decision",
  authenticate,
  authorize("CASE_CHANGE_STATUS"),
  makeCaseDecisionController,
);

export default router;