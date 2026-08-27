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

router.post(
    "/",
    authenticate,
    authorize("CASE_CREATE"),
    createCaseController,
  );

router.get(
  "/",
  authenticate,
  authorize("CASE_VIEW"),
  getCasesController,
);

router.get(
  "/:caseId",
  authenticate,
  authorize("CASE_VIEW"),
  getCaseByIdController,
);

// ============================================================
// UPDATE CASE
// ============================================================

router.patch(
  "/:caseId",
  authenticate,
  authorize("CASE_UPDATE"),
  updateCaseController,
);

export default router;