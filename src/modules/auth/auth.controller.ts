import type { Request, Response } from "express";
import { loginUser } from "./auth.service";
import { loginSchema } from "./auth.validation";

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