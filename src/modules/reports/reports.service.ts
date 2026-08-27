import prisma from "../../config/database.js";

import type {
  ReportFilterInput,
} from "./reports.validation.js";

const CASE_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "IN_PROGRESS",
  "PENDING_CLARIFICATION",
  "SENT_BACK_FOR_CORRECTION",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
  "ARCHIVED",
] as const;

// ============================================================
// BUILD CASE FILTER
// ============================================================

function buildCaseWhere(input: ReportFilterInput) {
  const where: any = {};

  if (input.dateFrom || input.dateTo) {
    where.submittedAt = {};

    if (input.dateFrom) {
      where.submittedAt.gte = input.dateFrom;
    }

    if (input.dateTo) {
      where.submittedAt.lte = input.dateTo;
    }
  }

  if (input.status) {
    where.status = input.status;
  }

  if (input.unitId) {
    where.currentUnitId = input.unitId;
  }

  if (input.unitType) {
    where.currentUnit = {
      unitType: input.unitType,
    };
  }

  return where;
}

// ============================================================
// 1. CASE SUMMARY
// ============================================================

export async function getCaseSummary(
  input: ReportFilterInput,
) {
  const where = buildCaseWhere(input);

  const grouped = await prisma.case.groupBy({
    by: ["status"],
    where,
    _count: {
      _all: true,
    },
  });

  const summary = Object.fromEntries(
    CASE_STATUSES.map((status) => [status, 0]),
  );

  for (const item of grouped) {
    summary[item.status] = item._count._all;
  }

  const totalCases = grouped.reduce(
    (total, item) => total + item._count._all,
    0,
  );

  return {
    totalCases,

    submitted: summary.SUBMITTED,
    underReview: summary.UNDER_REVIEW,
    inProgress: summary.IN_PROGRESS,
    pendingClarification:
      summary.PENDING_CLARIFICATION,
    sentBackForCorrection:
      summary.SENT_BACK_FOR_CORRECTION,
    approved: summary.APPROVED,
    rejected: summary.REJECTED,
    completed: summary.COMPLETED,
    archived: summary.ARCHIVED,
  };
}

// ============================================================
// 2. CASES BY ORGANIZATIONAL UNIT
// ============================================================

export async function getCasesByOrganizationalUnit(
  input: ReportFilterInput,
) {
  const caseWhere = buildCaseWhere(input);

  const units = await prisma.organizationalUnit.findMany({
    where: {
      isActive: true,

      ...(input.unitId
        ? {
            unitId: input.unitId,
          }
        : {}),

      ...(input.unitType
        ? {
            unitType: input.unitType,
          }
        : {}),
    },

    select: {
      unitId: true,
      name: true,
      unitType: true,
      parentUnitId: true,

      _count: {
        select: {
          currentCases: {
            where: caseWhere,
          },
        },
      },
    },

    orderBy: [
      {
        unitType: "asc",
      },
      {
        name: "asc",
      },
    ],
  });

  return units.map((unit) => ({
    unitId: unit.unitId,
    name: unit.name,
    unitType: unit.unitType,
    parentUnitId: unit.parentUnitId,
    caseCount: unit._count.currentCases,
  }));
}

// ============================================================
// 3. WORKFLOW / CASE MOVEMENT REPORT
// ============================================================

