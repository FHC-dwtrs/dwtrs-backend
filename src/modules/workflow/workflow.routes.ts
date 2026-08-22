import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize";

import { assignCaseController, makeCaseDecisionController, returnCaseController } from "./workflow.controller";

const router = Router();

router.post(
  "/cases/:caseId/assign",
  authenticate,
  authorize("WORKFLOW_ASSIGN"),
  assignCaseController,
);

router.post(
  "/cases/:caseId/return",
  authenticate,
  authorize("WORKFLOW_RETURN"),
  returnCaseController,
);


router.post(
  "/cases/:caseId/decision",
  authenticate,
  authorize("CASE_CHANGE_STATUS"),
  makeCaseDecisionController,
);

export default router;