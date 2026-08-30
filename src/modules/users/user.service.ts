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

  roles: {
    include: {
      role: true,
    },
  },
};

// ============================================================
// CREATE USER
// ============================================================

export async function createUser(
  input: CreateUserInput,
) {
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
  // Validate organizational unit
  // ----------------------------------------------------------

  if (input.unitId) {
    const unit =
      await prisma.organizationalUnit.findUnique({
        where: {
          unitId: input.unitId,
        },
      });

    if (!unit) {
      throw new Error(
        "Organizational unit not found.",
      );
    }

    if (!unit.isActive) {
      throw new Error(
        "Organizational unit is inactive.",
      );
    }
  }

  // ----------------------------------------------------------
  // Hash password
  // ----------------------------------------------------------

  const passwordHash = await argon2.hash(
    input.password,
  );

  // ----------------------------------------------------------
  // Create user
  // ----------------------------------------------------------

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      unitId: input.unitId ?? null,
      isActive: input.isActive ?? true,
    },

    select: userSelect,
  });
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
  // Validate unit
  // ----------------------------------------------------------

  if (input.unitId) {
    const unit =
      await prisma.organizationalUnit.findUnique({
        where: {
          unitId: input.unitId,
        },
      });

    if (!unit) {
      throw new Error(
        "Organizational unit not found.",
      );
    }

    if (!unit.isActive) {
      throw new Error(
        "Organizational unit is inactive.",
      );
    }
  }

  // ----------------------------------------------------------
  // Update
  // ----------------------------------------------------------

  return prisma.user.update({
    where: {
      userId,
    },

    data: {
      ...(input.name !== undefined && {
        name: input.name,
      }),

      ...(input.email !== undefined && {
        email: input.email,
      }),

      ...(input.unitId !== undefined && {
        unitId: input.unitId,
      }),
    },

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
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

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
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  // ----------------------------------------------------------
  // Allow null = remove user from unit
  // ----------------------------------------------------------

  if (input.unitId === null) {
    return prisma.user.update({
      where: {
        userId,
      },

      data: {
        unitId: null,
      },

      select: userSelect,
    });
  }

  // ----------------------------------------------------------
  // Validate unit
  // ----------------------------------------------------------

  const unit =
    await prisma.organizationalUnit.findUnique({
      where: {
        unitId: input.unitId,
      },
    });

  if (!unit) {
    throw new Error(
      "Organizational unit not found.",
    );
  }

  if (!unit.isActive) {
    throw new Error(
      "Organizational unit is inactive.",
    );
  }

  // ----------------------------------------------------------
  // Assign
  // ----------------------------------------------------------

  return prisma.user.update({
    where: {
      userId,
    },

    data: {
      unitId: unit.unitId,
    },

    select: userSelect,
  });
}