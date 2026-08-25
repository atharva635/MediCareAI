import express from "express";
import { register, login, getCurrentUser, getConsultants, getDoctors, logoutUser, updateProfile } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getCurrentUser);
router.get("/consultants", authMiddleware, getConsultants);
router.get("/doctors", authMiddleware, getDoctors);
router.post("/logout", authMiddleware, logoutUser);
router.put("/profile", authMiddleware, updateProfile);

export default router;