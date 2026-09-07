import type { Request, Response } from "express";
import { getAuthenticatedUser, loginUser } from "./auth.service.js";
import { loginSchema } from "./auth.validation.js";
import { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

export async function login(req: Request, res: Response) {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid login data",
        errors: result.error.flatten(),
      });
    }

    const authResult = await loginUser(result.data);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: authResult,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message === "Invalid email or password" ||
        error.message === "User account is inactive"
      )
    ) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function getMe(
  req: Request,
  res: Response,
) {
  try {
    const authenticatedReq = req as AuthenticatedRequest;

if (!authenticatedReq.user) {
  return res.status(401).json({
    success: false,
    message: "Unauthorized",
  });
}

const userId = authenticatedReq.user.sub;

const user = await getAuthenticatedUser(userId);

    return res.status(200).json({
      success: true,
      message: "Authenticated user",
      user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "User not found"
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Get authenticated user error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}