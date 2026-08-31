import prisma from "../../config/database.js";

export async function trackCase(trackingNumber: string) {
  const caseRecord = await prisma.case.findUnique({
    where: {
      trackingNumber,
    },
    select: {
      trackingNumber: true,
      subject: true,
      status: true,
      submittedAt: true,
      updatedAt: true,
    },
  });

  if (!caseRecord) {
    throw new Error("Case not found.");
  }

  return caseRecord;
}