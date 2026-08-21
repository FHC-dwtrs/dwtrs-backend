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
          versions: {
            include: {
              attachments: true,
            },
          },
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

//////////////case creating
export async function createCase(input: CreateCaseInput, userId: string,) {
    return prisma.$transaction(async (tx) => {
      // Find the Records & Archive Directorate
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
  
      // Create customer
      const customer = await tx.customer.create({
        data: {
          name: input.customer.name,
          phone: input.customer.phone,
          email: input.customer.email,
          address: input.customer.address,
        },
      });
  
      // Generate tracking number
      const trackingNumber = `FHC-${Date.now()}`;
  
      // Create case
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