import prisma from "../../config/database";
import { Prisma } from "../../generated/prisma/client";

// ============================================================
// TYPES
// ============================================================

type CreateNotificationInput = {
  userId: string;
  caseId?: string;
  notificationType: string;
  title: string;
  message: string;
};

type NotificationDbClient =
  | typeof prisma
  | Prisma.TransactionClient;

// ============================================================
// CREATE SINGLE NOTIFICATION
// ============================================================

export async function createNotification(
  db: NotificationDbClient,
  input: CreateNotificationInput,
) {
  return db.notification.create({
    data: {
      userId: input.userId,
      caseId: input.caseId,
      notificationType: input.notificationType,
      title: input.title,
      message: input.message,
    },
  });
}

// ============================================================
// CREATE MULTIPLE NOTIFICATIONS
// ============================================================

export async function createNotifications(
  db: NotificationDbClient,
  notifications: CreateNotificationInput[],
) {
  if (notifications.length === 0) {
    return;
  }

  return db.notification.createMany({
    data: notifications,
  });
}

// ============================================================
// NOTIFY ALL ACTIVE USERS IN AN ORGANIZATIONAL UNIT
// ============================================================
//
// Example:
//
// Records & Archive
//       ↓
// Housing Development Sector
//
// All active users in Housing Development Sector receive
// the notification.
//
// ============================================================

export async function notifyUnitUsers(
  db: NotificationDbClient,
  input: {
    unitId: string;
    caseId: string;
    notificationType: string;
    title: string;
    message: string;
  },
) {
  const users = await db.user.findMany({
    where: {
      unitId: input.unitId,
      isActive: true,
    },
    select: {
      userId: true,
    },
  });

  if (users.length === 0) {
    return;
  }

  return db.notification.createMany({
    data: users.map((user) => ({
      userId: user.userId,
      caseId: input.caseId,
      notificationType: input.notificationType,
      title: input.title,
      message: input.message,
    })),
  });
}

// ============================================================
// GET USER NOTIFICATIONS
// ============================================================

export async function getUserNotifications(
  userId: string,
) {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      case: {
        select: {
          caseId: true,
          trackingNumber: true,
          status: true,
        },
      },
    },
  });
}

// ============================================================
// GET UNREAD NOTIFICATION COUNT
// ============================================================

export async function getUnreadNotificationCount(
  userId: string,
) {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

// ============================================================
// MARK ONE NOTIFICATION AS READ
// ============================================================

export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
) {
  const notification =
    await prisma.notification.findFirst({
      where: {
        notificationId,
        userId,
      },
    });

  if (!notification) {
    throw new Error("Notification not found.");
  }

  // Already read — no need to update again.
  if (notification.isRead) {
    return notification;
  }

  return prisma.notification.update({
    where: {
      notificationId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

// ============================================================
// MARK ALL USER NOTIFICATIONS AS READ
// ============================================================

export async function markAllNotificationsAsRead(
  userId: string,
) {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}