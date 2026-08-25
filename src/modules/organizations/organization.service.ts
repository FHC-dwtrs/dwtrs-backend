import prisma from "../../config/database";
import { createAuditLog } from "../audit/audit.service";

import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  UpdateOrganizationStatusInput,
  OrganizationQueryInput,
} from "./organization.validation";

const VALID_PARENT_TYPES: Record<
  string,
  string | null
> = {
  SECTOR: null,
  DIRECTORATE: "SECTOR",
  GROUP: "DIRECTORATE",
};

// ============================================================
// CREATE ORGANIZATIONAL UNIT
// ============================================================

export async function createOrganization(
  userId: string,
  input: CreateOrganizationInput,
) {
  return prisma.$transaction(async (tx) => {
    // --------------------------------------------------------
    // Validate parent
    // --------------------------------------------------------

    if (
      input.unitType === "SECTOR" &&
      input.parentUnitId
    ) {
      throw new Error(
        "A Sector cannot have a parent organizational unit.",
      );
    }

    if (
      input.unitType !== "SECTOR" &&
      !input.parentUnitId
    ) {
      throw new Error(
        `${input.unitType} must have a parent organizational unit.`,
      );
    }

    let parentUnit = null;

    if (input.parentUnitId) {
      parentUnit =
        await tx.organizationalUnit.findUnique({
          where: {
            unitId: input.parentUnitId,
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

      const expectedParent =
        VALID_PARENT_TYPES[input.unitType];

      if (
        expectedParent &&
        parentUnit.unitType !== expectedParent
      ) {
        throw new Error(
          `${input.unitType} must belong to a ${expectedParent}.`,
        );
      }
    }

    // --------------------------------------------------------
    // Check duplicate name
    // --------------------------------------------------------

    const existing =
      await tx.organizationalUnit.findFirst({
        where: {
          name: input.name,
        },
      });

    if (existing) {
      throw new Error(
        "An organizational unit with this name already exists.",
      );
    }

    // --------------------------------------------------------
    // Create
    // --------------------------------------------------------

    const organization =
      await tx.organizationalUnit.create({
        data: {
          name: input.name,
          unitType: input.unitType,
          parentUnitId:
            input.parentUnitId ?? null,
          isActive: true,
        },
      });

    // --------------------------------------------------------
    // Audit
    // --------------------------------------------------------

    await createAuditLog(tx, {
      userId,
      action: "ORGANIZATIONAL_UNIT_CREATED",
      entityType: "ORGANIZATIONAL_UNIT",
      entityId: organization.unitId,

      newValues: {
        name: organization.name,
        unitType: organization.unitType,
        parentUnitId:
          organization.parentUnitId,
        isActive: organization.isActive,
      },
    });

    return organization;
  });
}

// ============================================================
// GET ORGANIZATIONAL UNITS
// ============================================================

export async function getOrganizations(
  input: OrganizationQueryInput,
) {
  return prisma.organizationalUnit.findMany({
    where: {
      ...(input.unitType
        ? {
            unitType: input.unitType,
          }
        : {}),

      ...(input.isActive !== undefined
        ? {
            isActive: input.isActive,
          }
        : {}),
    },

    orderBy: {
      name: "asc",
    },

    include: {
      parent: {
        select: {
          unitId: true,
          name: true,
          unitType: true,
        },
      },

      _count: {
        select: {
          children: true,
          users: true,
        },
      },
    },
  });
}

// ============================================================
// GET ONE ORGANIZATIONAL UNIT
// ============================================================

export async function getOrganizationById(
  unitId: string,
) {
  return prisma.organizationalUnit.findUnique({
    where: {
      unitId,
    },

    include: {
      parent: true,

      children: {
        orderBy: {
          name: "asc",
        },
      },

      _count: {
        select: {
          children: true,
          users: true,
        },
      },
    },
  });
}

// ============================================================
// UPDATE ORGANIZATIONAL UNIT
// ============================================================

export async function updateOrganization(
  unitId: string,
  userId: string,
  input: UpdateOrganizationInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing =
      await tx.organizationalUnit.findUnique({
        where: {
          unitId,
        },
      });

    if (!existing) {
      throw new Error(
        "Organizational unit not found.",
      );
    }

    // --------------------------------------------------------
    // Validate new name
    // --------------------------------------------------------

    if (input.name) {
      const duplicate =
        await tx.organizationalUnit.findFirst({
          where: {
            name: input.name,
            unitId: {
              not: unitId,
            },
          },
        });

      if (duplicate) {
        throw new Error(
          "An organizational unit with this name already exists.",
        );
      }
    }

    // --------------------------------------------------------
    // Determine resulting parent
    // --------------------------------------------------------

    const resultingParentId =
      input.parentUnitId !== undefined
        ? input.parentUnitId
        : existing.parentUnitId;

    if (
      existing.unitType === "SECTOR" &&
      resultingParentId
    ) {
      throw new Error(
        "A Sector cannot have a parent organizational unit.",
      );
    }

    if (
      existing.unitType !== "SECTOR" &&
      !resultingParentId
    ) {
      throw new Error(
        `${existing.unitType} must have a parent organizational unit.`,
      );
    }

    // --------------------------------------------------------
    // Validate parent
    // --------------------------------------------------------

    if (resultingParentId) {
      if (resultingParentId === unitId) {
        throw new Error(
          "An organizational unit cannot be its own parent.",
        );
      }

      const parent =
        await tx.organizationalUnit.findUnique({
          where: {
            unitId: resultingParentId,
          },
        });

      if (!parent) {
        throw new Error(
          "Parent organizational unit not found.",
        );
      }

      if (!parent.isActive) {
        throw new Error(
          "Parent organizational unit is inactive.",
        );
      }

      const expectedParent =
        VALID_PARENT_TYPES[
          existing.unitType
        ];

      if (
        expectedParent &&
        parent.unitType !== expectedParent
      ) {
        throw new Error(
          `${existing.unitType} must belong to a ${expectedParent}.`,
        );
      }
    }

    // --------------------------------------------------------
    // Update
    // --------------------------------------------------------

    const updated =
      await tx.organizationalUnit.update({
        where: {
          unitId,
        },

        data: {
          ...(input.name !== undefined
            ? { name: input.name }
            : {}),

          ...(input.parentUnitId !== undefined
            ? {
                parentUnitId:
                  input.parentUnitId,
              }
            : {}),
        },
      });

    // --------------------------------------------------------
    // Audit
    // --------------------------------------------------------

    await createAuditLog(tx, {
      userId,
      action: "ORGANIZATIONAL_UNIT_UPDATED",
      entityType: "ORGANIZATIONAL_UNIT",
      entityId: unitId,

      oldValues: {
        name: existing.name,
        parentUnitId:
          existing.parentUnitId,
      },

      newValues: {
        name: updated.name,
        parentUnitId:
          updated.parentUnitId,
      },
    });

    return updated;
  });
}

// ============================================================
// ACTIVATE / DEACTIVATE
// ============================================================

export async function updateOrganizationStatus(
  unitId: string,
  userId: string,
  input: UpdateOrganizationStatusInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing =
      await tx.organizationalUnit.findUnique({
        where: {
          unitId,
        },
      });

    if (!existing) {
      throw new Error(
        "Organizational unit not found.",
      );
    }

    // Don't deactivate a unit that still has active children.
    if (!input.isActive) {
      const activeChildren =
        await tx.organizationalUnit.count({
          where: {
            parentUnitId: unitId,
            isActive: true,
          },
        });

      if (activeChildren > 0) {
        throw new Error(
          "Cannot deactivate an organizational unit with active child units.",
        );
      }
    }

    const updated =
      await tx.organizationalUnit.update({
        where: {
          unitId,
        },

        data: {
          isActive: input.isActive,
        },
      });

    await createAuditLog(tx, {
      userId,
      action:
        input.isActive
          ? "ORGANIZATIONAL_UNIT_ACTIVATED"
          : "ORGANIZATIONAL_UNIT_DEACTIVATED",
      entityType: "ORGANIZATIONAL_UNIT",
      entityId: unitId,

      oldValues: {
        isActive: existing.isActive,
      },

      newValues: {
        isActive: updated.isActive,
      },
    });

    return updated;
  });
}

// ============================================================
// GET CHILDREN
// ============================================================

export async function getOrganizationChildren(
  unitId: string,
) {
  const unit =
    await prisma.organizationalUnit.findUnique({
      where: {
        unitId,
      },
    });

  if (!unit) {
    throw new Error(
      "Organizational unit not found.",
    );
  }

  return prisma.organizationalUnit.findMany({
    where: {
      parentUnitId: unitId,
    },

    orderBy: {
      name: "asc",
    },
  });
}

// ============================================================
// GET USERS IN UNIT
// ============================================================

export async function getOrganizationUsers(
  unitId: string,
) {
  const unit =
    await prisma.organizationalUnit.findUnique({
      where: {
        unitId,
      },
    });

  if (!unit) {
    throw new Error(
      "Organizational unit not found.",
    );
  }

  return prisma.user.findMany({
    where: {
      unitId,
    },

    select: {
      userId: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
    },

    orderBy: {
      name: "asc",
    },
  });
}