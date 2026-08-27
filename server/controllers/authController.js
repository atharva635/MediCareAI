import User from "../models/User.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";
import Appointment from "../models/Appointment.js";
import { formatTime } from "./appointmentController.js";

// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const { fullName, email, password, role, specialization, experience, location, consultationFee, about } = req.body;

    console.log("REGISTER BODY:", req.body);

    // Required Fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    // Full Name Validation
    if (fullName.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Full Name must be at least 3 characters",
      });
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Password Validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Check Existing User
    const userExists = await User.findOne({
      email: email.toLowerCase(),
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Validate Role
    if (role && !["patient", "doctor", "consultant"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    // Create User
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "patient",
      specialization: role === "doctor" ? (specialization || "") : "",
      experience: role === "doctor" ? (Number(experience) || 0) : 0,
      location: role === "doctor" ? (location || "") : "",
      consultationFee: role === "doctor" ? (Number(consultationFee) || 0) : 0,
      about: role === "doctor" ? (about || "") : "",
      isOnline: false,
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        experience: user.experience,
        location: user.location,
        consultationFee: user.consultationFee,
        about: user.about,
        rating: user.rating,
        isOnline: user.isOnline,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Required Fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter email and password",
      });
    }

    // Find User
    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    // Compare Password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    // Set online status if doctor
    if (user.role === "doctor") {
      user.isOnline = true;
      await user.save();
    }

    // Generate Token
    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        experience: user.experience,
        location: user.location,
        consultationFee: user.consultationFee,
        about: user.about,
        rating: user.rating,
        isOnline: user.isOnline,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ================= CURRENT USER =================
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        experience: user.experience,
        location: user.location,
        consultationFee: user.consultationFee,
        about: user.about,
        rating: user.rating,
        isOnline: user.isOnline,
      },
    });
  } catch (error) {
    console.error("Get Current User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ================= GET CONSULTANTS =================
export const getConsultants = async (req, res) => {
  try {
    const consultants = await User.find({ role: "consultant" }).select("fullName email");
    return res.status(200).json({
      success: true,
      consultants,
    });
  } catch (error) {
    console.error("Get Consultants Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ================= GET DOCTORS =================
export const getDoctors = async (req, res) => {
  try {
    const { date } = req.query; // Expects YYYY-MM-DD
    const doctors = await User.find({ role: "doctor", isOnline: true }).select("-password");

    if (date) {
      // Validate date key format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD",
        });
      }

      // Past date prevention
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [year, month, day] = date.split("-").map(Number);
      const selectedDate = new Date(year, month - 1, day);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        return res.status(400).json({
          success: false,
          message: "Past dates are not allowed",
        });
      }

      const filteredDoctors = [];

      for (const doc of doctors) {
        const availabilityMap = doc.availability || new Map();
        const configuredSlots = availabilityMap instanceof Map ? availabilityMap.get(date) : availabilityMap[date];

        if (configuredSlots && configuredSlots.length > 0) {
          // Fetch already booked slots for this doctor on this date
          const bookedAppointments = await Appointment.find({
            doctor: doc._id,
            appointmentDate: date,
            appointmentStatus: { $in: ["pending", "confirmed", "completed"] },
          });

          const bookedTimes = bookedAppointments.map((app) => formatTime(app.appointmentTime));

          // Filter slots not in booked list
          const availableSlots = configuredSlots.filter((slot) => {
            const normalizedSlot = formatTime(slot);
            return !bookedTimes.includes(normalizedSlot);
          });

          if (availableSlots.length > 0) {
            const docObj = doc.toObject();
            docObj.availableSlotsToday = availableSlots;
            filteredDoctors.push(docObj);
          }
        }
      }

      return res.status(200).json({
        success: true,
        doctors: filteredDoctors,
      });
    }

    return res.status(200).json({
      success: true,
      doctors,
    });
  } catch (error) {
    console.error("Get Doctors Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ================= LOGOUT USER =================
export const logoutUser = async (req, res) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user.id, { isOnline: false });
    }
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ================= UPDATE DOCTOR PROFILE =================
export const updateProfile = async (req, res) => {
  try {
    const { specialization, experience, location, consultationFee, about } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role !== "doctor") {
      return res.status(400).json({ success: false, message: "Only doctors can update clinical profiles" });
    }

    user.specialization = specialization !== undefined ? specialization : user.specialization;
    user.experience = experience !== undefined ? Number(experience) : user.experience;
    user.location = location !== undefined ? location : user.location;
    user.consultationFee = consultationFee !== undefined ? Number(consultationFee) : user.consultationFee;
    user.about = about !== undefined ? about : user.about;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        experience: user.experience,
        location: user.location,
        consultationFee: user.consultationFee,
        about: user.about,
        rating: user.rating,
        isOnline: user.isOnline,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};