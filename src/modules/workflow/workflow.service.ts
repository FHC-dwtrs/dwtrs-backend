import prisma from "../../config/database";
import type { AssignCaseInput, CaseDecisionInput, ReturnCaseInput } from "./workflow.validation";

export async function assignCase(
  caseId: string,
  userId: string,
  input: AssignCaseInput,
) {
  return prisma.$transaction(async (tx) => {
    // 1. Find the case
    const caseRecord = await tx.case.findUnique({
      where: {
        caseId,
      },
    });

    if (!caseRecord) {
      throw new Error("Case not found.");
    }

    // 2. Find the destination organizational unit
    const toUnit = await tx.organizationalUnit.findUnique({
      where: {
        unitId: input.toUnitId,
      },
    });


    if (!toUnit) {
      throw new Error("Destination organizational unit not found.");
    }

    if (!toUnit.isActive) {
      throw new Error("Destination organizational unit is inactive.");
    }

    const fromUnit = caseRecord.currentUnitId
  ? await tx.organizationalUnit.findUnique({
      where: {
        unitId: caseRecord.currentUnitId,
      },
    })
  : null;

  const validRoute = isValidRoute(
    fromUnit?.unitType ?? null,
    fromUnit?.name ?? null,
    toUnit.unitType,
  );
  
  if (!validRoute) {
    throw new Error(
      `Invalid workflow route: ${fromUnit?.name ?? "Unknown"} → ${toUnit.name}`,
    );
  }

    function isValidRoute(
        fromUnitType: string | null,
        fromUnitName: string | null,
        toUnitType: string,
      ): boolean {
        if (!fromUnitType) {
          return false;
        }
      
        // Records & Archive → Sector
        if (
          fromUnitName === "Records & Archive Directorate" &&
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
      
        // Directorate → Directorate
        if (
          fromUnitType === "DIRECTORATE" &&
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
      
        // Group → Directorate
        if (
          fromUnitType === "GROUP" &&
          toUnitType === "DIRECTORATE"
        ) {
          return true;
        }
      
        // Directorate → Sector
        if (
          fromUnitType === "DIRECTORATE" &&
          toUnitType === "SECTOR"
        ) {
          return true;
        }
      
        return false;
      }

    // 3. Find the user performing the assignment
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

    if (caseRecord.currentUnitId !== user.unitId) {
        throw new Error(
          "You can only assign cases currently held by your organizational unit.",
        );
      }
      
    // 4. Make sure the case is not already at the destination
    if (caseRecord.currentUnitId === toUnit.unitId) {
      throw new Error(
        "Case is already assigned to this organizational unit.",
      );
    }

    // 5. Remember where the case currently is
    const fromUnitId = caseRecord.currentUnitId;

    // 6. Complete any currently active assignment
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

    // 7. Create the new workflow assignment
    const assignment = await tx.workflowAssignment.create({
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

    // 8. Update the case's current location/status
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

    // 9. Record status history
    await tx.statusHistory.create({
      data: {
        caseId,
        changedBy: userId,
        status: "UNDER_REVIEW",
      },
    });

    // 10. Record audit log
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

    return {
      case: updatedCase,
      assignment,
    };
  });
}


// ============================================================
// SECTOR DECISION
// ============================================================

export async function makeCaseDecision(
  caseId: string,
  userId: string,
  input: CaseDecisionInput,
) {
  return prisma.$transaction(async (tx) => {
    // 1. Find the case
    const caseRecord = await tx.case.findUnique({
      where: {
        caseId,
      },
    });

    if (!caseRecord) {
      throw new Error("Case not found.");
    }

    // 2. Find the user
    const user = await tx.user.findUnique({
      where: {
        userId,
      },
      include: {
        unit: true,
      },
    });

    if (!user) {
      throw new Error("Decision-making user not found.");
    }

    if (!user.isActive) {
      throw new Error("Decision-making user is inactive.");
    }

    // 3. User must belong to an organizational unit
    if (!user.unit) {
      throw new Error(
        "Decision-making user is not assigned to an organizational unit.",
      );
    }

    // 4. Only SECTOR users can make this decision
    if (user.unit.unitType !== "SECTOR") {
      throw new Error(
        "Only Sector users can approve or reject cases.",
      );
    }

    // 5. Case must currently belong to this Sector
    if (caseRecord.currentUnitId !== user.unit.unitId) {
      throw new Error(
        "You can only make a decision on cases currently held by your organizational unit.",
      );
    }

    // 6. Prevent decisions on already-final cases
    if (
      caseRecord.status === "APPROVED" ||
      caseRecord.status === "REJECTED" ||
      caseRecord.status === "ARCHIVED"
    ) {
      throw new Error(
        "A final decision has already been made for this case.",
      );
    }

    // 7. Create decision record
    const decision = await tx.decision.create({
      data: {
        caseId,
        decidedBy: userId,
        decisionType: input.decisionType,
        decisionText: input.decisionText,
      },
      include: {
        decider: true,
      },
    });

    // 8. Determine new case status
    const newStatus =
      input.decisionType === "APPROVED"
        ? "APPROVED"
        : "REJECTED";

    // 9. Update case
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

    // 10. Complete active workflow assignment
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

    // 11. Record status history
    await tx.statusHistory.create({
      data: {
        caseId,
        changedBy: userId,
        status: newStatus,
      },
    });

    // 12. Record audit log
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
          decisionId: decision.decisionId,
        },
      },
    });

    return {
      case: updatedCase,
      decision,
    };
  });
}


