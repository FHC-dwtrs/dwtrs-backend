import argon2 from "argon2";
import jwt from "jsonwebtoken";
import prisma from "../../config/database.js";
import type { LoginInput } from "./auth.validation.js";

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },

    include: {
      unit: true,

      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  // ----------------------------------------------------------
  // Validate user
  // ----------------------------------------------------------

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("User account is inactive");
  }

  // ----------------------------------------------------------
  // Validate password
  // ----------------------------------------------------------

  const passwordValid = await argon2.verify(
    user.passwordHash,
    input.password,
  );

  if (!passwordValid) {
    throw new Error("Invalid email or password");
  }

  // ----------------------------------------------------------
  // Role
  // ----------------------------------------------------------

  const role = user.role.name;

  // ----------------------------------------------------------
  // Permissions
  // ----------------------------------------------------------

  const permissions = user.role.permissions.map(
    (rolePermission) =>
      rolePermission.permission.name,
  );

  // ----------------------------------------------------------
  // JWT
  // ----------------------------------------------------------

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign(
    {
      sub: user.userId,
      email: user.email,
      role,
      unitId: user.unitId,
    },
    secret,
    {
      expiresIn: "1h",
    },
  );

  // ----------------------------------------------------------
  // Update last login
  // ----------------------------------------------------------

  await prisma.user.update({
    where: {
      userId: user.userId,
    },

    data: {
      lastLoginAt: new Date(),
    },
  });

  // ----------------------------------------------------------
  // Response
  // ----------------------------------------------------------

  return {
    token,

    user: {
      userId: user.userId,
      name: user.name,
      email: user.email,

      unit: user.unit
        ? {
            id: user.unit.unitId,
            name: user.unit.name,
            unitType: user.unit.unitType,
          }
        : null,

      role,

      permissions,
    },
  };
}