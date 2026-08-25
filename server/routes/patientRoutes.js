import express from "express";
import authMiddleware, { requireRole } from "../middleware/authMiddleware.js";
import {
  addPatient,
  getAllPatients,
  getDashboardStats,
  getPatientById,
  referPatient,
  addConsultantRecommendation,
  bookDoctor,
  startConsultation,
  completeConsultation
} from "../controllers/patientController.js";

const router = express.Router();

router.post("/add", authMiddleware, requireRole(["patient"]), addPatient);
router.get("/all", authMiddleware, getAllPatients);
router.get("/stats", authMiddleware, getDashboardStats);
router.post("/:id/book", authMiddleware, requireRole(["patient"]), bookDoctor);
router.post("/:id/start", authMiddleware, requireRole(["doctor"]), startConsultation);
router.post("/:id/complete", authMiddleware, requireRole(["doctor"]), completeConsultation);
router.post("/:id/refer", authMiddleware, requireRole(["doctor"]), referPatient);
router.post("/:id/recommend", authMiddleware, requireRole(["consultant"]), addConsultantRecommendation);
router.get("/:id", authMiddleware, getPatientById);

export default router;