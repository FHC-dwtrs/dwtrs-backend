import { Router } from "express";
import { login } from "./auth.controller";
import {
  authenticate,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware";

const router = Router();

router.post("/login", login);

router.get("/me", authenticate, (req, res) => {
  const authenticatedReq = req as AuthenticatedRequest;

  res.status(200).json({
    success: true,
    message: "Authenticated user",
    user: authenticatedReq.user,
  });
});

export default router;