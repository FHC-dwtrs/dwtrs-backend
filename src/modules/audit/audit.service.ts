import prisma from "../../config/database.js";
import { Prisma } from "../../generated/prisma/client.js";

import type { AuditLogQueryInput } from "./audit.validation.js";

// ============================================================
// CREATE AUDIT LOG
// ============================================================

export async function createAuditLog(
    tx: Prisma.TransactionClient,
  data: {
    userId: string;
    caseId?: string | null;
    action: string;
    entityType: string;
    entityId: string;

    oldValues?: unknown;
    newValues?: unknown;

    ipAddress?: string | null;
  },
) {
  return tx.auditLog.create({
    data: {
     userId: data.userId,
      caseId: data.caseId ?? null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,

      oldValues:
        data.oldValues === undefined
          ? undefined
          : data.oldValues === null
          ? Prisma.JsonNull
          : data.oldValues,

      newValues:
        data.newValues === undefined
          ? undefined
          : data.newValues === null
          ? Prisma.JsonNull
          : data.newValues,

      ipAddress: data.ipAddress ?? null,
    },
  });
}

// ============================================================
// GET AUDIT LOGS
// ============================================================

export async function getAuditLogs(
  input: AuditLogQueryInput,
) {
  const {
    userId,
    caseId,
    entityType,
    action,
    from,
    to,
    page,
    limit,
  } = input;

  const skip = (page - 1) * limit;

  const where = {
    ...(userId ? { userId } : {}),

    ...(caseId ? { caseId } : {}),

    ...(entityType
      ? {
          entityType: {
            equals: entityType,
            mode: "insensitive" as const,
          },
        }
      : {}),

    ...(action
      ? {
          action: {
            equals: action,
            mode: "insensitive" as const,
          },
        }
      : {}),

    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,

      orderBy: {
        createdAt: "desc",
      },

      include: {
        user: {
          select: {
            userId: true,
            name: true,
            email: true,
          },
        },

        case: {
          select: {
            caseId: true,
            trackingNumber: true,
          },
        },
      },
    }),

    prisma.auditLog.count({
      where,
    }),
  ]);

  return {
    data: logs,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================================
// GET SINGLE AUDIT LOG
// ============================================================

export async function getAuditLogById(
  auditLogId: string,
) {
  return prisma.auditLog.findUnique({
    where: {
      auditLogId,
    },

    include: {
      user: {
        select: {
          userId: true,
          name: true,
          email: true,
        },
      },

      case: {
        select: {
          caseId: true,
          trackingNumber: true,
        },
      },
    },
  });
}