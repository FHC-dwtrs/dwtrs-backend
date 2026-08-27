import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware.js";

import {
  getNotificationsController,
  getUnreadNotificationCountController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
} from "./notification.controller.js";

const router = Router();
// ============================================================
// GET ALL USER NOTIFICATIONS
// ============================================================

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Retrieve notifications belonging to the authenticated user.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to retrieve notifications
 */
router.get(
  "/notifications",
  authenticate,
  getNotificationsController,
);

// ============================================================
// GET UNREAD COUNT
// ============================================================

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     description: Get the number of unread notifications for the authenticated user.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to retrieve unread notification count
 */
router.get(
  "/notifications/unread-count",
  authenticate,
  getUnreadNotificationCountController,
);

// ============================================================
// MARK ONE NOTIFICATION AS READ
// ============================================================

/**
 * @swagger
 * /notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Mark a specific notification as read.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         description: Notification ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Failed to mark notification as read
 */
router.patch(
  "/notifications/:notificationId/read",
  authenticate,
  markNotificationAsReadController,
);

// ============================================================
// MARK ALL NOTIFICATIONS AS READ
// ============================================================

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Mark all notifications belonging to the authenticated user as read.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to mark all notifications as read
 */
router.patch(
  "/notifications/read-all",
  authenticate,
  markAllNotificationsAsReadController,
);

export default router;