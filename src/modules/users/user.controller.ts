import type { Request, Response } from "express";

import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  assignUserUnit,
} from "./user.service.js";

import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  assignUserUnitSchema,
} from "./user.validation.js";

// ============================================================
// CREATE USER
// ============================================================

export async function createUserController(
  req: Request,
  res: Response,
) {
  try {
    const parsed = createUserSchema.safeParse(
      req.body,
    );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid user data.",
        errors: parsed.error.flatten(),
      });
    }

    const user = await createUser(
      parsed.data,
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Create user error:", error);

    if (error instanceof Error) {
      const knownErrors = [
        "A user with this email already exists.",
        "Organizational unit not found.",
        "Organizational unit is inactive.",
      ];

      if (
        knownErrors.includes(error.message)
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create user.",
    });
  }
}

// ============================================================
// GET USERS
// ============================================================

export async function getUsersController(
  _req: Request,
  res: Response,
) {
  try {
    const users = await getUsers();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
    });
  }
}

// ============================================================
// GET USER
// ============================================================

export async function getUserController(
  req: Request,
  res: Response,
) {
  try {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await getUserById(userId);

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user error:", error);

    if (
      error instanceof Error &&
      error.message === "User not found."
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user.",
    });
  }
}

// ============================================================
// UPDATE USER
// ============================================================

export async function updateUserController(
  req: Request,
  res: Response,
) {
  try {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const parsed = updateUserSchema.safeParse(
      req.body,
    );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid user data.",
        errors: parsed.error.flatten(),
      });
    }

    const user = await updateUser(
      userId,
      parsed.data,
    );

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Update user error:", error);

    if (error instanceof Error) {
      const knownErrors = [
        "User not found.",
        "A user with this email already exists.",
        "Organizational unit not found.",
        "Organizational unit is inactive.",
      ];

      if (
        knownErrors.includes(error.message)
      ) {
        return res.status(
          error.message === "User not found."
            ? 404
            : 400,
        ).json({
          success: false,
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update user.",
    });
  }
}

// ============================================================
// UPDATE STATUS
// ============================================================

export async function updateUserStatusController(
  req: Request,
  res: Response,
) {
  try {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const parsed =
      updateUserStatusSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid status data.",
        errors: parsed.error.flatten(),
      });
    }

    const user = await updateUserStatus(
      userId,
      parsed.data,
    );

    return res.status(200).json({
      success: true,
      message: parsed.data.isActive
        ? "User activated successfully."
        : "User deactivated successfully.",
      data: user,
    });
  } catch (error) {
    console.error(
      "Update user status error:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "User not found."
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update user status.",
    });
  }
}

// ============================================================
// ASSIGN UNIT
// ============================================================

export async function assignUserUnitController(
  req: Request,
  res: Response,
) {
  try {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const parsed =
      assignUserUnitSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid organizational unit data.",
        errors: parsed.error.flatten(),
      });
    }

    const user = await assignUserUnit(
      userId,
      parsed.data,
    );

    return res.status(200).json({
      success: true,
      message:
        parsed.data.unitId === null
          ? "User removed from organizational unit successfully."
          : "User assigned to organizational unit successfully.",
      data: user,
    });
  } catch (error) {
    console.error(
      "Assign user unit error:",
      error,
    );

    if (error instanceof Error) {
      const knownErrors = [
        "User not found.",
        "Organizational unit not found.",
        "Organizational unit is inactive.",
      ];

      if (
        knownErrors.includes(error.message)
      ) {
        return res.status(
          error.message === "User not found."
            ? 404
            : 400,
        ).json({
          success: false,
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to assign organizational unit.",
    });
  }
}