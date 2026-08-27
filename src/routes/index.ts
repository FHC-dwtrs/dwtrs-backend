import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import caseRoutes from "../modules/cases/case.routes.js";
import workflowRoutes from "../modules/workflow/workflow.routes.js";
import documentRoutes from "../modules/documents/document.route.js";
import notificationRoutes from "../modules/notifications/notification.route.js";
import reportsRoutes from "../modules/reports/reports.route.js";
import customerRoutes from "../modules/customers/customer.routes.js";
import organizationRoutes from "../modules/organizations/organization.routes.js";
import userRoutes from "../modules/users/user.routes.js";

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