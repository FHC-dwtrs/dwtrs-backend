import type { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./auth.middleware.js";
import prisma from "../config/database.js";

export function authorize(permissionName: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      // ----------------------------------------------------------
      // 1. Make sure authentication already happened
      // ----------------------------------------------------------

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      // ----------------------------------------------------------
      // 2. Find the user's roles and their permissions
      // ----------------------------------------------------------

      const userRoles = await prisma.userRole.findMany({
        where: {
          userId: req.user.sub,
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

      // ----------------------------------------------------------
      // 3. Check whether any active role has the required permission
      // ----------------------------------------------------------

      const hasPermission = userRoles.some((userRole) =>
        userRole.role.permissions.some(
          (rolePermission) =>
            rolePermission.permission.name === permissionName,
        ),
      );

      // ----------------------------------------------------------
      // 4. Reject if permission is missing
      // ----------------------------------------------------------

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
        });
      }

      // ----------------------------------------------------------
      // 5. Permission granted
      // ----------------------------------------------------------

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