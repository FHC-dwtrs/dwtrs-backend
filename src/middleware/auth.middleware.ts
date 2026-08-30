import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
interface JwtPayload {
  sub: string;
  email: string;
  role: string;        // single role now, not an array
  unitId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const token = authHeader.substring(7);
    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not configured");
      return res.status(500).json({ success: false, message: "Authentication configuration error" });
    }

    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.sub !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.role !== "string"      // <- single string now
    ) {
      return res.status(401).json({ success: false, message: "Invalid authentication token" });
    }

    req.user = {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      unitId: typeof decoded.unitId === "string" ? decoded.unitId : null,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, message: "Authentication token expired" });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, message: "Invalid authentication token" });
    }
    console.error("Authentication error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}