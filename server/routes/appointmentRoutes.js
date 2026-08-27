import express from "express";
import authMiddleware, { requireRole } from "../middleware/authMiddleware.js";
import {
  createAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  getAppointmentById,
  cancelAppointment,
  completeAppointment,
  saveAvailability,
  getAvailability,
  getAvailableSlots,
  payAppointment,
  acceptAppointment,
  rejectAppointment,
  deleteAppointment,
} from "../controllers/appointmentController.js";

const router = express.Router();

// Get available slots & availability configurations
router.get("/slots/:doctorId", authMiddleware, getAvailableSlots);
router.get("/availability/:doctorId", authMiddleware, getAvailability);

// Doctor availability setting
router.put("/availability", authMiddleware, requireRole(["doctor"]), saveAvailability);

// Appointment core flows
router.post("/", authMiddleware, requireRole(["patient"]), createAppointment);
router.get("/patient", authMiddleware, requireRole(["patient"]), getPatientAppointments);
router.get("/doctor", authMiddleware, requireRole(["doctor"]), getDoctorAppointments);
router.get("/:id", authMiddleware, getAppointmentById);

// Appointment status updates
router.put("/:id/pay", authMiddleware, requireRole(["patient"]), payAppointment);
router.put("/:id/cancel", authMiddleware, cancelAppointment);
router.put("/:id/complete", authMiddleware, requireRole(["doctor"]), completeAppointment);
router.put("/:id/accept", authMiddleware, requireRole(["doctor"]), acceptAppointment);
router.put("/:id/reject", authMiddleware, requireRole(["doctor"]), rejectAppointment);
router.delete("/:id", authMiddleware, deleteAppointment);

export default router;
