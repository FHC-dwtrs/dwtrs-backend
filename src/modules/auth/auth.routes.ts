import { Router } from "express";
import { login } from "./auth.controller";
import {
  authenticate,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate a user and return a JWT token.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@fhc.gov.et
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid email or password
 *       400:
 *         description: Validation error
 */
router.post("/login", login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get authenticated user
 *     description: Return the currently authenticated user's information.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user returned successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authenticate, (req, res) => {
  const authenticatedReq = req as AuthenticatedRequest;

  res.status(200).json({
    success: true,
    message: "Authenticated user",
    user: authenticatedReq.user,
  });
});

export default router;