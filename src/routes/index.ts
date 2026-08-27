import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes";
import caseRoutes from "../modules/cases/case.routes";
import workflowRoutes from "../modules/workflow/workflow.routes";
import documentRoutes from "../modules/documents/document.route";
import notificationRoutes from "../modules/notifications/notification.route";
import reportsRoutes from "../modules/reports/reports.route";
import customerRoutes from "../modules/customers/customer.routes";
import organizationRoutes from "../modules/organizations/organization.routes";
import userRoutes from "../modules/users/user.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/cases", caseRoutes);
router.use("/workflow", workflowRoutes);
router.use("/", documentRoutes);
router.use("/", notificationRoutes);
router.use("/reports", reportsRoutes);
router.use("/customers", customerRoutes);
router.use("/organizations", organizationRoutes);
router.use("/", userRoutes);

export default router;