import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./auth.middleware.js";
import prisma from "../config/database.js";


export const requireRecordsArchive = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user?.sub;
  
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }
  
      const user = await prisma.user.findUnique({
        where: {
          userId,
        },
        select: {
          unit: {
            select: {
              name: true,
              unitType: true,
            },
          },
        },
      });
  
      if (
        !user ||
        user.unit?.name !== "Records & Archive Directorate"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only Records & Archive personnel can perform this action.",
        });
      }
  
      next();
    } catch (error) {
      console.error("Records & Archive access check error:", error);
  
      return res.status(500).json({
        success: false,
        message: "Failed to verify organizational access.",
      });
    }
  };