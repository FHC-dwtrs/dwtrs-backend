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
// ASSIGN CASE
// ============================================================
//
// ASSIGN means normal forward assignment:
//
// Records & Archive → Sector
// Sector             → Directorate
// Directorate        → Group
//
// ASSIGN does NOT allow:
//
// Directorate → Directorate  ❌ TRANSFER
// Directorate → Sector       ❌ RETURN
// Group → Directorate        ❌ RETURN
// Group → Group              ❌
// Sector → Records & Archive ❌
//
// IMPORTANT REASSIGN RULE:
//
// If:
//
// D → G1       ASSIGN
// G1 → D       RETURN
//
// Then:
//
// D → G1       ❌ ASSIGN
// D → G1       ✅ REASSIGN
//
// But:
//
// D → G1       ASSIGN
// G1 → D       RETURN
//
// D → G2       ✅ ASSIGN
//
// The same rule applies to:
//
// S → D1       ASSIGN
// D1 → S       RETURN
// S → D1       ❌ ASSIGN
// S → D1       ✅ REASSIGN
// S → D2       ✅ ASSIGN
//
// ============================================================

export async function assignCase(
  caseId: string,
  userId: string,
  input: AssignCaseInput,
) {
  return prisma.$transaction(async (tx) => {
    // ============================================================
    // 1. Find the case
    // ============================================================

    const caseRecord = await tx.case.findUnique({
      where: {
        caseId,
      },
    });

    if (!caseRecord) {
      throw new Error("Case not found.");
    }

    // ============================================================
    // 2. Find destination organizational unit
    // ============================================================

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

    // ============================================================
    // 3. Find current organizational unit
    // ============================================================

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

    // ============================================================
    // 4. Validate normal forward assignment route
    // ============================================================

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

    // ============================================================
    // 5. Find user performing the assignment
    // ============================================================

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

    // ============================================================
    // 6. User must belong to current unit
    // ============================================================

    if (caseRecord.currentUnitId !== user.unitId) {
      throw new Error(
        "You can only assign cases currently held by your organizational unit.",
      );
    }

    // ============================================================
    // 7. Cannot assign to the same unit
    // ============================================================

    if (caseRecord.currentUnitId === toUnit.unitId) {
      throw new Error(
        "Case is already assigned to this organizational unit.",
      );
    }

    // ============================================================
    // 8. CHECK FOR REASSIGNMENT
    // ============================================================
    //
    // We check the MOST RECENT workflow assignment.
    //
    // Example:
    //
    // D → G1
    // G1 → D
    //
    // The latest assignment is:
    //
    // fromUnitId = G1
    // toUnitId   = D
    //
    // Current case location = D
    //
    // If requested destination = G1,
    // then this is REASSIGN.
    //
    // Therefore ASSIGN must reject it.
    //
    // ============================================================

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

    // ============================================================
    // 9. Remember current unit
    // ============================================================

    const fromUnitId = caseRecord.currentUnitId;

    // ============================================================
    // 10. Complete current active assignment
    // ============================================================

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

    // ============================================================
    // 11. Create new workflow assignment
    // ============================================================

    const assignment =
      await tx.workflowAssignment.create({
        data: {
          caseId,
          fromUnitId,
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

    // ============================================================
    // 12. Update case location and status
    // ============================================================

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

    // ============================================================
    // 13. Record status history
    // ============================================================

    await tx.statusHistory.create({
      data: {
        caseId,
        changedBy: userId,
        status: "UNDER_REVIEW",
      },
    });

    // ============================================================
    // 14. Record audit log
    // ============================================================

    await tx.auditLog.create({
      data: {
        userId,
        caseId,
        action: "CASE_ASSIGNED",
        entityType: "CASE",
        entityId: caseId,

        oldValues: {
          currentUnitId: fromUnitId,
          status: caseRecord.status,
        },

        newValues: {
          currentUnitId: toUnit.unitId,
          status: "UNDER_REVIEW",
          assignmentId: assignment.assignmentId,
        },
      },
    });

    // ============================================================
    // 15. Return result
    // ============================================================

    return {
      case: updatedCase,
      assignment,
    };
  });
}


// ============================================================
// VALID FORWARD ASSIGNMENT ROUTES
// ============================================================
//
// ASSIGN:
//
// Records & Archive → Sector
// Sector             → Directorate
// Directorate        → Group
//
// ============================================================

function isValidForwardRoute(
  fromUnitType: string | null,
  fromUnitName: string | null,
  toUnitType: string,
): boolean {
  if (!fromUnitType) {
    return false;
  }

  // ------------------------------------------------------------
  // Records & Archive → Sector
  // ------------------------------------------------------------

  if (
    fromUnitName === "Records & Archive Directorate" &&
    toUnitType === "SECTOR"
  ) {
    return true;
  }

  // ------------------------------------------------------------
  // Sector → Directorate
  // ------------------------------------------------------------

  if (
    fromUnitType === "SECTOR" &&
    toUnitType === "DIRECTORATE"
  ) {
    return true;
  }

  // ------------------------------------------------------------
  // Directorate → Group
  // ------------------------------------------------------------

  if (
    fromUnitType === "DIRECTORATE" &&
    toUnitType === "GROUP"
  ) {
    return true;
  }

  return false;
}


// ============================================================
// CHECK WHETHER ASSIGNMENT REQUIRES REASSIGN
// ============================================================
//
// We look at the MOST RECENT workflow assignment.
//
// Example:
//
// D → G1       COMPLETED
// G1 → D       ACTIVE
//
// Current:
//
// D
//
// Requested:
//
// D → G1
//
// Therefore:
//
// ❌ ASSIGN
// ✅ REASSIGN
//
// ------------------------------------------------------------
//
// But:
//
// D → G1       COMPLETED
// G1 → D       ACTIVE
//
// Requested:
//
// D → G2
//
// Therefore:
//
// ✅ ASSIGN
//
// ============================================================

async function wasReturnedFromDestination(
  tx:  Prisma.TransactionClient,
  caseId: string,
  currentUnitId: string,
  destinationUnitId: string,
): Promise<boolean> {
  // IMPORTANT:
  //
  // We intentionally DO NOT filter by assignmentStatus.
  //
  // Why?
  //
  // The return assignment is ACTIVE because the case is
  // currently sitting at the unit it was returned to.
  //
  // Example:
  //
  // G1 → D
  //
  // This is the latest assignment and it is ACTIVE.

  const latestAssignment =
    await tx.workflowAssignment.findFirst({
      where: {
        caseId,
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

  // No workflow history.
  //
  // This means this is a normal first assignment.

  if (!latestAssignment) {
    return false;
  }

  // ============================================================
  // Detect:
  //
  // destination → current
  //
  // Example:
  //
  // G1 → D
  //
  // Current = D
  // Destination = G1
  //
  // Therefore:
  //
  // G1 → D matches
  //
  // This means the destination just returned the case.
  // ============================================================

  return (
    latestAssignment.fromUnitId === destinationUnitId &&
    latestAssignment.toUnitId === currentUnitId
  );
}

// ============================================================
// RETURN CASE
// ============================================================
//
// RETURN means moving work backward:
//
// Group        → Directorate
// Directorate  → Sector
//
// RETURN does NOT allow:
//
// Group → Sector
// Group → Records & Archive
// Directorate → Directorate
// Directorate → Records & Archive
// Sector → Records & Archive
//
// ============================================================

// ============================================================
// RETURN CASE
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
    // 3. CASE MUST CURRENTLY BELONG TO USER'S UNIT
    // ========================================================

    if (caseRecord.currentUnitId !== user.unit.unitId) {
      throw new Error(
        "You can only return cases currently held by your organizational unit.",
      );
    }

    // ========================================================
    // 4. CURRENT UNIT MUST BE ELIGIBLE TO RETURN
    //
    // Only:
    //
    // GROUP        → DIRECTORATE
    // DIRECTORATE  → SECTOR
    //
    // Sector cannot return.
    // Records & Archive cannot return.
    // ========================================================

    if (
      user.unit.unitType !== "GROUP" &&
      user.unit.unitType !== "DIRECTORATE"
    ) {
      throw new Error(
        "Only Group and Directorate users can return cases.",
      );
    }

    // ========================================================
    // 5. FIND PARENT UNIT
    //
    // Return destination is determined by the organizational
    // hierarchy, NOT by the previous workflow assignment.
    // ========================================================

    if (!user.unit.parentUnitId) {
      throw new Error(
        "This organizational unit has no parent unit and cannot return the case.",
      );
    }

    const parentUnit = await tx.organizationalUnit.findUnique({
      where: {
        unitId: user.unit.parentUnitId,
      },
    });

    if (!parentUnit) {
      throw new Error(
        "Parent organizational unit not found.",
      );
    }

    if (!parentUnit.isActive) {
      throw new Error(
        "Parent organizational unit is inactive.",
      );
    }

    // ========================================================
    // 6. VALIDATE THE HIERARCHICAL RETURN ROUTE
    //
    // GROUP → DIRECTORATE
    // DIRECTORATE → SECTOR
    //
    // Nothing else is allowed.
    // ========================================================

    const validReturn = isValidReturnRoute(
      user.unit.unitType,
      parentUnit.unitType,
    );

    if (!validReturn) {
      throw new Error(
        `Invalid return route: ${user.unit.name} → ${parentUnit.name}`,
      );
    }

    // ========================================================
    // 7. MAKE SURE CASE IS NOT ALREADY AT PARENT
    // ========================================================

    if (caseRecord.currentUnitId === parentUnit.unitId) {
      throw new Error(
        "Case is already assigned to the parent organizational unit.",
      );
    }

    // ========================================================
    // 8. COMPLETE CURRENT ACTIVE ASSIGNMENT
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
    // 9. CREATE RETURN WORKFLOW ASSIGNMENT
    // ========================================================

    const assignment =
      await tx.workflowAssignment.create({
        data: {
          caseId,
          fromUnitId: user.unit.unitId,
          toUnitId: parentUnit.unitId,
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
    // 10. UPDATE CASE LOCATION
    // ========================================================

    const updatedCase = await tx.case.update({
      where: {
        caseId,
      },
      data: {
        currentUnitId: parentUnit.unitId,
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
    // 11. STATUS HISTORY
    // ========================================================

    await tx.statusHistory.create({
      data: {
        caseId,
        changedBy: userId,
        status: "SENT_BACK_FOR_CORRECTION",
      },
    });

    // ========================================================
    // 12. AUDIT LOG
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
          currentUnitId: parentUnit.unitId,
          status: "SENT_BACK_FOR_CORRECTION",
          assignmentId: assignment.assignmentId,
          remarks: input.remarks,
        },
      },
    });

    // ========================================================
    // 13. RETURN RESULT
    // ========================================================

    return {
      case: updatedCase,
      assignment,
      returnedFrom: user.unit,
      returnedTo: parentUnit,
    };
  });
}


// ============================================================
// VALID RETURN ROUTES
// ============================================================

function isValidReturnRoute(
  fromUnitType: string,
  toUnitType: string,
): boolean {
  // ==========================================================
  // GROUP → DIRECTORATE
  // ==========================================================

  if (
    fromUnitType === "GROUP" &&
    toUnitType === "DIRECTORATE"
  ) {
    return true;
  }

  // ==========================================================
  // DIRECTORATE → SECTOR
  // ==========================================================

  if (
    fromUnitType === "DIRECTORATE" &&
    toUnitType === "SECTOR"
  ) {
    return true;
  }

  // ==========================================================
  // EVERYTHING ELSE IS INVALID
  // ==========================================================

  return false;
}



// ============================================================
// MAKE CASE DECISION
// ============================================================
//
// FINAL DECISION
//
// Only a SECTOR can make the final decision.
//
// Decision:
//   APPROVED
//   REJECTED
//
// Case status becomes:
//   APPROVED
//   REJECTED
//
// Workflow statuses such as:
//   UNDER_REVIEW
//   IN_PROGRESS
//   PENDING_CLARIFICATION
//   SENT_BACK_FOR_CORRECTION
//
// are NOT final decisions.
//
// ============================================================

export async function makeCaseDecision(
  caseId: string,
  userId: string,
  input: CaseDecisionInput,
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    // 2. FIND DECISION-MAKING USER
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
      throw new Error(
        "Decision-making user not found.",
      );
    }

    if (!user.isActive) {
      throw new Error(
        "Decision-making user is inactive.",
      );
    }

    // ========================================================
    // 3. USER MUST BELONG TO AN ORGANIZATIONAL UNIT
    // ========================================================

    if (!user.unit) {
      throw new Error(
        "Decision-making user is not assigned to an organizational unit.",
      );
    }

    // ========================================================
    // 4. ONLY SECTOR CAN MAKE FINAL DECISION
    // ========================================================

    if (user.unit.unitType !== "SECTOR") {
      throw new Error(
        "Only Sector users can approve or reject cases.",
      );
    }

    // ========================================================
    // 5. CASE MUST CURRENTLY BELONG TO USER'S SECTOR
    // ========================================================

    if (caseRecord.currentUnitId !== user.unit.unitId) {
      throw new Error(
        "You can only make a decision on cases currently held by your organizational unit.",
      );
    }

    // ========================================================
    // 6. MAKE SURE CASE DOES NOT ALREADY HAVE A FINAL
    //    DECISION
    // ========================================================

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

    // ========================================================
    // 7. MAKE SURE CASE IS NOT ALREADY FINALIZED
    // ========================================================

    if (
      caseRecord.status === "APPROVED" ||
      caseRecord.status === "REJECTED"
    ) {
      throw new Error(
        "Case is already finalized.",
      );
    }

    // ========================================================
    // 8. DETERMINE NEW CASE STATUS
    // ========================================================

    const newStatus =
      input.decisionType === "APPROVED"
        ? "APPROVED"
        : "REJECTED";

    // ========================================================
    // 9. CREATE DECISION RECORD
    // ========================================================

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

    // ========================================================
    // 10. UPDATE CASE STATUS
    // ========================================================

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

    // ========================================================
    // 11. STATUS HISTORY
    // ========================================================

    await tx.statusHistory.create({
      data: {
        caseId,
        changedBy: userId,
        status: newStatus,
      },
    });

    // ========================================================
    // 12. AUDIT LOG
    // ========================================================

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
          decisionText: input.decisionText ?? null,
        },
      },
    });

    // ========================================================
    // 13. RETURN RESULT
    // ========================================================

    return {
      case: updatedCase,
      decision,
    };
  });
}


