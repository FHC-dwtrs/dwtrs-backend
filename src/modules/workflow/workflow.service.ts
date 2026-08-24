import prisma from "../../config/database";
import { Prisma } from "../../generated/prisma/client";

import type {
  AssignCaseInput,
  CaseDecisionInput,
  ReassignCaseInput,
  ReturnCaseInput,
  TransferCaseInput,
} from "./workflow.validation";

// ============================================================
// CONSTANT
// ============================================================

const RECORDS_ARCHIVE_NAME =
  "Records & Archive Directorate";

// ============================================================
// ASSIGN CASE
// ============================================================
//
// Normal forward assignment:
//
// Records & Archive → Sector
// Sector             → Directorate
// Directorate        → Group
//
// If a case was previously returned from the destination,
// ASSIGN is rejected and REASSIGN must be used.
//
// ============================================================

export async function assignCase(
  caseId: string,
  userId: string,
  input: AssignCaseInput,
) {
  return prisma.$transaction(async (tx) => {
    // ========================================================
    // 1. FIND CASE
    // ========================================================

    const caseRecord = await tx.case.findUnique({
      where: {
        caseId,
      },
    });

    if (!caseRecord) {
      throw new Error("Case not found.");
    }

    // ========================================================
    // 2. FIND DESTINATION
    // ========================================================

    const toUnit = await tx.organizationalUnit.findUnique({
      where: {
        unitId: input.toUnitId,
      },
    });

    if (!toUnit) {
      throw new Error(
        "Destination organizational unit not found.",
      );
    }

    if (!toUnit.isActive) {
      throw new Error(
        "Destination organizational unit is inactive.",
      );
    }

    // ========================================================
    // 3. FIND CURRENT UNIT
    // ========================================================

    if (!caseRecord.currentUnitId) {
      throw new Error(
        "Case has no current organizational unit.",
      );
    }

    const fromUnit =
      await tx.organizationalUnit.findUnique({
        where: {
          unitId: caseRecord.currentUnitId,
        },
      });

    if (!fromUnit) {
      throw new Error(
        "Current organizational unit not found.",
      );
    }

    // ========================================================
    // 4. VALIDATE FORWARD ROUTE
    // ========================================================

    const validRoute = isValidForwardRoute(
      fromUnit.unitType,
      fromUnit.name,
      toUnit.unitType,
    );

    if (!validRoute) {
      throw new Error(
        `Invalid assignment route: ${fromUnit.name} → ${toUnit.name}`,
      );
    }

    // ========================================================
    // 5. FIND USER
    // ========================================================

    const user = await tx.user.findUnique({
      where: {
        userId,
      },
    });

    if (!user) {
      throw new Error("Assigning user not found.");
    }

    if (!user.isActive) {
      throw new Error("Assigning user is inactive.");
    }

    // ========================================================
    // 6. USER MUST OWN CASE
    // ========================================================

    if (caseRecord.currentUnitId !== user.unitId) {
      throw new Error(
        "You can only assign cases currently held by your organizational unit.",
      );
    }

    // ========================================================
    // 7. CANNOT ASSIGN TO SAME UNIT
    // ========================================================

    if (caseRecord.currentUnitId === toUnit.unitId) {
      throw new Error(
        "Case is already assigned to this organizational unit.",
      );
    }

    // ========================================================
    // 8. CHECK WHETHER REASSIGNMENT IS REQUIRED
    // ========================================================

    const requiresReassignment =
      await wasReturnedFromDestination(
        tx,
        caseId,
        fromUnit.unitId,
        toUnit.unitId,
      );

    if (requiresReassignment) {
      throw new Error(
        `This case was returned from ${toUnit.name}. ` +
          `Sending it back to the same unit requires REASSIGN, not ASSIGN.`,
      );
    }

    // ========================================================
    // 9. COMPLETE CURRENT ASSIGNMENT
    // ========================================================

    await tx.workflowAssignment.updateMany({
      where: {
        caseId,
        assignmentStatus: "ACTIVE",
      },
      data: {
        assignmentStatus: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // ========================================================
    // 10. CREATE ASSIGNMENT
    // ========================================================

    const assignment =
      await tx.workflowAssignment.create({
        data: {
          caseId,
          fromUnitId: caseRecord.currentUnitId,
          toUnitId: toUnit.unitId,
          assignedBy: userId,
          assignmentStatus: "ACTIVE",
          remarks: input.remarks,
        },
        include: {
          fromUnit: true,
          toUnit: true,
        },
      });

    // ========================================================
    // 11. UPDATE CASE
    // ========================================================

    const updatedCase = await tx.case.update({
      where: {
        caseId,
      },
      data: {
        currentUnitId: toUnit.unitId,
        status: "UNDER_REVIEW",
        version: {
          increment: 1,
        },
      },
      include: {
        customer: true,
        currentUnit: true,
      },
    });

    // ========================================================
    // 12. STATUS HISTORY
    // ========================================================

    await tx.statusHistory.create({
      data: {
        caseId,
        changedBy: userId,
        status: "UNDER_REVIEW",
      },
    });

    // ========================================================
    // 13. AUDIT LOG
    // ========================================================

    await tx.auditLog.create({
      data: {
        userId,
        caseId,
        action: "CASE_ASSIGNED",
        entityType: "CASE",
        entityId: caseId,

        oldValues: {
          currentUnitId: caseRecord.currentUnitId,
          status: caseRecord.status,
        },

        newValues: {
          currentUnitId: toUnit.unitId,
          status: "UNDER_REVIEW",
          assignmentId: assignment.assignmentId,
        },
      },
    });

    return {
      case: updatedCase,
      assignment,
    };
  });
}

// ============================================================
// VALID FORWARD ASSIGNMENT ROUTES
// ============================================================

function isValidForwardRoute(
  fromUnitType: string | null,
  fromUnitName: string | null,
  toUnitType: string,
): boolean {
  if (!fromUnitType) {
    return false;
  }

  // Records & Archive → Sector
  if (
    fromUnitName === RECORDS_ARCHIVE_NAME &&
    toUnitType === "SECTOR"
  ) {
    return true;
  }

  // Sector → Directorate
  if (
    fromUnitType === "SECTOR" &&
    toUnitType === "DIRECTORATE"
  ) {
    return true;
  }

  // Directorate → Group
  if (
    fromUnitType === "DIRECTORATE" &&
    toUnitType === "GROUP"
  ) {
    return true;
  }

  return false;
}

// ============================================================
// CHECK WHETHER ASSIGNMENT REQUIRES REASSIGNMENT
// ============================================================

async function wasReturnedFromDestination(
  tx: Prisma.TransactionClient,
  caseId: string,
  currentUnitId: string,
  destinationUnitId: string,
): Promise<boolean> {
  const latestAssignment =
    await tx.workflowAssignment.findFirst({
      where: {
        caseId,
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

  if (!latestAssignment) {
    return false;
  }

  return (
    latestAssignment.fromUnitId === destinationUnitId &&
    latestAssignment.toUnitId === currentUnitId
  );
}

// ============================================================
// RETURN CASE
// ============================================================
//
// Normal:
//
// Group       → Directorate
// Directorate → Sector
//
// NEW:
//
// Sector      → Records & Archive
//
// ============================================================

export async function returnCase(
  caseId: string,
  userId: string,
  input: ReturnCaseInput,
) {
  return prisma.$transaction(async (tx) => {
    // ========================================================
    // 1. FIND CASE
    // ========================================================

    const caseRecord = await tx.case.findUnique({
      where: {
        caseId,
      },
    });

    if (!caseRecord) {
      throw new Error("Case not found.");
    }

    // ========================================================
    // 2. FIND USER
    // ========================================================

    const user = await tx.user.findUnique({
      where: {
        userId,
      },
      include: {
        unit: true,
      },
    });

    if (!user) {
      throw new Error("Returning user not found.");
    }

    if (!user.isActive) {
      throw new Error("Returning user is inactive.");
    }

    if (!user.unit) {
      throw new Error(
        "Returning user is not assigned to an organizational unit.",
      );
    }

    // ========================================================
    // 3. USER MUST OWN CASE
    // ========================================================

    if (caseRecord.currentUnitId !== user.unit.unitId) {
      throw new Error(
        "You can only return cases currently held by your organizational unit.",
      );
    }

    // ========================================================
    // 4. DETERMINE RETURN DESTINATION
    // ========================================================

    let destinationUnit;

    // --------------------------------------------------------
    // NEW RULE:
    //
    // Sector → Records & Archive
    // --------------------------------------------------------

    if (user.unit.unitType === "SECTOR") {
      destinationUnit =
        await tx.organizationalUnit.findFirst({
          where: {
            name: RECORDS_ARCHIVE_NAME,
            unitType: "DIRECTORATE",
          },
        });

      if (!destinationUnit) {
        throw new Error(
          "Records & Archive organizational unit not found.",
        );
      }

      if (!destinationUnit.isActive) {
        throw new Error(
          "Records & Archive organizational unit is inactive.",
        );
      }

      if (caseRecord.currentUnitId === destinationUnit.unitId) {
        throw new Error(
          "Case is already assigned to Records & Archive.",
        );
      }
    }

    // --------------------------------------------------------
    // EXISTING RULE:
    //
    // Group → parent Directorate
    // Directorate → parent Sector
    // --------------------------------------------------------

    else if (
      user.unit.unitType === "GROUP" ||
      user.unit.unitType === "DIRECTORATE"
    ) {
      if (!user.unit.parentUnitId) {
        throw new Error(
          "This organizational unit has no parent unit and cannot return the case.",
        );
      }

      destinationUnit =
        await tx.organizationalUnit.findUnique({
          where: {
            unitId: user.unit.parentUnitId,
          },
        });

      if (!destinationUnit) {
        throw new Error(
          "Parent organizational unit not found.",
        );
      }

      if (!destinationUnit.isActive) {
        throw new Error(
          "Parent organizational unit is inactive.",
        );
      }

      if (caseRecord.currentUnitId === destinationUnit.unitId) {
        throw new Error(
          "Case is already assigned to the parent organizational unit.",
        );
      }
    }

    // --------------------------------------------------------
    // Everything else cannot return
    // --------------------------------------------------------

    else {
      throw new Error(
        "Only Group, Directorate, and Sector users can return cases.",
      );
    }

    // ========================================================
    // 5. VALIDATE RETURN ROUTE
    // ========================================================

    const validReturn = isValidReturnRoute(
      user.unit.unitType,
      destinationUnit.unitType,
      destinationUnit.name,
    );

    if (!validReturn) {
      throw new Error(
        `Invalid return route: ${user.unit.name} → ${destinationUnit.name}`,
      );
    }

    // ========================================================
    // 6. COMPLETE CURRENT ACTIVE ASSIGNMENT
    // ========================================================

    await tx.workflowAssignment.updateMany({
      where: {
        caseId,
        assignmentStatus: "ACTIVE",
      },
      data: {
        assignmentStatus: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // ========================================================
    // 7. CREATE RETURN ASSIGNMENT
    // ========================================================

    const assignment =
      await tx.workflowAssignment.create({
        data: {
          caseId,
          fromUnitId: user.unit.unitId,
          toUnitId: destinationUnit.unitId,
          assignedBy: userId,
          assignmentStatus: "ACTIVE",
          remarks: input.remarks,
        },
        include: {
          fromUnit: true,
          toUnit: true,
        },
      });

    // ========================================================
    // 8. UPDATE CASE
    // ========================================================

    const updatedCase = await tx.case.update({
      where: {
        caseId,
      },
      data: {
        currentUnitId: destinationUnit.unitId,
        status: "SENT_BACK_FOR_CORRECTION",
        version: {
          increment: 1,
        },
      },
      include: {
        customer: true,
        currentUnit: true,
      },
    });

    // ========================================================
    // 9. STATUS HISTORY
    // ========================================================

    await tx.statusHistory.create({
      data: {
        caseId,
        changedBy: userId,
        status: "SENT_BACK_FOR_CORRECTION",
      },
    });

    // ========================================================
    // 10. AUDIT LOG
    // ========================================================

    await tx.auditLog.create({
      data: {
        userId,
        caseId,
        action: "CASE_RETURNED",
        entityType: "CASE",
        entityId: caseId,

        oldValues: {
          currentUnitId: user.unitId,
          status: caseRecord.status,
        },

        newValues: {
          currentUnitId: destinationUnit.unitId,
          status: "SENT_BACK_FOR_CORRECTION",
          assignmentId: assignment.assignmentId,
          remarks: input.remarks,
        },
      },
    });

    return {
      case: updatedCase,
      assignment,
      returnedFrom: user.unit,
      returnedTo: destinationUnit,
    };
  });
}

// ============================================================
// VALID RETURN ROUTES
// ============================================================

function isValidReturnRoute(
  fromUnitType: string,
  toUnitType: string,
  toUnitName: string,
): boolean {
  // ==========================================================
  // NEW:
  //
  // SECTOR → RECORDS & ARCHIVE
  // ==========================================================

  if (
    fromUnitType === "SECTOR" &&
    toUnitType === "DIRECTORATE" &&
    toUnitName === RECORDS_ARCHIVE_NAME
  ) {
    return true;
  }

  // ==========================================================
  // EXISTING:
  //
  // GROUP → DIRECTORATE
  // ==========================================================

  if (
    fromUnitType === "GROUP" &&
    toUnitType === "DIRECTORATE"
  ) {
    return true;
  }

  // ==========================================================
  // EXISTING:
  //
  // DIRECTORATE → SECTOR
  // ==========================================================

  if (
    fromUnitType === "DIRECTORATE" &&
    toUnitType === "SECTOR"
  ) {
    return true;
  }

  return false;
}

// ============================================================
// REASSIGN CASE
// ============================================================
//
// Existing:
//
// Directorate → Group
// Sector      → Directorate
//
// NEW:
//
// Records & Archive → Sector
//
// Example:
//
// R&A → Sector 1       ASSIGN
// Sector 1 → R&A       RETURN
// R&A → Sector 1       REASSIGN
//
// ============================================================

export async function reassignCase(
  caseId: string,
  userId: string,
  input: ReassignCaseInput,
) {
  return prisma.$transaction(async (tx) => {
    // ========================================================
    // 1. FIND CASE
    // ========================================================

    const caseRecord = await tx.case.findUnique({
      where: {
        caseId,
      },
    });

    if (!caseRecord) {
      throw new Error("Case not found.");
    }

    if (!caseRecord.currentUnitId) {
      throw new Error(
        "Case has no current organizational unit.",
      );
    }

    // ========================================================
    // 2. FIND USER
    // ========================================================

    const user = await tx.user.findUnique({
      where: {
        userId,
      },
      include: {
        unit: true,
      },
    });

    if (!user) {
      throw new Error("Reassigning user not found.");
    }

    if (!user.isActive) {
      throw new Error("Reassigning user is inactive.");
    }

    if (!user.unit) {
      throw new Error(
        "Reassigning user is not assigned to an organizational unit.",
      );
    }

    // ========================================================
    // 3. USER MUST OWN CASE
    // ========================================================

    if (caseRecord.currentUnitId !== user.unit.unitId) {
      throw new Error(
        "You can only reassign cases currently held by your organizational unit.",
      );
    }

    const currentUnit = user.unit;

    // ========================================================
    // 4. FIND DESTINATION
    // ========================================================

    const toUnit = await tx.organizationalUnit.findUnique({
      where: {
        unitId: input.toUnitId,
      },
    });

    if (!toUnit) {
      throw new Error(
        "Destination organizational unit not found.",
      );
    }

    if (!toUnit.isActive) {
      throw new Error(
        "Destination organizational unit is inactive.",
      );
    }

    // ========================================================
    // 5. DESTINATION MUST DIFFER
    // ========================================================

    if (toUnit.unitId === currentUnit.unitId) {
      throw new Error(
        "Case is already held by this organizational unit.",
      );
    }

    // ========================================================
    // 6. FIND MOST RECENT INCOMING ASSIGNMENT
    //
    // Example:
    //
    // R&A → Sector 1
    // Sector 1 → R&A
    //
    // latestIncomingAssignment:
    //
    // from = Sector 1
    // to   = R&A
    //
    // ========================================================

    const latestIncomingAssignment =
      await tx.workflowAssignment.findFirst({
        where: {
          caseId,
          toUnitId: currentUnit.unitId,
        },
        orderBy: {
          assignedAt: "desc",
        },
      });

    if (!latestIncomingAssignment) {
      throw new Error(
        "No previous workflow history found for this case.",
      );
    }

    const returnedFromUnitId =
      latestIncomingAssignment.fromUnitId;

    if (!returnedFromUnitId) {
      throw new Error(
        "Case cannot be reassigned because no previous unit was found.",
      );
    }

    // ========================================================
    // 7. VERIFY PREVIOUS FORWARD ASSIGNMENT
    //
    // Example:
    //
    // R&A → Sector 1
    // Sector 1 → R&A
    //
    // Therefore:
    //
    // previousAssignment:
    //
    // from = R&A
    // to   = Sector 1
    //
    // ========================================================

    const previousAssignment =
      await tx.workflowAssignment.findFirst({
        where: {
          caseId,
          fromUnitId: currentUnit.unitId,
          toUnitId: returnedFromUnitId,
        },
        orderBy: {
          assignedAt: "desc",
        },
      });

    if (!previousAssignment) {
      throw new Error(
        "Case cannot be reassigned because it was not previously assigned to the destination unit.",
      );
    }

    // ========================================================
    // 8. DESTINATION MUST BE SAME UNIT THAT RETURNED CASE
    // ========================================================

    if (toUnit.unitId !== returnedFromUnitId) {
      throw new Error(
        "Invalid reassignment destination. A case can only be reassigned to the same organizational unit that previously returned it.",
      );
    }

    // ========================================================
    // 9. VALIDATE REASSIGN ROUTE
    // ========================================================

    const validReassignRoute =
      isValidReassignRoute(
        currentUnit.unitType,
        toUnit.unitType,
        currentUnit.name,
        toUnit.name,
      );

    if (!validReassignRoute) {
      throw new Error(
        `Invalid reassignment route: ${currentUnit.name} → ${toUnit.name}`,
      );
    }

    // ========================================================
    // 10. COMPLETE CURRENT ASSIGNMENT
    // ========================================================

    await tx.workflowAssignment.updateMany({
      where: {
        caseId,
        assignmentStatus: "ACTIVE",
      },
      data: {
        assignmentStatus: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // ========================================================
    // 11. CREATE REASSIGNMENT
    // ========================================================

    const assignment =
      await tx.workflowAssignment.create({
        data: {
          caseId,
          fromUnitId: currentUnit.unitId,
          toUnitId: toUnit.unitId,
          assignedBy: userId,
          assignmentStatus: "ACTIVE",
          remarks: input.remarks,
        },
        include: {
          fromUnit: true,
          toUnit: true,
        },
      });

    // ========================================================
    // 12. UPDATE CASE
    // ========================================================

    const updatedCase = await tx.case.update({
      where: {
        caseId,
      },
      data: {
        currentUnitId: toUnit.unitId,
        status: "UNDER_REVIEW",
        version: {
          increment: 1,
        },
      },
      include: {
        customer: true,
        currentUnit: true,
      },
    });

    // ========================================================
    // 13. STATUS HISTORY
    // ========================================================

    await tx.statusHistory.create({
      data: {
        caseId,
        changedBy: userId,
        status: "UNDER_REVIEW",
      },
    });

    // ========================================================
    // 14. AUDIT LOG
    // ========================================================

    await tx.auditLog.create({
      data: {
        userId,
        caseId,
        action: "CASE_REASSIGNED",
        entityType: "CASE",
        entityId: caseId,

        oldValues: {
          currentUnitId: currentUnit.unitId,
          status: caseRecord.status,
        },

        newValues: {
          currentUnitId: toUnit.unitId,
          status: "UNDER_REVIEW",
          assignmentId: assignment.assignmentId,
          remarks: input.remarks,
        },
      },
    });

    return {
      case: updatedCase,
      assignment,
      reassignedFrom: currentUnit,
      reassignedTo: toUnit,
    };
  });
}

// ============================================================
// VALID REASSIGN ROUTES
// ============================================================

function isValidReassignRoute(
  fromUnitType: string,
  toUnitType: string,
  fromUnitName: string,
  toUnitName: string,
): boolean {
  // ==========================================================
  // NEW:
  //
  // Records & Archive → Sector
  //
  // R&A → S
  //
  // ==========================================================

  if (
    fromUnitType === "DIRECTORATE" &&
    fromUnitName === RECORDS_ARCHIVE_NAME &&
    toUnitType === "SECTOR"
  ) {
    return true;
  }

  // ==========================================================
  // EXISTING:
  //
  // Directorate → Group
  // ==========================================================

  if (
    fromUnitType === "DIRECTORATE" &&
    toUnitType === "GROUP"
  ) {
    return true;
  }

  // ==========================================================
  // EXISTING:
  //
  // Sector → Directorate
  // ==========================================================

  if (
    fromUnitType === "SECTOR" &&
    toUnitType === "DIRECTORATE"
  ) {
    return true;
  }

  return false;
}

// ============================================================
// MAKE CASE DECISION
// ============================================================

export async function makeCaseDecision(
  caseId: string,
  userId: string,
  input: CaseDecisionInput,
) {
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // ======================================================
      // 1. FIND CASE
      // ======================================================

      const caseRecord = await tx.case.findUnique({
        where: {
          caseId,
        },
      });

      if (!caseRecord) {
        throw new Error("Case not found.");
      }

      // ======================================================
      // 2. FIND USER
      // ======================================================

      const user = await tx.user.findUnique({
        where: {
          userId,
        },
        include: {
          unit: true,
        },
      });

      if (!user) {
        throw new Error(
          "Decision-making user not found.",
        );
      }

      if (!user.isActive) {
        throw new Error(
          "Decision-making user is inactive.",
        );
      }

      if (!user.unit) {
        throw new Error(
          "Decision-making user is not assigned to an organizational unit.",
        );
      }

      // ======================================================
      // 3. ONLY SECTOR
      // ======================================================

      if (user.unit.unitType !== "SECTOR") {
        throw new Error(
          "Only Sector users can approve or reject cases.",
        );
      }

      // ======================================================
      // 4. CASE MUST BE IN USER'S SECTOR
      // ======================================================

      if (caseRecord.currentUnitId !== user.unit.unitId) {
        throw new Error(
          "You can only make a decision on cases currently held by your organizational unit.",
        );
      }

      // ======================================================
      // 5. CHECK EXISTING DECISION
      // ======================================================

      const existingDecision =
        await tx.decision.findFirst({
          where: {
            caseId,
          },
          orderBy: {
            decidedAt: "desc",
          },
        });

      if (existingDecision) {
        throw new Error(
          "A final decision has already been made for this case.",
        );
      }

      // ======================================================
      // 6. CHECK FINAL STATUS
      // ======================================================

      if (
        caseRecord.status === "APPROVED" ||
        caseRecord.status === "REJECTED"
      ) {
        throw new Error(
          "Case is already finalized.",
        );
      }

      // ======================================================
      // 7. DETERMINE STATUS
      // ======================================================

      const newStatus =
        input.decisionType === "APPROVED"
          ? "APPROVED"
          : "REJECTED";

      // ======================================================
      // 8. CREATE DECISION
      // ======================================================

      const decision = await tx.decision.create({
        data: {
          caseId,
          decidedBy: userId,
          decisionType: input.decisionType,
          decisionText: input.decisionText,
        },
        include: {
          decider: {
            select: {
              userId: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // ======================================================
      // 9. UPDATE CASE
      // ======================================================

      const updatedCase = await tx.case.update({
        where: {
          caseId,
        },
        data: {
          status: newStatus,
          version: {
            increment: 1,
          },
        },
        include: {
          customer: true,
          currentUnit: true,
        },
      });

      // ======================================================
      // 10. STATUS HISTORY
      // ======================================================

      await tx.statusHistory.create({
        data: {
          caseId,
          changedBy: userId,
          status: newStatus,
        },
      });

      // ======================================================
      // 11. AUDIT LOG
      // ======================================================

      await tx.auditLog.create({
        data: {
          userId,
          caseId,
          action:
            input.decisionType === "APPROVED"
              ? "CASE_APPROVED"
              : "CASE_REJECTED",
          entityType: "CASE",
          entityId: caseId,

          oldValues: {
            status: caseRecord.status,
            currentUnitId: caseRecord.currentUnitId,
          },

          newValues: {
            status: newStatus,
            currentUnitId: caseRecord.currentUnitId,
            decisionId: decision.decisionId,
            decisionType: input.decisionType,
            decisionText:
              input.decisionText ?? null,
          },
        },
      });

      return {
        case: updatedCase,
        decision,
      };
    },
  );
}

// ============================================================
// TRANSFER CASE
// ============================================================
//
// Directorate → Directorate
//
// Only within the same Sector.
//
// ============================================================

export async function transferCase(
  caseId: string,
  userId: string,
  input: TransferCaseInput,
) {
  return prisma.$transaction(async (tx) => {
    // ========================================================
    // 1. FIND CASE
    // ========================================================

    const caseRecord = await tx.case.findUnique({
      where: {
        caseId,
      },
    });

    if (!caseRecord) {
      throw new Error("Case not found.");
    }

    if (!caseRecord.currentUnitId) {
      throw new Error(
        "Case has no current organizational unit.",
      );
    }

    // ========================================================
    // 2. FIND USER
    // ========================================================

    const user = await tx.user.findUnique({
      where: {
        userId,
      },
      include: {
        unit: true,
      },
    });

    if (!user) {
      throw new Error("Transferring user not found.");
    }

    if (!user.isActive) {
      throw new Error("Transferring user is inactive.");
    }

    if (!user.unit) {
      throw new Error(
        "Transferring user is not assigned to an organizational unit.",
      );
    }

    // ========================================================
    // 3. USER MUST OWN CASE
    // ========================================================

    if (caseRecord.currentUnitId !== user.unitId) {
      throw new Error(
        "You can only transfer cases currently held by your organizational unit.",
      );
    }

    // ========================================================
    // 4. CURRENT UNIT MUST BE DIRECTORATE
    // ========================================================

    if (user.unit.unitType !== "DIRECTORATE") {
      throw new Error(
        "Only Directorate users can transfer cases.",
      );
    }

    // ========================================================
    // 5. DESTINATION
    // ========================================================

    const toUnit = await tx.organizationalUnit.findUnique({
      where: {
        unitId: input.toUnitId,
      },
    });

    if (!toUnit) {
      throw new Error(
        "Destination organizational unit not found.",
      );
    }

    if (!toUnit.isActive) {
      throw new Error(
        "Destination organizational unit is inactive.",
      );
    }

    // ========================================================
    // 6. DESTINATION MUST BE DIRECTORATE
    // ========================================================

    if (toUnit.unitType !== "DIRECTORATE") {
      throw new Error(
        "Transfer is only allowed from one Directorate to another Directorate.",
      );
    }

    // ========================================================
    // 7. CANNOT SAME DIRECTORATE
    // ========================================================

    if (user.unit.unitId === toUnit.unitId) {
      throw new Error(
        "A case cannot be transferred to the same Directorate.",
      );
    }

    // ========================================================
    // 8. SAME SECTOR
    // ========================================================

    if (!user.unit.parentUnitId) {
      throw new Error(
        "Current Directorate is not assigned to a Sector.",
      );
    }

    if (!toUnit.parentUnitId) {
      throw new Error(
        "Destination Directorate is not assigned to a Sector.",
      );
    }

    if (
      user.unit.parentUnitId !==
      toUnit.parentUnitId
    ) {
      throw new Error(
        "A case can only be transferred between Directorates within the same Sector.",
      );
    }

    // ========================================================
    // 9. COMPLETE CURRENT ASSIGNMENT
    // ========================================================

    await tx.workflowAssignment.updateMany({
      where: {
        caseId,
        assignmentStatus: "ACTIVE",
      },
      data: {
        assignmentStatus: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // ========================================================
    // 10. CREATE TRANSFER
    // ========================================================

    const transferAssignment =
      await tx.workflowAssignment.create({
        data: {
          caseId,
          fromUnitId: user.unit.unitId,
          toUnitId: toUnit.unitId,
          assignedBy: userId,
          assignmentStatus: "ACTIVE",
          remarks: input.remarks,
        },
        include: {
          fromUnit: true,
          toUnit: true,
        },
      });

    // ========================================================
    // 11. UPDATE CASE
    // ========================================================

    const updatedCase = await tx.case.update({
      where: {
        caseId,
      },
      data: {
        currentUnitId: toUnit.unitId,
        status: "UNDER_REVIEW",
        version: {
          increment: 1,
        },
      },
      include: {
        customer: true,
        currentUnit: true,
      },
    });

    // ========================================================
    // 12. STATUS HISTORY
    // ========================================================

    await tx.statusHistory.create({
      data: {
        caseId,
        changedBy: userId,
        status: "UNDER_REVIEW",
      },
    });

    // ========================================================
    // 13. AUDIT LOG
    // ========================================================

    await tx.auditLog.create({
      data: {
        userId,
        caseId,
        action: "CASE_TRANSFERRED",
        entityType: "CASE",
        entityId: caseId,

        oldValues: {
          currentUnitId: user.unitId,
          status: caseRecord.status,
        },

        newValues: {
          currentUnitId: toUnit.unitId,
          status: "UNDER_REVIEW",
          assignmentId:
            transferAssignment.assignmentId,
          transferType:
            "DIRECTORATE_TO_DIRECTORATE",
        },
      },
    });

    return {
      case: updatedCase,
      assignment: transferAssignment,
      transferredFrom: user.unit,
      transferredTo: toUnit,
    };
  });
}