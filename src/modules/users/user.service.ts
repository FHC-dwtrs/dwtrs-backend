import argon2 from "argon2";

import prisma from "../../config/database.js";

import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  AssignUserUnitInput,
} from "./user.validation.js";

// ============================================================
// USER SELECT
// ============================================================

const userSelect = {
  userId: true,
  name: true,
  email: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,

  unit: {
    select: {
      unitId: true,
      name: true,
      unitType: true,
      isActive: true,

      parent: {
        select: {
          unitId: true,
          name: true,
          unitType: true,
          isActive: true,
        },
      },
    },
  },

  role: {
    select: {
      roleId: true,
      name: true,
      description: true,
      isActive: true,
    },
  },
};

// ============================================================
// DETERMINE ROLE FROM ORGANIZATIONAL UNIT
// ============================================================

function determineRoleName(
  unitName: string,
  unitType: string,
): string | null {
  const normalizedName = unitName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  // ----------------------------------------------------------
  // Records & Archive
  // ----------------------------------------------------------
  // Records & Archive is a special organizational unit.
  //
  // It may be stored as:
  //   Records & Archive Directorate
  //   Records & Archive Service
  //   Records & Archive Directorate/Service
  //   Records and Archive Directorate
  //   Records and Archive Service
  //
  // All of these receive RECORDS_ARCHIVE_STAFF.
  // ----------------------------------------------------------

  if (
    normalizedName.includes("records & archive") ||
    normalizedName.includes("records and archive")
  ) {
    return "RECORDS_ARCHIVE_STAFF";
  }

  // ----------------------------------------------------------
  // Sector
  // ----------------------------------------------------------

  if (unitType === "SECTOR") {
    return "SECTOR_STAFF";
  }

  // ----------------------------------------------------------
  // Directorate
  // ----------------------------------------------------------

  if (unitType === "DIRECTORATE") {
    return "DIRECTORATE_STAFF";
  }

  // ----------------------------------------------------------
  // Group
  // ----------------------------------------------------------

  if (unitType === "GROUP") {
    return "GROUP_STAFF";
  }

  return null;
}

// ============================================================
// GET ROLE FOR ORGANIZATIONAL UNIT
// ============================================================

async function getRoleForUnit(unitId: string) {
  // ----------------------------------------------------------
  // Find organizational unit
  // ----------------------------------------------------------

  const unit = await prisma.organizationalUnit.findUnique({
    where: {
      unitId,
    },
  });

  if (!unit) {
    throw new Error("Organizational unit not found.");
  }

  // ----------------------------------------------------------
  // Unit must be active
  // ----------------------------------------------------------

  if (!unit.isActive) {
    throw new Error("Organizational unit is inactive.");
  }

  // ----------------------------------------------------------
  // Determine role
  // ----------------------------------------------------------

  const roleName = determineRoleName(
    unit.name,
    unit.unitType,
  );

  if (!roleName) {
    throw new Error(
      "Unable to determine a role for this organizational unit.",
    );
  }

  // ----------------------------------------------------------
  // Find role
  // ----------------------------------------------------------

  const role = await prisma.role.findUnique({
    where: {
      name: roleName,
    },
  });

  if (!role) {
    throw new Error(`Role not found: ${roleName}`);
  }

  // ----------------------------------------------------------
  // Role must be active
  // ----------------------------------------------------------

  if (!role.isActive) {
    throw new Error(`Role is inactive: ${roleName}`);
  }

  return {
    unit,
    role,
  };
}

// ============================================================
// CREATE USER
// ============================================================

export async function createUser(
  input: CreateUserInput,
) {
  // ----------------------------------------------------------
  // Check duplicate email
  // ----------------------------------------------------------

  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingUser) {
    throw new Error(
      "A user with this email already exists.",
    );
  }

  // ----------------------------------------------------------
  // Organizational unit is required
  // ----------------------------------------------------------
  //
  // The role is automatically determined from the unit.
  //
  // Example:
  //
  // Records & Archive
  //        ↓
  // RECORDS_ARCHIVE_STAFF
  //
  // ICT Directorate
  //        ↓
  // DIRECTORATE_STAFF
  //
  // Housing Development Sector
  //        ↓
  // SECTOR_STAFF
  //
  // Group A
  //        ↓
  // GROUP_STAFF
  // ----------------------------------------------------------

  if (!input.unitId) {
    throw new Error(
      "Organizational unit is required when creating a user.",
    );
  }

  // ----------------------------------------------------------
  // Validate unit + determine role
  // ----------------------------------------------------------

  const { unit, role } =
    await getRoleForUnit(input.unitId);

  // ----------------------------------------------------------
  // Hash password
  // ----------------------------------------------------------

  const passwordHash = await argon2.hash(
    input.password,
  );

  // ----------------------------------------------------------
  // Create user
  // ----------------------------------------------------------

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,

      unitId: unit.unitId,
      roleId: role.roleId,

      isActive: input.isActive ?? true,
    },

    select: userSelect,
  });

  return user;
}

