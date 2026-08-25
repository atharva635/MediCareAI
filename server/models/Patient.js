import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    age: {
      type: Number,
      required: true,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },

    symptoms: {
      type: [String],
      required: true,
    },

    medicalHistory: {
      type: String,
      default: "",
    },

    riskLevel: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Low",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
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

    consultantNotes: {
      type: String,
      default: "",
    },

    referralStatus: {
      type: String,
      enum: ["None", "Pending", "Reviewed"],
      default: "None",
    },

    consultationStatus: {
      type: String,
      enum: ["Triage", "Paid", "In Progress", "Completed"],
      default: "Triage",
    },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid"],
      default: "Unpaid",
    },

    consultationFee: {
      type: Number,
      default: 0,
    },

    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Patient = mongoose.model("Patient", patientSchema);

export default Patient;