export async function getWorkflowReport(
  input: ReportFilterInput,
) {
  const assignmentWhere: any = {};

  if (input.dateFrom || input.dateTo) {
    assignmentWhere.assignedAt = {};

    if (input.dateFrom) {
      assignmentWhere.assignedAt.gte = input.dateFrom;
    }

    if (input.dateTo) {
      assignmentWhere.assignedAt.lte = input.dateTo;
    }
  }

  if (input.unitId) {
    assignmentWhere.OR = [
      {
        fromUnitId: input.unitId,
      },
      {
        toUnitId: input.unitId,
      },
    ];
  }

  const assignments =
    await prisma.workflowAssignment.findMany({
      where: assignmentWhere,

      select: {
        assignmentId: true,
        caseId: true,
        fromUnitId: true,
        toUnitId: true,
        assignmentStatus: true,
        remarks: true,
        assignedAt: true,
        completedAt: true,

        fromUnit: {
          select: {
            unitId: true,
            name: true,
            unitType: true,
          },
        },

        toUnit: {
          select: {
            unitId: true,
            name: true,
            unitType: true,
          },
        },

        case: {
          select: {
            trackingNumber: true,
            subject: true,
            status: true,
          },
        },
      },

      orderBy: {
        assignedAt: "desc",
      },
    });

  // ----------------------------------------------------------
  // Count audit actions
  // ----------------------------------------------------------

  const auditWhere: any = {
    action: {
      in: [
        "CASE_RETURNED",
        "CASE_REASSIGNED",
        "CASE_TRANSFERRED",
        "CASE_ASSIGNED",
      ],
    },
  };

  if (input.dateFrom || input.dateTo) {
    auditWhere.createdAt = {};

    if (input.dateFrom) {
      auditWhere.createdAt.gte = input.dateFrom;
    }

    if (input.dateTo) {
      auditWhere.createdAt.lte = input.dateTo;
    }
  }

  const auditGroups = await prisma.auditLog.groupBy({
    by: ["action"],
    where: auditWhere,
    _count: {
      _all: true,
    },
  });

  const actionCounts = Object.fromEntries(
    auditGroups.map((item) => [
      item.action,
      item._count._all,
    ]),
  );

  // ----------------------------------------------------------
  // Movement route summary
  // ----------------------------------------------------------

  const routeMap = new Map<
    string,
    {
      fromUnitId: string | null;
      fromUnitName: string;
      toUnitId: string;
      toUnitName: string;
      movementCount: number;
    }
  >();

  for (const assignment of assignments) {
    const key = `${assignment.fromUnitId ?? "INITIAL"}:${assignment.toUnitId}`;

    const existing = routeMap.get(key);

    if (existing) {
      existing.movementCount++;
    } else {
      routeMap.set(key, {
        fromUnitId: assignment.fromUnitId,
        fromUnitName:
          assignment.fromUnit?.name ?? "Initial Registration",
        toUnitId: assignment.toUnitId,
        toUnitName: assignment.toUnit.name,
        movementCount: 1,
      });
    }
  }

  return {
    totals: {
      totalMovements: assignments.length,
      assignments:
        actionCounts.CASE_ASSIGNED ?? 0,
      returns:
        actionCounts.CASE_RETURNED ?? 0,
      reassignments:
        actionCounts.CASE_REASSIGNED ?? 0,
      transfers:
        actionCounts.CASE_TRANSFERRED ?? 0,
    },

    routes: Array.from(routeMap.values()),

    movements: assignments,
  };
}

// ============================================================
// 4. PENDING / DELAYED CASES
// ============================================================

export async function getPendingCases(
  input: ReportFilterInput,
) {
  const where: any = {
    status: {
      in: [
        "SUBMITTED",
        "UNDER_REVIEW",
        "IN_PROGRESS",
        "PENDING_CLARIFICATION",
        "SENT_BACK_FOR_CORRECTION",
      ],
    },
  };

  if (input.unitId) {
    where.currentUnitId = input.unitId;
  }

  if (input.unitType) {
    where.currentUnit = {
      unitType: input.unitType,
    };
  }

  const cases = await prisma.case.findMany({
    where,

    select: {
      caseId: true,
      trackingNumber: true,
      subject: true,
      status: true,
      submittedAt: true,
      updatedAt: true,

      currentUnit: {
        select: {
          unitId: true,
          name: true,
          unitType: true,
        },
      },

      customer: {
        select: {
          customerId: true,
          name: true,
        },
      },
    },

    orderBy: {
      updatedAt: "asc",
    },
  });

  const now = Date.now();

  return cases.map((caseRecord) => {
    const waitingMilliseconds =
      now - caseRecord.updatedAt.getTime();

    const waitingDays = Math.floor(
      waitingMilliseconds /
        (1000 * 60 * 60 * 24),
    );

    return {
      caseId: caseRecord.caseId,
      trackingNumber: caseRecord.trackingNumber,
      subject: caseRecord.subject,
      status: caseRecord.status,

      customer: caseRecord.customer,

      currentUnit: caseRecord.currentUnit,

      submittedAt: caseRecord.submittedAt,
      lastUpdatedAt: caseRecord.updatedAt,

      waitingDays,
    };
  });
}

