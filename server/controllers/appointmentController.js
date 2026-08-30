import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import { sendEmailNotification } from "../services/emailService.js";
import { analyzeIntakeChat } from "../services/aiService.js";
import {
  formatTime,
  parseTimeToMinutes,
  minutesToTimeString,
  isSlotWithinAvailability
} from "../utils/timeHelper.js";
// Dynamic Auto-Expiration of past appointments (with a 30-min grace period)
const autoExpireAppointments = async () => {
  try {
    const now = new Date();
    
    // Find all appointments that are pending or confirmed
    const activeAppointments = await Appointment.find({
      appointmentStatus: { $in: ["pending", "confirmed"] }
    });

    for (const appt of activeAppointments) {
      if (!appt.appointmentDate || !appt.appointmentTime) continue;

      // Extract time details
      const [time, modifier] = appt.appointmentTime.split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      if (modifier === "PM" && hours !== 12) {
        hours += 12;
      }
      if (modifier === "AM" && hours === 12) {
        hours = 0;
      }

      const dateParts = appt.appointmentDate.split("-");
      if (dateParts.length !== 3) continue;
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const day = parseInt(dateParts[2]);

      // Construct a Date object representing the slot start time in India Standard Time (+05:30)
      const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`;
      const appointmentStart = new Date(dateString);

      if (isNaN(appointmentStart.getTime())) continue;

      // Add 30 minutes grace period
      const appointmentGraceExpiry = new Date(appointmentStart.getTime() + 30 * 60 * 1000);

      // If the current time has passed the grace period, auto-expire it
      if (now > appointmentGraceExpiry) {
        appt.appointmentStatus = "expired";
        await appt.save();
        console.log(`[MedicareAI] Auto-expired appointment ID ${appt._id} (Scheduled: ${appt.appointmentDate} at ${appt.appointmentTime})`);
      }
    }
  } catch (error) {
    console.error("Error running autoExpireAppointments:", error);
  }
};


// ================= APPOINTMENT CONTROLLERS =================

// 1. Create Appointment (Patient only)
export const createAppointment = async (req, res) => {
  try {
    const { doctor, appointmentDate, appointmentTime, symptoms, medicalNote, aiChatHistory } = req.body;

    if (!doctor || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields (doctor, date, time)",
      });
    }

    // Find Doctor details to verify and fetch consultation fee
    const doctorUser = await User.findById(doctor);
    if (!doctorUser || doctorUser.role !== "doctor") {
      return res.status(404).json({
        success: false,
        message: "Doctor not found or invalid user role",
      });
    }

    // Verify slot is within doctor's availability range
    if (!isSlotWithinAvailability(doctorUser.availability, appointmentDate, appointmentTime)) {
      return res.status(400).json({
        success: false,
        message: "Doctor is not available at the selected date and time slot. Please check their set availability.",
      });
    }

    const normalizedTime = formatTime(appointmentTime);

    // Check if slot is already booked (confirmed or pending)
    const existingAppointment = await Appointment.findOne({
      doctor,
      appointmentDate,
      appointmentTime: normalizedTime,
      appointmentStatus: { $in: ["pending", "confirmed", "completed"] },
      doctorDecision: { $ne: "rejected" }, // Slot is free if doctor rejected
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: "This time slot is already booked. Please select another slot.",
      });
    }

    const consultationFee = doctorUser.consultationFee || 0;

    // AI Intake Processing
    let aiIntakeResult = null;
    let computedSymptoms = symptoms || [];
    let computedMedicalNote = medicalNote || "";

    if (aiChatHistory && Array.isArray(aiChatHistory) && aiChatHistory.length > 0) {
      console.log("🤖 Running AI Intake Analysis via Groq...");
      aiIntakeResult = await analyzeIntakeChat(aiChatHistory);
      if (aiIntakeResult) {
        if (aiIntakeResult.symptoms && Array.isArray(aiIntakeResult.symptoms)) {
          // Merge AI-detected symptoms into list, avoiding duplicates
          const uniqueSyms = new Set([...computedSymptoms, ...aiIntakeResult.symptoms]);
          computedSymptoms = Array.from(uniqueSyms);
        }
        if (aiIntakeResult.summary) {
          computedMedicalNote = aiIntakeResult.summary + (computedMedicalNote ? `\n\nPatient Note: ${computedMedicalNote}` : "");
        }
      }
    }

    const appointment = new Appointment({
      patient: req.user.id,
      doctor,
      appointmentDate,
      appointmentTime: normalizedTime,
      amount: consultationFee,
      paymentStatus: "pending",
      appointmentStatus: "pending",
      doctorDecision: "pending",
      symptoms: computedSymptoms,
      medicalNote: computedMedicalNote,
      aiIntake: aiIntakeResult ? {
        chiefComplaint: aiIntakeResult.chiefComplaint || "",
        duration: aiIntakeResult.duration || "",
        symptoms: aiIntakeResult.symptoms || [],
        history: aiIntakeResult.history || "",
        medications: aiIntakeResult.medications || "",
        severity: aiIntakeResult.severity || "",
        riskLevel: aiIntakeResult.riskLevel || "",
        summary: aiIntakeResult.summary || "",
        chatHistory: aiChatHistory,
      } : undefined,
    });

    await appointment.save();

    // Trigger Email Notification (Patient requested, notify Doctor)
    try {
      const populated = await appointment.populate("patient doctor");
      await sendEmailNotification({
        to: populated.doctor.email,
        subject: "New Patient Consultation Request",
        text: `Hello Dr. ${populated.doctor.fullName},\n\nYou have received a new consultation request.\n\nPatient: ${populated.patient.fullName}\nDate: ${populated.appointmentDate}\nTime: ${populated.appointmentTime}\nSymptoms: ${populated.symptoms.join(", ") || "None specified"}\nMedical Note: ${populated.medicalNote || "None"}\nConsultation Fee: ₹${populated.amount}\n\nPlease login to MediCare AI to Accept or Reject this request.\n\nRegards,\nMediCare AI Team`
      });
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr);
    }

    res.status(201).json({
      success: true,
      message: "Appointment request sent to doctor in pending state",
      appointment,
    });
  } catch (error) {
    console.error("Create Appointment Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating appointment",
      error: error.message,
    });
  }
};

// 2. Get Patient Appointments
export const getPatientAppointments = async (req, res) => {
  try {
    await autoExpireAppointments();
    const appointments = await Appointment.find({ patient: req.user.id })
      .populate("doctor", "fullName email specialization consultationFee about rating")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      appointments,
    });
  } catch (error) {
    console.error("Get Patient Appointments Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving patient appointments",
    });
  }
};

// 3. Get Doctor Appointments
export const getDoctorAppointments = async (req, res) => {
  try {
    await autoExpireAppointments();
    const appointments = await Appointment.find({ doctor: req.user.id })
      .populate("patient", "fullName email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      appointments,
    });
  } catch (error) {
    console.error("Get Doctor Appointments Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving doctor appointments",
    });
  }
};

// 4. Get Appointment By ID
export const getAppointmentById = async (req, res) => {
  try {
    await autoExpireAppointments();
    const appointment = await Appointment.findById(req.params.id)
      .populate("patient", "fullName email")
      .populate("doctor", "fullName email specialization consultationFee about rating");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Verify authorized access (must be patient or doctor associated with appointment)
    if (
      appointment.patient._id.toString() !== req.user.id &&
      appointment.doctor._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Unauthorized view request.",
      });
    }

    res.json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.error("Get Appointment ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching appointment details",
    });
  }
};

// 5. Cancel Appointment
export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Ensure authorized canceller
    if (
      appointment.patient.toString() !== req.user.id &&
      appointment.doctor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Cannot cancel this appointment.",
      });
    }

    appointment.appointmentStatus = "cancelled";
    await appointment.save();

    // Trigger Email Notification (Appointment cancelled)
    try {
      const populated = await appointment.populate("patient doctor");
      const cancellerName = req.user.role === "doctor" ? `Dr. ${populated.doctor.fullName}` : populated.patient.fullName;
      
      await sendEmailNotification({
        to: populated.patient.email,
        subject: "Appointment Cancelled",
        text: `Hello ${populated.patient.fullName},\n\nWe inform you that the appointment scheduled with Dr. ${populated.doctor.fullName} on ${populated.appointmentDate} at ${populated.appointmentTime} has been cancelled by ${cancellerName}.\n\nRegards,\nMediCare AI Team`
      });
      await sendEmailNotification({
        to: populated.doctor.email,
        subject: "Appointment Cancelled",
        text: `Hello Dr. ${populated.doctor.fullName},\n\nWe inform you that the appointment scheduled with ${populated.patient.fullName} on ${populated.appointmentDate} at ${populated.appointmentTime} has been cancelled by ${cancellerName}.\n\nRegards,\nMediCare AI Team`
      });
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr);
    }

    res.json({
      success: true,
      message: "Appointment cancelled successfully",
      appointment,
    });
  } catch (error) {
    console.error("Cancel Appointment Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error cancelling appointment",
    });
  }
};

// 6. Complete Appointment (Doctor only)
export const completeAppointment = async (req, res) => {
  try {
    const { doctorNotes, prescriptions, followUp, referredTo, referralReason } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Must be the assigned doctor
    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the doctor can complete the appointment.",
      });
    }

    appointment.appointmentStatus = "completed";
    appointment.doctorNotes = doctorNotes || "";
    appointment.prescriptions = prescriptions || "";
    appointment.followUp = followUp || "";
    if (referredTo) {
      appointment.referredTo = referredTo;
      appointment.referralReason = referralReason || "";
    }

    await appointment.save();

    // Trigger Email Notification (Consultation completed)
    try {
      const populated = await appointment.populate("patient doctor");
      // Notify Patient
      await sendEmailNotification({
        to: populated.patient.email,
        subject: "Your Consultation Summary & Prescriptions",
        text: `Hello ${populated.patient.fullName},\n\nYour consultation with Dr. ${populated.doctor.fullName} has been concluded. Here is your clinical summary:\n\nObservations: ${populated.doctorNotes || "None logged"}\nPrescriptions: ${populated.prescriptions || "None prescribed"}\nFollow-up: ${populated.followUp || "None specified"}\n\nThank you for choosing MediCare AI.\n\nRegards,\nMediCare AI Team`
      });
      // Notify Doctor
      await sendEmailNotification({
        to: populated.doctor.email,
        subject: "Consultation Session Concluded",
        text: `Hello Dr. ${populated.doctor.fullName},\n\nThe consultation session with ${populated.patient.fullName} has been successfully concluded and recorded in history.\n\nRegards,\nMediCare AI Team`
      });
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr);
    }

    res.json({
      success: true,
      message: "Appointment completed successfully",
      appointment,
    });
  } catch (error) {
    console.error("Complete Appointment Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error completing appointment",
    });
  }
};

// 7. Save Doctor Availability
export const saveAvailability = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can configure availability",
      });
    }

    const { availability } = req.body;

    if (!availability) {
      return res.status(400).json({
        success: false,
        message: "Availability object is required",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Doctor user profile not found",
      });
    }

    user.availability = availability;
    await user.save();

    res.json({
      success: true,
      message: "Availability updated successfully",
      availability: user.availability,
    });
  } catch (error) {
    console.error("Save Availability Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error saving availability",
      error: error.message,
    });
  }
};

// 8. Get Doctor Availability
export const getAvailability = async (req, res) => {
  try {
    const doctor = await User.findById(req.params.doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.json({
      success: true,
      availability: doctor.availability || {},
    });
  } catch (error) {
    console.error("Get Availability Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving doctor availability",
    });
  }
};

// 9. Get Available 30-min Slots
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query; // Expects "YYYY-MM-DD"

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Query parameter 'date' in YYYY-MM-DD format is required",
      });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Determine day of the week for client information
    const dateParts = date.split("-");
    if (dateParts.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);

    const dateObj = new Date(year, month, day);
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = daysOfWeek[dateObj.getDay()];

    // Get doctor's availability for that specific date key
    const availabilityMap = doctor.availability || new Map();
    const ranges = availabilityMap instanceof Map ? availabilityMap.get(date) : availabilityMap[date];

    if (!ranges || ranges.length === 0) {
      return res.json({
        success: true,
        availableSlots: [],
        message: `No availability set for ${date}`,
      });
    }

    // Generate potential 30-minute slots from set ranges
    const slots = [];
    for (const range of ranges) {
      const parts = range.split("-");
      if (parts.length !== 2) continue;
      const startStr = parts[0].trim();
      const endStr = parts[1].trim();

      const startMinutes = parseTimeToMinutes(startStr);
      const endMinutes = parseTimeToMinutes(endStr);

      for (let time = startMinutes; time < endMinutes; time += 30) {
        slots.push(minutesToTimeString(time));
      }
    }

    // Fetch already booked slots for this doctor on this date (not cancelled)
    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: date,
      appointmentStatus: { $in: ["pending", "confirmed", "completed"] },
    });

    const bookedTimes = bookedAppointments.map((app) => formatTime(app.appointmentTime));

    // Filter slots not in booked list
    const availableSlots = slots.filter((slot) => {
      const normalizedSlot = formatTime(slot);
      return !bookedTimes.includes(normalizedSlot);
    });

    res.json({
      success: true,
      dayName,
      availableSlots,
    });
  } catch (error) {
    console.error("Get Available Slots Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error calculating available slots",
      error: error.message,
    });
  }
};

// 10. Mock Payment (Patient simulating paid status)
export const payAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Ensure only the assigned patient can pay
    if (appointment.patient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Cannot pay for this appointment.",
      });
    }

    appointment.paymentStatus = "paid";
    appointment.appointmentStatus = "confirmed";
    await appointment.save();

    // Trigger Email Notification (Patient paid, notify Doctor and Patient)
    try {
      const populated = await appointment.populate("patient doctor");
      await sendEmailNotification({
        to: populated.doctor.email,
        subject: "Patient Payment Received - Appointment Confirmed",
        text: `Hello Dr. ${populated.doctor.fullName},\n\nPayment has been successfully received for the appointment with ${populated.patient.fullName} scheduled on ${populated.appointmentDate} at ${populated.appointmentTime}.\n\nThe appointment status is now Confirmed.\n\nRegards,\nMediCare AI Team`
      });
      await sendEmailNotification({
        to: populated.patient.email,
        subject: "Appointment Confirmed - Payment Successful",
        text: `Hello ${populated.patient.fullName},\n\nYour payment of ₹${populated.amount} for the consultation with Dr. ${populated.doctor.fullName} on ${populated.appointmentDate} at ${populated.appointmentTime} has been successfully received.\n\nYour appointment is now Confirmed. You can join the session from your appointments dashboard at the scheduled time.\n\nRegards,\nMediCare AI Team`
      });
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr);
    }

    res.json({
      success: true,
      message: "Mock Payment Successful. Appointment confirmed.",
      appointment,
    });
  } catch (error) {
    console.error("Pay Appointment Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error processing mock payment",
    });
  }
};

// 11. Accept Appointment (Doctor only)
export const acceptAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Must be the assigned doctor
    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the doctor can accept the appointment.",
      });
    }

    appointment.doctorDecision = "accepted";
    await appointment.save();

    // Trigger Email Notification (Doctor accepted, notify Patient)
    try {
      const populated = await appointment.populate("patient doctor");
      await sendEmailNotification({
        to: populated.patient.email,
        subject: "Doctor Accepted Your Appointment",
        text: `Hello ${populated.patient.fullName},\n\nDr. ${populated.doctor.fullName} has accepted your consultation request for ${populated.appointmentDate} at ${populated.appointmentTime}.\n\nPlease login to MediCare AI to pay the ₹${populated.amount} fee and confirm your booking.\n\nRegards,\nMediCare AI Team`
      });
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr);
    }

    res.json({
      success: true,
      message: "Appointment accepted successfully",
      appointment,
    });
  } catch (error) {
    console.error("Accept Appointment Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error accepting appointment",
    });
  }
};

// 12. Reject Appointment (Doctor only)
export const rejectAppointment = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Must be the assigned doctor
    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the doctor can reject the appointment.",
      });
    }

    appointment.doctorDecision = "rejected";
    appointment.appointmentStatus = "cancelled"; // Cancel the appointment on rejection
    appointment.rejectionReason = rejectionReason || "";
    await appointment.save();

    // Trigger Email Notification (Doctor rejected, notify Patient)
    try {
      const populated = await appointment.populate("patient doctor");
      await sendEmailNotification({
        to: populated.patient.email,
        subject: "Doctor Rejected Your Appointment",
        text: `Hello ${populated.patient.fullName},\n\nWe regret to inform you that Dr. ${populated.doctor.fullName} has declined your consultation request for ${populated.appointmentDate} at ${populated.appointmentTime}.\n\nReason for rejection: ${rejectionReason || "Not specified"}\n\nYou can login to MediCare AI to book another clinician.\n\nRegards,\nMediCare AI Team`
      });
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr);
    }

    res.json({
      success: true,
      message: "Appointment rejected successfully",
      appointment,
    });
  } catch (error) {
    console.error("Reject Appointment Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error rejecting appointment",
    });
  }
};

// 13. Delete Appointment (Patient or Doctor)
export const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Ensure only the patient or doctor associated can delete
    if (
      appointment.patient.toString() !== req.user.id &&
      appointment.doctor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Cannot delete this appointment.",
      });
    }

    await Appointment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Appointment deleted successfully",
    });
  } catch (error) {
    console.error("Delete Appointment Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting appointment",
    });
  }
};
