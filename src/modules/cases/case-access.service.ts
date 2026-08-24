import prisma from "../../config/database";

/**
 * Checks whether a user has access to a case.
 *
 * A user can access a case when:
 * 1. The case currently belongs to the user's organizational unit.
 *
 * This is based on Case.currentUnitId, which is updated whenever
 * the case moves through the workflow.
 */
export const hasCaseAccess = async (
  caseId: string,
  userId: string,
): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      unitId: true,
    },
  });

  if (!user || !user.unitId) {
    return false;
  }

  const caseRecord = await prisma.case.findUnique({
    where: {
      caseId,
    },
    select: {
      currentUnitId: true,
    },
  });

  if (!caseRecord) {
    return false;
  }

  return caseRecord.currentUnitId === user.unitId;
};