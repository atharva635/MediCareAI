import Patient from "../models/Patient.js";
import User from "../models/User.js";

export const addPatient = async (req, res) => {
  try {

    const {
      name,
      age,
      gender,
      symptoms,
      medicalHistory,
      email,
    } = req.body;

    let riskLevel = "Low";

    if (
      symptoms.includes("Chest Pain") ||
      symptoms.includes("Breathing Difficulty")
    ) {
      riskLevel = "Critical";
    } else if (
      symptoms.includes("High Fever") ||
      symptoms.includes("Vomiting")
    ) {
      riskLevel = "High";
    } else if (
      symptoms.includes("Cough") ||
      symptoms.includes("Headache")
    ) {
      riskLevel = "Medium";
    }

    const patient = await Patient.create({
      name,
      age,
      gender,
      symptoms,
      medicalHistory,
      email: email ? email.toLowerCase().trim() : "",
      riskLevel,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      patient,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
export const getAllPatients = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "doctor") {
      query = { assignedDoctor: req.user.id, paymentStatus: "Paid" };
    } else if (req.user.role === "consultant") {
      query = { referredTo: req.user.id };
    } else if (req.user.role === "patient") {
      const user = await User.findById(req.user.id);
      query = {
        $or: [
          { createdBy: req.user.id },
          { email: user ? user.email.toLowerCase().trim() : "non-existent-email" }
        ]
      };
    }

    const patients = await Patient.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: patients.length,
      patients,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

export const getDashboardStats = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "doctor") {
      query = { assignedDoctor: req.user.id, paymentStatus: "Paid" };
    } else if (req.user.role === "consultant") {
      query = { referredTo: req.user.id };
    } else if (req.user.role === "patient") {
      const user = await User.findById(req.user.id);
      query = {
        $or: [
          { createdBy: req.user.id },
          { email: user ? user.email.toLowerCase().trim() : "non-existent-email" }
        ]
      };
    }

    const patients = await Patient.find(query);

    const stats = {
      totalPatients: patients.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    patients.forEach((patient) => {
      const risk = patient.riskLevel.toLowerCase();

      if (risk === "critical") stats.critical++;
      else if (risk === "high") stats.high++;
      else if (risk === "medium") stats.medium++;
      else stats.low++;
    });

    return res.status(200).json({
      success: true,
      stats,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient Not Found",
      });
    }

    // Access control check
    if (req.user.role === "doctor" && patient.assignedDoctor?.toString() !== req.user.id && patient.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized access to patient file" });
    }
    if (req.user.role === "consultant" && (!patient.referredTo || patient.referredTo.toString() !== req.user.id)) {
      return res.status(403).json({ success: false, message: "Unauthorized access: case not referred to you" });
    }
    if (req.user.role === "patient") {
      const user = await User.findById(req.user.id);
      if (!user || (patient.createdBy.toString() !== req.user.id && patient.email.toLowerCase().trim() !== user.email.toLowerCase().trim())) {
        return res.status(403).json({ success: false, message: "Unauthorized access to clinical record" });
      }
    }

    return res.status(200).json({
      success: true,
      patient,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ================= REFER PATIENT TO CONSULTANT =================
export const referPatient = async (req, res) => {
  try {
    const { consultantId, referralReason } = req.body;
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    if (patient.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized to refer this patient" });
    }

    const consultant = await User.findOne({ _id: consultantId, role: "consultant" });
    if (!consultant) {
      return res.status(400).json({ success: false, message: "Selected consultant is invalid" });
    }

    patient.referredTo = consultantId;
    patient.referralReason = referralReason || "";
    patient.referralStatus = "Pending";

    await patient.save();

    return res.status(200).json({
      success: true,
      message: `Patient referred to consultant ${consultant.fullName} successfully`,
      patient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= ADD CONSULTANT RECOMMENDATION =================
export const addConsultantRecommendation = async (req, res) => {
  try {
    const { consultantNotes } = req.body;
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    if (!patient.referredTo || patient.referredTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized: patient case is not referred to you" });
    }

    patient.consultantNotes = consultantNotes;
    patient.referralStatus = "Reviewed";

    await patient.save();

    return res.status(200).json({
      success: true,
      message: "Consultation recommendation submitted successfully",
      patient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= BOOK DOCTOR & PAY =================
export const bookDoctor = async (req, res) => {
  try {
    const { doctorId, consultationFee } = req.body;
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: "Triage case not found" });
    }

    if (patient.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
    if (!doctor) {
      return res.status(400).json({ success: false, message: "Clinician not found" });
    }

    patient.assignedDoctor = doctorId;
    patient.consultationFee = consultationFee || 299;
    patient.paymentStatus = "Paid";
    patient.consultationStatus = "Paid";

    await patient.save();

    return res.status(200).json({
      success: true,
      message: "Consultation booked successfully!",
      patient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= START ONLINE CONSULTATION =================
export const startConsultation = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: "Consultation not found" });
    }

    if (patient.assignedDoctor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized clinician" });
    }

    patient.consultationStatus = "In Progress";
    await patient.save();

    return res.status(200).json({
      success: true,
      message: "Consultation started",
      patient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= COMPLETE ONLINE CONSULTATION =================
export const completeConsultation = async (req, res) => {
  try {
    const { doctorNotes, prescriptions, followUp, needReferral, consultantId, referralReason } = req.body;
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: "Consultation not found" });
    }

    if (patient.assignedDoctor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized clinician" });
    }

    patient.doctorNotes = doctorNotes || "";
    patient.prescriptions = prescriptions || "";
    patient.followUp = followUp || "";
    patient.consultationStatus = "Completed";

    if (needReferral && consultantId) {
      patient.referredTo = consultantId;
      patient.referralReason = referralReason || "";
      patient.referralStatus = "Pending";
    }

    await patient.save();

    return res.status(200).json({
      success: true,
      message: "Consultation completed successfully!",
      patient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};