// ============================================================
// RETURN CASE
// ============================================================

export async function returnCase(
  caseId: string,
  userId: string,
  input: ReturnCaseInput,
) {
  return prisma.$transaction(async (tx) => {
    // 1. Find the case
    const caseRecord = await tx.case.findUnique({
      where: {
        caseId,
      },
    });

    if (!caseRecord) {
      throw new Error("Case not found.");
    }

    // 2. Find the user performing the return
    const user = await tx.user.findUnique({
      where: {
        userId,
      },
    });

    if (!user) {
      throw new Error("Returning user not found.");
    }

    if (!user.isActive) {
      throw new Error("Returning user is inactive.");
    }

    // 3. User must belong to the unit currently holding the case
    if (caseRecord.currentUnitId !== user.unitId) {
      throw new Error(
        "You can only return cases currently held by your organizational unit.",
      );
    }

    if (!caseRecord.currentUnitId) {
      throw new Error("Case has no current organizational unit.");
    }

    // 4. Get the current unit
    const currentUnit = await tx.organizationalUnit.findUnique({
      where: {
        unitId: caseRecord.currentUnitId,
      },
    });

    if (!currentUnit) {
      throw new Error("Current organizational unit not found.");
    }

    // 5. Find the most recent completed assignment
    //    that brought the case INTO the current unit.
    const previousAssignment =
      await tx.workflowAssignment.findFirst({
        where: {
          caseId,
          toUnitId: currentUnit.unitId,
          //assignmentStatus: "COMPLETED",
        },
        orderBy: {
          assignedAt: "desc",
        },
      });

    if (!previousAssignment) {
      throw new Error(
        "No previous organizational unit found for this case.",
      );
    }

    if (!previousAssignment.fromUnitId) {
      throw new Error(
        "Case cannot be returned because there is no previous organizational unit.",
      );
    }

    // 6. Find the previous organizational unit
    const previousUnit =
      await tx.organizationalUnit.findUnique({
        where: {
          unitId: previousAssignment.fromUnitId,
        },
      });

    if (!previousUnit) {
      throw new Error(
        "Previous organizational unit not found.",
      );
    }

    if (!previousUnit.isActive) {
      throw new Error(
        "Previous organizational unit is inactive.",
      );
    }

    // ========================================================
    // IMPORTANT WORKFLOW RULE
    //
    // Return is only allowed according to the business flow.
    //
    // Directorate → Sector
    // Group → Directorate
    //
    // We DO NOT allow:
    //
    // Sector → Records & Archive
    // ========================================================

    const validReturn =
      isValidReturnRoute(
        currentUnit.unitType,
        previousUnit.unitType,
        previousUnit.name,
      );

    if (!validReturn) {
      throw new Error(
        `Invalid return route: ${currentUnit.name} → ${previousUnit.name}`,
      );
    }

    // 7. Complete current active assignment
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

    // 8. Create return assignment
    const assignment =
      await tx.workflowAssignment.create({
        data: {
          caseId,
          fromUnitId: currentUnit.unitId,
          toUnitId: previousUnit.unitId,
          assignedBy: userId,
          assignmentStatus: "ACTIVE",
          remarks: input.remarks,
        },
        include: {
          fromUnit: true,
          toUnit: true,
        },
      });

    // 9. Update case location and status
    const updatedCase = await tx.case.update({
      where: {
        caseId,
      },
      data: {
        currentUnitId: previousUnit.unitId,
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

    // 10. Record status history
    await tx.statusHistory.create({
      data: {
        caseId,
        changedBy: userId,
        status: "SENT_BACK_FOR_CORRECTION",
      },
    });

    // 11. Audit log
    await tx.auditLog.create({
      data: {
        userId,
        caseId,
        action: "CASE_RETURNED",
        entityType: "CASE",
        entityId: caseId,

        oldValues: {
          currentUnitId: currentUnit.unitId,
          status: caseRecord.status,
        },

        newValues: {
          currentUnitId: previousUnit.unitId,
          status: "SENT_BACK_FOR_CORRECTION",
          assignmentId: assignment.assignmentId,
          remarks: input.remarks,
        },
      },
    });

    return {
      case: updatedCase,
      assignment,
      returnedFrom: currentUnit,
      returnedTo: previousUnit,
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

  // Directorate → Sector
  if (
    fromUnitType === "DIRECTORATE" &&
    toUnitType === "SECTOR"
  ) {
    return true;
  }

  // Group → Directorate
  if (
    fromUnitType === "GROUP" &&
    toUnitType === "DIRECTORATE"
  ) {
    return true;
  }

  // IMPORTANT:
  // Sector → Records & Archive is NOT allowed.
  if (
    fromUnitType === "SECTOR" &&
    toUnitName === "Records & Archive Directorate"
  ) {
    return false;
  }

  return false;
}