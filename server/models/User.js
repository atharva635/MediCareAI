import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["patient", "doctor", "consultant"],
    default: "patient",
  },
  specialization: {
    type: String,
    default: "",
  },
  experience: {
    type: Number,
    default: 0,
  },
  location: {
    name: { type: String, default: "Ghaziabad" },
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [77.4224, 28.6692] },
  },
  consultationFee: {
    type: Number,
    default: 0,
  },
  about: {
    type: String,
    default: "",
  },
  rating: {
    type: Number,
    default: 4.8,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastHeartbeat: {
    type: Date,
  },
  sessionStartedAt: {
    type: Date,
  },
  lastSeen: {
    type: Date,
  },
  mobile: {
    type: String,
    unique: true,
    sparse: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  availability: {
    type: Map,
    of: [String],
    default: {},
  },
});

userSchema.index({ "location.coordinates": "2dsphere" });

const User =
  mongoose.models.User || mongoose.model("User", userSchema);

export default User;