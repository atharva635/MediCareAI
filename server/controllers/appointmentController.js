import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import { sendEmailNotification } from "../services/emailService.js";
import { analyzeIntakeChat } from "../services/aiService.js";

// Helper: Normalize time string to uniform "HH:MM AM/PM" format for consistent comparisons
export const formatTime = (timeStr) => {
  try {
    const parts = timeStr.trim().split(/\s+/);
    if (parts.length < 2) return timeStr.trim();
    let [time, modifier] = parts;
    let [hours, minutes] = time.split(":");
    hours = hours.padStart(2, "0");
    minutes = minutes.padStart(2, "0");
    return `${hours}:${minutes} ${modifier.toUpperCase()}`;
  } catch (e) {
    return timeStr.trim();
  }
};

// Helper: Convert time string e.g. "10:30 AM" to minutes from midnight
const parseTimeToMinutes = (timeStr) => {
  const normalized = formatTime(timeStr);
  const [time, modifier] = normalized.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) {
    hours += 12;
  }
  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
};

// Helper: Convert minutes from midnight back to time string e.g. "10:30 AM"
const minutesToTimeString = (minutes) => {
  let hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const modifier = hours >= 12 ? "PM" : "AM";
  if (hours > 12) {
    hours -= 12;
  }
  if (hours === 0) {
    hours = 12;
  }
  const minsStr = mins < 10 ? `0${mins}` : mins;
  const hoursStr = hours < 10 ? `0${hours}` : hours;
  return `${hoursStr}:${minsStr} ${modifier}`;
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

    // Past date prevention (backend)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateParts = appointmentDate.split("-");
    if (dateParts.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }
    const selectedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return res.status(400).json({
        success: false,
        message: "Past dates are not allowed",
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

    const normalizedTime = formatTime(appointmentTime);

    // Verify slot is actually configured by doctor as available for this date
    const availabilityMap = doctorUser.availability || new Map();
    const configuredSlots = availabilityMap instanceof Map ? availabilityMap.get(appointmentDate) : availabilityMap[appointmentDate];
    if (!configuredSlots || !configuredSlots.map(t => formatTime(t)).includes(normalizedTime)) {
      return res.status(400).json({
        success: false,
        message: "This slot is not available for consultation.",
      });
    }

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

    const { availability, date, slots } = req.body;

    if (!availability && !date) {
      return res.status(400).json({
        success: false,
        message: "Either availability Map or date is required",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Doctor user profile not found",
      });
    }

    if (!user.availability) {
      user.availability = new Map();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date) {
      // Validate date key format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD",
        });
      }
      
      const [year, month, day] = date.split("-").map(Number);
      const selectedDate = new Date(year, month - 1, day);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        return res.status(400).json({
          success: false,
          message: "Past dates are not allowed",
        });
      }

      if (!slots || slots.length === 0) {
        user.availability.delete(date);
      } else {
        const normalizedSlots = slots.map(s => formatTime(s));
        user.availability.set(date, normalizedSlots);
      }
    } else if (availability) {
      // Validate all keys in availability Map
      const availabilityKeys = Object.keys(availability);
      for (const dateKey of availabilityKeys) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
          return res.status(400).json({
            success: false,
            message: `Invalid date format: ${dateKey}. Use YYYY-MM-DD`,
          });
        }
        
        const [year, month, day] = dateKey.split("-").map(Number);
        const selectedDate = new Date(year, month - 1, day);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          return res.status(400).json({
            success: false,
            message: `Past date ${dateKey} is not allowed`,
          });
        }
      }

      user.availability = availability;
    }

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

    // Determine and validate date
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateObj = new Date(year, month, day);
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj < today) {
      return res.status(400).json({
        success: false,
        message: "Past dates are not allowed",
      });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Get doctor's availability for that specific date
    const availabilityMap = doctor.availability || new Map();
    const slots = availabilityMap instanceof Map ? availabilityMap.get(date) : availabilityMap[date];

    if (!slots || slots.length === 0) {
      return res.json({
        success: true,
        availableSlots: [],
        message: `No availability set for ${date}`,
      });
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

    // Trigger Email Notification (Patient paid, notify Doctor)
    try {
      const populated = await appointment.populate("patient doctor");
      await sendEmailNotification({
        to: populated.doctor.email,
        subject: "Patient Payment Received - Appointment Confirmed",
        text: `Hello Dr. ${populated.doctor.fullName},\n\nPayment has been successfully received for the appointment with ${populated.patient.fullName} scheduled on ${populated.appointmentDate} at ${populated.appointmentTime}.\n\nThe appointment status is now Confirmed.\n\nRegards,\nMediCare AI Team`
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
