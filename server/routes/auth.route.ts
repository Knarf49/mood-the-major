import { Router } from "express";
import {
  loginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from "../utils/rateLimiter";
import * as authController from "../controller/auth.controller";

const router = Router();

router.post("/signup", authController.signup);
router.post("/verify-email", resetPasswordLimiter, authController.verifyEmail);
router.post("/login", loginLimiter, authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  resetPasswordLimiter,
  authController.resetPassword,
);

export default router;