// ============================================================
// TRANSFER CASE
// ============================================================
//
// Business rule:
//
// Directorate → another Directorate
//
// Transfer is different from:
//   ASSIGN  = forward work downward
//   RETURN  = send work backward
//   TRANSFER = move work directly between Directorates
//
// Allowed:
//
// Directorate A → Directorate B
//
// Only if both Directorates belong to the SAME Sector.
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
    // 3. USER MUST CURRENTLY HOLD THE CASE
    // ========================================================

    if (caseRecord.currentUnitId !== user.unitId) {
      throw new Error(
        "You can only transfer cases currently held by your organizational unit.",
      );
    }

    // ========================================================
    // 4. CURRENT UNIT MUST BE A DIRECTORATE
    // ========================================================

    if (user.unit.unitType !== "DIRECTORATE") {
      throw new Error(
        "Only Directorate users can transfer cases.",
      );
    }

    // ========================================================
    // 5. FIND DESTINATION UNIT
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
    // 6. DESTINATION MUST ALSO BE A DIRECTORATE
    // ========================================================

    if (toUnit.unitType !== "DIRECTORATE") {
      throw new Error(
        "Transfer is only allowed from one Directorate to another Directorate.",
      );
    }

    // ========================================================
    // 7. CANNOT TRANSFER TO SAME DIRECTORATE
    // ========================================================

    if (user.unit.unitId === toUnit.unitId) {
      throw new Error(
        "A case cannot be transferred to the same Directorate.",
      );
    }

    // ========================================================
    // 8. BOTH DIRECTORATES MUST BELONG TO SAME SECTOR
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

    if (user.unit.parentUnitId !== toUnit.parentUnitId) {
      throw new Error(
        "A case can only be transferred between Directorates within the same Sector.",
      );
    }

    // ========================================================
    // 9. COMPLETE CURRENT ACTIVE ASSIGNMENT
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
    // 10. CREATE TRANSFER ASSIGNMENT
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
    // 11. UPDATE CASE LOCATION
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
          transferType: "DIRECTORATE_TO_DIRECTORATE",
        },
      },
    });

    // ========================================================
    // 14. RETURN RESULT
    // ========================================================

    return {
      case: updatedCase,
      assignment: transferAssignment,
      transferredFrom: user.unit,
      transferredTo: toUnit,
    };
  });
}


