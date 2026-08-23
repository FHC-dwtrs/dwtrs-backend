import prisma from "../../config/database";
import { CreateCaseInput } from "./case.validation";

export async function getCases() {
  return prisma.case.findMany({
    orderBy: {
      submittedAt: "desc",
    },
    include: {
      customer: true,
      currentUnit: true,
    },
  });
}

export async function getCaseById(caseId: string) {
  return prisma.case.findUnique({
    where: {
      caseId,
    },
    include: {
      customer: true,

      currentUnit: true,

      documents: {
        include: {
          attachments: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },

      workflowAssignments: {
        include: {
          fromUnit: true,
          toUnit: true,
        },
        orderBy: {
          assignedAt: "desc",
        },
      },

      statusHistory: {
        orderBy: {
          changedAt: "desc",
        },
      },

      remarks: {
        orderBy: {
          createdAt: "desc",
        },
      },

      decisions: {
        orderBy: {
          decidedAt: "desc",
        },
      },
    },
  });
}

// ============================================================
// CREATE CASE
// ============================================================

export async function createCase(
  input: CreateCaseInput,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    // ========================================================
    // 1. FIND RECORDS & ARCHIVE
    // ========================================================

    const recordsArchiveUnit =
      await tx.organizationalUnit.findFirst({
        where: {
          name: "Records & Archive Directorate",
          unitType: "DIRECTORATE",
          isActive: true,
        },
      });

    if (!recordsArchiveUnit) {
      throw new Error(
        "Records & Archive organizational unit not found.",
      );
    }

    // ========================================================
    // 2. CREATE CUSTOMER
    // ========================================================

    const customer = await tx.customer.create({
      data: {
        name: input.customer.name,
        phone: input.customer.phone,
        email: input.customer.email,
        address: input.customer.address,
      },
    });

    // ========================================================
    // 3. GENERATE TRACKING NUMBER
    // ========================================================

    const trackingNumber = `FHC-${Date.now()}`;

    // ========================================================
    // 4. CREATE CASE
    // ========================================================

    const caseRecord = await tx.case.create({
      data: {
        customerId: customer.customerId,
        trackingNumber,
        incomingReferenceNo: input.incomingReferenceNo,
        subject: input.subject,
        status: "SUBMITTED",
        currentUnitId: recordsArchiveUnit.unitId,
      },
      include: {
        customer: true,
        currentUnit: true,
      },
    });

    // ========================================================
    // 5. STATUS HISTORY
    // ========================================================

    await tx.statusHistory.create({
      data: {
        caseId: caseRecord.caseId,
        changedBy: userId,
        status: "SUBMITTED",
      },
    });

    return caseRecord;
  });
}