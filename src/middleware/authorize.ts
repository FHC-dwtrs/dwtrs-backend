import type { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./auth.middleware.js";
import prisma from "../config/database.js";

// ============================================================
// AUTHORIZE USER BY PERMISSION
// ============================================================

export function authorize(permissionName: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      // --------------------------------------------------------
      // 1. Make sure authentication already happened
      // --------------------------------------------------------

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      // --------------------------------------------------------
      // 2. Find the user and their active role + permissions
      // --------------------------------------------------------

      const user = await prisma.user.findUnique({
        where: {
          userId: req.user.sub,
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

      // --------------------------------------------------------
      // 3. Make sure user exists
      // --------------------------------------------------------

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found.",
        });
      }

      // --------------------------------------------------------
      // 4. Make sure user account is active
      // --------------------------------------------------------

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "User account is inactive.",
        });
      }

      // --------------------------------------------------------
      // 5. Make sure user has an active role
      // --------------------------------------------------------

      if (!user.role || !user.role.isActive) {
        return res.status(403).json({
          success: false,
          message: "User does not have an active role.",
        });
      }

      // --------------------------------------------------------
      // 6. Check whether the role has the required permission
      // --------------------------------------------------------

      const hasPermission = user.role.permissions.some(
        (rolePermission) =>
          rolePermission.permission.name === permissionName,
      );

      // --------------------------------------------------------
      // 7. Reject if permission is missing
      // --------------------------------------------------------

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to perform this action.",
        });
      }

      // --------------------------------------------------------
      // 8. Permission granted
      // --------------------------------------------------------

      next();
    } catch (error) {
      console.error("Authorization error:", error);

      return res.status(500).json({
        success: false,
        message: "Authorization check failed.",
      });
    }
  };
}