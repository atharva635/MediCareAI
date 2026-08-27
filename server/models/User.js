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
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
  },
  coordinates: {
    type: [Number],
    default: [0, 0],
  },
},
 locationName: {
   type: String,
   default: "",
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
  availability: {
    type: Map,
    of: [String],
    default: {},
  },
});
userSchema.index({ location: "2dsphere" });
const User =
  mongoose.models.User || mongoose.model("User", userSchema);

export default User;