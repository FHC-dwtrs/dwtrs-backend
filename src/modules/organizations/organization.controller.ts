import type { Response } from "express";
import prisma from "../../config/database";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";

import {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
  updateOrganizationStatus,
  getOrganizationChildren,
  getOrganizationUsers,
} from "./organization.service";

import {
  createOrganizationSchema,
  updateOrganizationSchema,
  updateOrganizationStatusSchema,
  organizationQuerySchema,
} from "./organization.validation";

// ============================================================
// CREATE
// ============================================================

export async function createOrganizationController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    const parsed =
      createOrganizationSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid organizational unit data.",
        errors: parsed.error.flatten(),
      });
    }

    const result =
      await createOrganization(
        req.user.sub,
        parsed.data,
      );

    return res.status(201).json({
      success: true,
      message:
        "Organizational unit created successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "Create organization error:",
      error,
    );

    if (error instanceof Error) {
      const knownErrors = [
        "A Sector cannot have a parent organizational unit.",
        "Sector must have a parent organizational unit.",
        "DIRECTORATE must have a parent organizational unit.",
        "GROUP must have a parent organizational unit.",
        "Parent organizational unit not found.",
        "Parent organizational unit is inactive.",
        "An organizational unit with this name already exists.",
      ];

      if (
        knownErrors.includes(error.message) ||
        error.message.includes(
          "must belong to a",
        )
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create organizational unit.",
    });
  }
}

// ============================================================
// GET ALL
// ============================================================

export async function getOrganizationsController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const parsed =
      organizationQuerySchema.safeParse(
        req.query,
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid organizational unit filters.",
        errors: parsed.error.flatten(),
      });
    }

    const requiredPermission = parsed.data.isActive
  ? "UNIT_ACTIVATE"
  : "UNIT_DEACTIVATE";

const userRoles = await prisma.userRole.findMany({
  where: {
    userId: req.user!.sub,
    role: {
      isActive: true,
    },
  },
  include: {
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

const hasPermission = userRoles.some((userRole) =>
  userRole.role.permissions.some(
    (rolePermission) =>
      rolePermission.permission.name === requiredPermission,
  ),
);

if (!hasPermission) {
  return res.status(403).json({
    success: false,
    message: "You do not have permission to perform this action.",
  });
}

    const result =
      await getOrganizations(parsed.data);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Get organizations error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve organizational units.",
    });
  }
}

// ============================================================
// GET ONE
// ============================================================

export async function getOrganizationByIdController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { unitId } = req.params;

    if (typeof unitId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid organizational unit ID.",
      });
    }

    const result =
      await getOrganizationById(unitId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message:
          "Organizational unit not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Get organization error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve organizational unit.",
    });
  }
}

// ============================================================
// UPDATE
// ============================================================

export async function updateOrganizationController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { unitId } = req.params;

    if (typeof unitId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid organizational unit ID.",
      });
    }

    if (!req.user?.sub) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    const parsed =
      updateOrganizationSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid organizational unit data.",
        errors: parsed.error.flatten(),
      });
    }

    const result =
      await updateOrganization(
        unitId,
        req.user.sub,
        parsed.data,
      );

    return res.status(200).json({
      success: true,
      message:
        "Organizational unit updated successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "Update organization error:",
      error,
    );

    if (error instanceof Error) {
      const knownErrors = [
        "Organizational unit not found.",
        "An organizational unit with this name already exists.",
        "A Sector cannot have a parent organizational unit.",
        "DIRECTORATE must have a parent organizational unit.",
        "GROUP must have a parent organizational unit.",
        "An organizational unit cannot be its own parent.",
        "Parent organizational unit not found.",
        "Parent organizational unit is inactive.",
      ];

      if (
        knownErrors.includes(error.message) ||
        error.message.includes(
          "must belong to a",
        )
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update organizational unit.",
    });
  }
}

// ============================================================
// STATUS
// ============================================================

export async function updateOrganizationStatusController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { unitId } = req.params;

    if (typeof unitId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid organizational unit ID.",
      });
    }

    if (!req.user?.sub) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    const parsed =
      updateOrganizationStatusSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid organizational unit status.",
        errors: parsed.error.flatten(),
      });
    }

    const result =
      await updateOrganizationStatus(
        unitId,
        req.user.sub,
        parsed.data,
      );

    return res.status(200).json({
      success: true,
      message:
        parsed.data.isActive
          ? "Organizational unit activated successfully."
          : "Organizational unit deactivated successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "Update organization status error:",
      error,
    );

    if (error instanceof Error) {
      const knownErrors = [
        "Organizational unit not found.",
        "Cannot deactivate an organizational unit with active child units.",
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
      message:
        "Failed to update organizational unit status.",
    });
  }
}

// ============================================================
// CHILDREN
// ============================================================

export async function getOrganizationChildrenController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { unitId } = req.params;

    if (typeof unitId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid organizational unit ID.",
      });
    }

    const result =
      await getOrganizationChildren(unitId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Get organization children error:",
      error,
    );

    if (
      error instanceof Error &&
      error.message ===
        "Organizational unit not found."
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve child organizational units.",
    });
  }
}

// ============================================================
// USERS
// ============================================================

export async function getOrganizationUsersController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { unitId } = req.params;

    if (typeof unitId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid organizational unit ID.",
      });
    }

    const result =
      await getOrganizationUsers(unitId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Get organization users error:",
      error,
    );

    if (
      error instanceof Error &&
      error.message ===
        "Organizational unit not found."
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve organizational unit users.",
    });
  }
}