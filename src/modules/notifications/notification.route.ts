import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";

import {
  getNotificationsController,
  getUnreadNotificationCountController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
} from "./notification.controller";

const router = Router();

// ============================================================
// GET ALL USER NOTIFICATIONS
// ============================================================

router.get(
  "/notifications",
  authenticate,
  getNotificationsController,
);

// ============================================================
// GET UNREAD COUNT
// ============================================================

router.get(
  "/notifications/unread-count",
  authenticate,
  getUnreadNotificationCountController,
);

// ============================================================
// MARK ONE NOTIFICATION AS READ
// ============================================================

router.patch(
  "/notifications/:notificationId/read",
  authenticate,
  markNotificationAsReadController,
);

// ============================================================
// MARK ALL NOTIFICATIONS AS READ
// ============================================================

router.patch(
  "/notifications/read-all",
  authenticate,
  markAllNotificationsAsReadController,
);

export default router;