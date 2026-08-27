import prisma from "../../config/database.js";
import {
  CreateCaseInput,
  UpdateCaseInput,
} from "./case.validation.js";

import { Prisma } from "../../generated/prisma/client.js";
import { createCustomer, getCustomerByPhone, updateCustomer } from "../customers/customer.service.js";
// ============================================================
// GET ALL CASES
// ============================================================

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

// ============================================================
// GET CASE BY ID
// ============================================================

export async function getCaseById(caseId: string) {
  return prisma.case.findUnique({
    where: {
      caseId,
    },

    include: {
      customer: true,

      currentUnit: true,

      documents: {
        where: {
          deletedAt: null,
        },

        include: {
          attachments: {
            where: {
              deletedAt: null,
            },
          },
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
    // --------------------------------------------------------
    // 1. FIND RECORDS & ARCHIVE
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // 2. CREATE CUSTOMER
    // --------------------------------------------------------

    let customer = await getCustomerByPhone(
      input.customer.phone,
      tx,
    );
    
    if (!customer) {
      customer = await createCustomer(
        input.customer,
        tx,
      );
    }

    // --------------------------------------------------------
    // 3. GENERATE TRACKING NUMBER
    // --------------------------------------------------------

    const trackingNumber = `FHC-${Date.now()}`;

    // --------------------------------------------------------
    // 4. CREATE CASE
    // --------------------------------------------------------

    const caseRecord = await tx.case.create({
      data: {
        customerId: customer.customerId,
        trackingNumber,
        incomingReferenceNo:
          input.incomingReferenceNo,
        subject: input.subject,
        status: "SUBMITTED",
        currentUnitId: recordsArchiveUnit.unitId,
      },

      include: {
        customer: true,
        currentUnit: true,
      },
    });

    // --------------------------------------------------------
    // 5. STATUS HISTORY
    // --------------------------------------------------------

    await tx.statusHistory.create({
      data: {
        caseId: caseRecord.caseId,
        changedBy: userId,
        status: "SUBMITTED",
      },
    });

    // --------------------------------------------------------
    // 6. AUDIT LOG
    // --------------------------------------------------------

    await tx.auditLog.create({
      data: {
        userId,
        caseId: caseRecord.caseId,

        action: "CASE_CREATE",
        entityType: "CASE",
        entityId: caseRecord.caseId,

        oldValues: Prisma.JsonNull,

        newValues: {
          caseId: caseRecord.caseId,
          customerId: customer.customerId,
          trackingNumber,
          incomingReferenceNo:
            input.incomingReferenceNo ?? null,
          subject: input.subject,
          status: "SUBMITTED",
          currentUnitId:
            recordsArchiveUnit.unitId,
        },
      },
    });

    return caseRecord;
  });
}

// ============================================================
// UPDATE CASE
// ============================================================

export async function updateCase(
  caseId: string,
  input: UpdateCaseInput,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    // --------------------------------------------------------
    // 1. GET EXISTING CASE
    // --------------------------------------------------------

    const existingCase = await tx.case.findUnique({
      where: {
        caseId,
      },

      include: {
        customer: true,
      },
    });

    if (!existingCase) {
      throw new Error("Case not found");
    }

    // --------------------------------------------------------
    // 2. PREPARE OLD VALUES
    // --------------------------------------------------------

    const oldValues = {
      incomingReferenceNo:
        existingCase.incomingReferenceNo,

      subject: existingCase.subject,

      customer: {
        customerId:
          existingCase.customer.customerId,
        name: existingCase.customer.name,
        phone: existingCase.customer.phone,
        email: existingCase.customer.email,
        address: existingCase.customer.address,
      },
    };

    // --------------------------------------------------------
    // 3. UPDATE CUSTOMER
    // --------------------------------------------------------
    if (input.customer) {
      await updateCustomer(
        existingCase.customerId,
        input.customer,
        tx,
      );
    }
   
    // --------------------------------------------------------
    // 4. UPDATE CASE
    // --------------------------------------------------------

    await tx.case.update({
      where: {
        caseId,
      },

      data: {
        ...(input.incomingReferenceNo !==
          undefined && {
          incomingReferenceNo:
            input.incomingReferenceNo,
        }),

        ...(input.subject !== undefined && {
          subject: input.subject,
        }),

        // Version increases whenever editable case
        // information changes.
        version: {
          increment: 1,
        },
      },
    });

    // --------------------------------------------------------
    // 5. GET UPDATED VALUES
    // --------------------------------------------------------

    const updatedCase = await tx.case.findUnique({
      where: {
        caseId,
      },

      include: {
        customer: true,
        currentUnit: true,
      },
    });

    if (!updatedCase) {
      throw new Error("Case not found after update");
    }

    const newValues = {
      incomingReferenceNo:
        updatedCase.incomingReferenceNo,

      subject: updatedCase.subject,

      customer: {
        customerId:
          updatedCase.customer.customerId,
        name: updatedCase.customer.name,
        phone: updatedCase.customer.phone,
        email: updatedCase.customer.email,
        address: updatedCase.customer.address,
      },
    };

    // --------------------------------------------------------
    // 6. AUDIT
    // --------------------------------------------------------

    await tx.auditLog.create({
      data: {
        userId,
        caseId,

        action: "CASE_UPDATE",
        entityType: "CASE",
        entityId: caseId,

        oldValues,
        newValues,
      },
    });

    return updatedCase;
  });
}