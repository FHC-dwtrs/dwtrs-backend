import type { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notification.service.js";

// ============================================================
// GET USER NOTIFICATIONS
// ============================================================

export async function getNotificationsController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    const notifications =
      await getUserNotifications(req.user.sub);

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error(
      "Get notifications error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications.",
    });
  }
}

// ============================================================
// GET UNREAD COUNT
// ============================================================

export async function getUnreadNotificationCountController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    const count =
      await getUnreadNotificationCount(
        req.user.sub,
      );

    return res.status(200).json({
      success: true,
      data: {
        count,
      },
    });
  } catch (error) {
    console.error(
      "Get unread notification count error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve unread notification count.",
    });
  }
}

// ============================================================
// MARK ONE AS READ
// ============================================================

export async function markNotificationAsReadController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { notificationId } = req.params;

    if (typeof notificationId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    if (!req.user?.sub) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    const notification =
      await markNotificationAsRead(
        notificationId,
        req.user.sub,
      );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: notification,
    });
  } catch (error) {
    console.error(
      "Mark notification as read error:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "Notification not found."
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to mark notification as read.",
    });
  }
}

// ============================================================
// MARK ALL AS READ
// ============================================================

export async function markAllNotificationsAsReadController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    await markAllNotificationsAsRead(
      req.user.sub,
    );

    return res.status(200).json({
      success: true,
      message:
        "All notifications marked as read.",
    });
  } catch (error) {
    console.error(
      "Mark all notifications as read error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to mark notifications as read.",
    });
  }
}