// ============================================================
// REASSIGN CASE
// ============================================================

export async function reassignCase(
  caseId: string,
  userId: string,
  input: ReassignCaseInput,
) {
  return prisma.$transaction(async (tx) => {
    // ========================================================
    // 1. Find case
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
    // 2. Find user
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
    // 3. User must own the case
    // ========================================================

    if (caseRecord.currentUnitId !== user.unit.unitId) {
      throw new Error(
        "You can only reassign cases currently held by your organizational unit.",
      );
    }

    const currentUnit = user.unit;

    // ========================================================
    // 4. Find destination unit
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
    // 5. Destination must be different from current unit
    // ========================================================

    if (toUnit.unitId === currentUnit.unitId) {
      throw new Error(
        "Case is already held by this organizational unit.",
      );
    }

    // ========================================================
    // 6. Find the return that brought the case BACK
    //    to the current unit.
    //
    // Example:
    //
    // D → G1
    // G1 → D   RETURN
    //
    // We need to find that G1 → D return.
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

    // ========================================================
    // 7. The latest incoming movement MUST be a RETURN
    //
    // We identify this by checking that the case came back
    // from the unit that previously received it.
    // ========================================================

    const returnedFromUnitId =
      latestIncomingAssignment.fromUnitId;

    if (!returnedFromUnitId) {
      throw new Error(
        "Case cannot be reassigned because no previous unit was found.",
      );
    }

    // ========================================================
    // 8. Verify that the previous movement was:
    //
    // currentUnit → returnedFromUnit
    //
    // Example:
    //
    // D → G1
    //
    // and then:
    //
    // G1 → D
    //
    // Therefore G1 is the ONLY valid reassignment target.
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
    // 9. Destination MUST be the same unit that previously
    //    received the case before returning it.
    // ========================================================

    if (toUnit.unitId !== returnedFromUnitId) {
      throw new Error(
        "Invalid reassignment destination. A case can only be reassigned to the same organizational unit that previously returned it.",
      );
    }

    // ========================================================
    // 10. Validate level-specific reassignment
    // ========================================================

    const validReassignRoute =
      isValidReassignRoute(
        currentUnit.unitType,
        toUnit.unitType,
      );

    if (!validReassignRoute) {
      throw new Error(
        `Invalid reassignment route: ${currentUnit.name} → ${toUnit.name}`,
      );
    }

    // ========================================================
    // 11. Complete current active assignment
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
    // 12. Create reassignment
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
    // 13. Update case
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
    // 14. Status history
    // ========================================================

    await tx.statusHistory.create({
      data: {
        caseId,
        changedBy: userId,
        status: "UNDER_REVIEW",
      },
    });

    // ========================================================
    // 15. Audit log
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
): boolean {
  // Directorate → Group
  //
  // D → G1
  // G1 → D
  // D → G1 (REASSIGN)
  if (
    fromUnitType === "DIRECTORATE" &&
    toUnitType === "GROUP"
  ) {
    return true;
  }

  // Sector → Directorate
  //
  // S → D1
  // D1 → S
  // S → D1 (REASSIGN)
  if (
    fromUnitType === "SECTOR" &&
    toUnitType === "DIRECTORATE"
  ) {
    return true;
  }

  return false;
}