import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    appointmentDate: {
      type: String,
      required: true,
    },

    appointmentTime: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    appointmentStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "expired"],
      default: "pending",
    },

    symptoms: {
      type: [String],
      default: [],
    },

    medicalNote: {
      type: String,
      default: "",
    },

    doctorDecision: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    rejectionReason: {
      type: String,
      default: "",
    },
    doctorNotes: {
      type: String,
      default: "",
    },
    prescriptions: {
      type: String,
      default: "",
    },
    followUp: {
      type: String,
      default: "",
    },
    referredTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    referralReason: {
      type: String,
      default: "",
    },
    aiIntake: {
      chiefComplaint: { type: String, default: "" },
      duration: { type: String, default: "" },
      symptoms: { type: [String], default: [] },
      history: { type: String, default: "" },
      medications: { type: String, default: "" },
      severity: { type: String, default: "" },
      riskLevel: { type: String, default: "" },
      summary: { type: String, default: "" },
      chatHistory: [
        {
          sender: { type: String },
          text: { type: String },
          timestamp: { type: Date, default: Date.now }
        }
      ]
    },
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);