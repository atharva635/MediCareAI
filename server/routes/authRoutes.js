import express from "express";
import {
  register,
  login,
  getCurrentUser,
  getConsultants,
  getDoctors,
  logoutUser,
  updateProfile,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  googleLogin
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getCurrentUser);
router.get("/consultants", authMiddleware, getConsultants);
router.get("/doctors", authMiddleware, getDoctors);
router.post("/logout", authMiddleware, logoutUser);
router.put("/profile", authMiddleware, updateProfile);

// OTP & Authentication Updates
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/google", googleLogin);

export default router;