// ============================================================
// 5. DAILY / WEEKLY / MONTHLY / ANNUAL STATISTICS
// ============================================================

function getPeriodStart(
  period: ReportFilterInput["period"],
) {
  const now = new Date();

  switch (period) {
    case "DAILY": {
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
    }

    case "WEEKLY": {
      const day = now.getDay();

      const diff = day === 0 ? 6 : day - 1;

      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - diff,
      );
    }

    case "ANNUAL":
      return new Date(
        now.getFullYear(),
        0,
        1,
      );

    case "MONTHLY":
    default:
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );
  }
}

export async function getPeriodStatistics(
  input: ReportFilterInput,
) {
  const startDate =
    input.dateFrom ??
    getPeriodStart(input.period);

  const endDate =
    input.dateTo ??
    new Date();

  const baseWhere = buildCaseWhere({
    ...input,
    dateFrom: startDate,
    dateTo: endDate,
  });

  // ----------------------------------------------------------
  // Cases received
  // ----------------------------------------------------------

  const received = await prisma.case.count({
    where: baseWhere,
  });

  // ----------------------------------------------------------
  // Current status counts
  // ----------------------------------------------------------

  const statusGroups = await prisma.case.groupBy({
    by: ["status"],
    where: baseWhere,
    _count: {
      _all: true,
    },
  });

  const statusCounts = Object.fromEntries(
    statusGroups.map((item) => [
      item.status,
      item._count._all,
    ]),
  );

  // ----------------------------------------------------------
  // Completed during period
  // ----------------------------------------------------------

  const completedHistory =
    await prisma.statusHistory.findMany({
      where: {
        status: "COMPLETED",

        changedAt: {
          gte: startDate,
          lte: endDate,
        },

        ...(input.unitId
          ? {
              case: {
                currentUnitId: input.unitId,
              },
            }
          : {}),
      },

      select: {
        caseId: true,
      },

      distinct: ["caseId"],
    });

  // ----------------------------------------------------------
  // Processing time
  // ----------------------------------------------------------

  let averageProcessingDays = 0;

  if (completedHistory.length > 0) {
    let totalDays = 0;

    for (const completed of completedHistory) {
      const caseRecord =
        await prisma.case.findUnique({
          where: {
            caseId: completed.caseId,
          },

          select: {
            submittedAt: true,
          },
        });

      const completedStatus =
        await prisma.statusHistory.findFirst({
          where: {
            caseId: completed.caseId,
            status: "COMPLETED",
          },

          orderBy: {
            changedAt: "asc",
          },

          select: {
            changedAt: true,
          },
        });

      if (
        caseRecord &&
        completedStatus
      ) {
        const milliseconds =
          completedStatus.changedAt.getTime() -
          caseRecord.submittedAt.getTime();

        totalDays +=
          milliseconds /
          (1000 * 60 * 60 * 24);
      }
    }

    averageProcessingDays =
      totalDays / completedHistory.length;
  }

  return {
    period: input.period,

    dateFrom: startDate,
    dateTo: endDate,

    received,

    processed:
      (statusCounts.UNDER_REVIEW ?? 0) +
      (statusCounts.IN_PROGRESS ?? 0) +
      (statusCounts.APPROVED ?? 0) +
      (statusCounts.REJECTED ?? 0) +
      (statusCounts.COMPLETED ?? 0) +
      (statusCounts.ARCHIVED ?? 0),

    completed: completedHistory.length,

    pending:
      (statusCounts.SUBMITTED ?? 0) +
      (statusCounts.UNDER_REVIEW ?? 0) +
      (statusCounts.IN_PROGRESS ?? 0) +
      (statusCounts.PENDING_CLARIFICATION ?? 0) +
      (statusCounts.SENT_BACK_FOR_CORRECTION ?? 0),

    approved: statusCounts.APPROVED ?? 0,

    rejected: statusCounts.REJECTED ?? 0,

    pendingClarification:
      statusCounts.PENDING_CLARIFICATION ?? 0,

    sentBackForCorrection:
      statusCounts.SENT_BACK_FOR_CORRECTION ?? 0,

    archived:
      statusCounts.ARCHIVED ?? 0,

    averageProcessingDays:
      Number(averageProcessingDays.toFixed(2)),
  };
}