// ============================================================
// GET ALL USERS
// ============================================================

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },

    select: userSelect,
  });
}

// ============================================================
// GET USER BY ID
// ============================================================

export async function getUserById(
  userId: string,
) {
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },

    select: userSelect,
  });

  if (!user) {
    throw new Error("User not found.");
  }

  return user;
}

// ============================================================
// UPDATE USER
// ============================================================

export async function updateUser(
  userId: string,
  input: UpdateUserInput,
) {
  // ----------------------------------------------------------
  // Find existing user
  // ----------------------------------------------------------

  const existingUser =
    await prisma.user.findUnique({
      where: {
        userId,
      },
    });

  if (!existingUser) {
    throw new Error("User not found.");
  }

  // ----------------------------------------------------------
  // Email uniqueness
  // ----------------------------------------------------------

  if (
    input.email &&
    input.email !== existingUser.email
  ) {
    const emailExists =
      await prisma.user.findUnique({
        where: {
          email: input.email,
        },
      });

    if (emailExists) {
      throw new Error(
        "A user with this email already exists.",
      );
    }
  }

  // ----------------------------------------------------------
  // Prepare update data
  // ----------------------------------------------------------

  const updateData: {
    name?: string;
    email?: string;
    unitId?: string;
    roleId?: string;
  } = {};

  // ----------------------------------------------------------
  // Update name
  // ----------------------------------------------------------

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  // ----------------------------------------------------------
  // Update email
  // ----------------------------------------------------------

  if (input.email !== undefined) {
    updateData.email = input.email;
  }

  // ----------------------------------------------------------
  // If organizational unit changes,
  // automatically update the role.
  // ----------------------------------------------------------

  if (input.unitId !== undefined) {
    // --------------------------------------------------------
    // A normal staff user must always belong to a unit.
    // --------------------------------------------------------

    if (input.unitId === null) {
      throw new Error(
        "A user cannot be removed from an organizational unit because the user role depends on the unit.",
      );
    }

    // --------------------------------------------------------
    // Validate new unit + determine new role
    // --------------------------------------------------------

    const { unit, role } =
      await getRoleForUnit(input.unitId);

    updateData.unitId = unit.unitId;
    updateData.roleId = role.roleId;
  }

  // ----------------------------------------------------------
  // Update user
  // ----------------------------------------------------------

  return prisma.user.update({
    where: {
      userId,
    },

    data: updateData,

    select: userSelect,
  });
}

// ============================================================
// UPDATE USER STATUS
// ============================================================

export async function updateUserStatus(
  userId: string,
  input: UpdateUserStatusInput,
) {
  // ----------------------------------------------------------
  // Find user
  // ----------------------------------------------------------

  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  // ----------------------------------------------------------
  // Update status
  // ----------------------------------------------------------

  return prisma.user.update({
    where: {
      userId,
    },

    data: {
      isActive: input.isActive,
    },

    select: userSelect,
  });
}

// ============================================================
// ASSIGN USER TO ORGANIZATIONAL UNIT
// ============================================================

export async function assignUserUnit(
  userId: string,
  input: AssignUserUnitInput,
) {
  // ----------------------------------------------------------
  // Find user
  // ----------------------------------------------------------

  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  // ----------------------------------------------------------
  // A normal staff user must have a unit.
  // ----------------------------------------------------------

  if (input.unitId === null) {
    throw new Error(
      "A user cannot be removed from an organizational unit because the user role depends on the unit.",
    );
  }

  // ----------------------------------------------------------
  // Validate unit + determine role
  // ----------------------------------------------------------

  const { unit, role } =
    await getRoleForUnit(input.unitId);

  // ----------------------------------------------------------
  // Update unit + role together
  // ----------------------------------------------------------

  return prisma.user.update({
    where: {
      userId,
    },

    data: {
      unitId: unit.unitId,
      roleId: role.roleId,
    },

    select: userSelect,
  });
}