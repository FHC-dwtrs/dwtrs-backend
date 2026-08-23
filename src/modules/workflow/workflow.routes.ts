import { Router } from "express";

import { authenticate, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize";

import { assignCaseController, makeCaseDecisionController, returnCaseController } from "./workflow.controller";
import { reassignCase, transferCase } from "./workflow.service";

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
  "/cases/:caseId/transfer",
  authenticate,
  authorize("WORKFLOW_ASSIGN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await transferCase(
        req.params.caseId as string,
        req.user!.sub,
        req.body,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);


router.post(
  "/cases/:caseId/reassign",
  authenticate,
  authorize("WORKFLOW_REASSIGN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await reassignCase(
        req.params.caseId as string,
        req.user!.sub,
        req.body,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/cases/:caseId/decision",
  authenticate,
  authorize("CASE_CHANGE_STATUS"),
  makeCaseDecisionController,
);

export default router;