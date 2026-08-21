import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize";
import {
  getCasesController,
  getCaseByIdController,
  createCaseController,
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

export default router;