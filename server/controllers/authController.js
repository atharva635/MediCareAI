import User from "../models/User.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";
import { checkDoctorAvailability } from "../utils/timeHelper.js";
import OTP from "../models/OTP.js";
import { sendEmailNotification } from "../services/emailService.js";

const cityCoordinates = {
  "ghaziabad": [77.4224, 28.6692],
  "delhi": [77.2090, 28.6139],
  "noida": [77.3910, 28.5355],
  "mumbai": [72.8777, 19.0760],
  "bangalore": [77.5946, 12.9716],
  "bengaluru": [77.5946, 12.9716],
  "hyderabad": [78.4867, 17.3850],
  "chennai": [80.2707, 13.0827],
  "kolkata": [88.3639, 22.5726],
  "pune": [73.8567, 18.5204],
};

const getCoordinatesForCity = (cityName) => {
  const cleanName = cityName ? cityName.toLowerCase().trim() : "ghaziabad";
  return cityCoordinates[cleanName] || [77.4224, 28.6692];
};

// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const { fullName, email, password, role, specialization, experience, location, consultationFee, about, mobile } = req.body;

    console.log("REGISTER BODY:", req.body);

    // Required Fields
    if (!fullName || !email || !password || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields (Name, Email, Mobile, Password)",
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

    // Mobile Validation
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit mobile number",
      });
    }

    // Password Validation (Regex: min 8 chars, 1 uppercase, 1 lowercase, 1 number)
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.",
      });
    }

    // Check Existing Email
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "An account with this email address already exists.",
      });
    }

    // Check Existing Mobile
    const mobileExists = await User.findOne({ mobile });
    if (mobileExists) {
      return res.status(400).json({
        success: false,
        message: "This mobile number is already registered with another account.",
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

    // Create User (unverified)
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "patient",
      specialization: role === "doctor" ? (specialization || "") : "",
      experience: role === "doctor" ? (Number(experience) || 0) : 0,
      location: role === "doctor" ? {
        name: location || "Ghaziabad",
        type: "Point",
        coordinates: getCoordinatesForCity(location),
      } : {
        name: "Establishment",
        type: "Point",
        coordinates: [77.4224, 28.6692]
      },
      consultationFee: role === "doctor" ? (Number(consultationFee) || 0) : 0,
      about: role === "doctor" ? (about || "") : "",
      isOnline: false,
      mobile,
      isVerified: false,
      tokenVersion: 0,
    });

    // Generate Verification OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, salt);

    await OTP.create({
      email: email.toLowerCase(),
      otp: hashedOtp,
      purpose: "register",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins expiry
    });

    // Send verify email
    await sendEmailNotification({
      to: email.toLowerCase(),
      subject: "Verify Your MediCare AI Account",
      text: `Welcome to MediCare AI. Your verification code is: ${otp}`,
      html: `<h3>Welcome to MediCare AI</h3><p>Use the OTP below to verify your email address:</p><h2 style="color:#2dd4bf; letter-spacing:2px;">${otp}</h2><p>This security code is valid for 10 minutes.</p>`,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful! A verification code has been sent to your email.",
      email: email.toLowerCase(),
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

    // Block unverified accounts
    if (!user.isVerified) {
      // Send a new registration OTP code automatically
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const salt = await bcrypt.genSalt(10);
      const hashedOtp = await bcrypt.hash(otp, salt);

      await OTP.deleteOne({ email: user.email, purpose: "register" });
      await OTP.create({
        email: user.email,
        otp: hashedOtp,
        purpose: "register",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await sendEmailNotification({
        to: user.email,
        subject: "Verify Your MediCare AI Account",
        text: `Your verification code is: ${otp}`,
        html: `<h3>Verify Your Email</h3><p>Please verify your email address to log in. Use the code below:</p><h2 style="color:#2dd4bf; letter-spacing:2px;">${otp}</h2><p>This code is valid for 10 minutes.</p>`,
      });

      return res.status(403).json({
        success: false,
        isUnverified: true,
        message: "Your email address is not verified yet. A verification code has been sent to your email.",
        email: user.email,
      });
    }

    // Set online status if doctor
    if (user.role === "doctor") {
      user.isOnline = true;
    }

    // Increment session tokenVersion to invalidate previous device log-ins
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Generate Token with version
    const token = generateToken(user._id, user.role, user.tokenVersion);

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
        availability: user.availability,
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
        availability: user.availability,
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
    const doctors = await User.find({ role: "doctor" }).select("-password");
    
    // Filter doctors who have at least one active availability range on any day
    const availableDoctors = doctors.filter((doctor) => {
      const avail = doctor.availability;
      if (!avail) return false;
      const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      return DAYS.some(day => {
        const ranges = avail instanceof Map ? avail.get(day) : avail[day];
        return ranges && ranges.length > 0;
      });
    });

    return res.status(200).json({
      success: true,
      doctors: availableDoctors,
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
    if (location !== undefined) {
      user.location = {
        name: location || "Ghaziabad",
        type: "Point",
        coordinates: getCoordinatesForCity(location),
      };
    }
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
        availability: user.availability,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= VERIFY OTP =================
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp, purpose } = req.body;

    if (!email || !otp || !purpose) {
      return res.status(400).json({ success: false, message: "Email, OTP, and purpose are required." });
    }

    const otpRecord = await OTP.findOne({ email: email.toLowerCase(), purpose });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Verification code has expired or is invalid. Please request a new one." });
    }

    // Check attempts limit
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: "Too many wrong attempts. Code invalidated. Please request a new one." });
    }

    // Match OTP
    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ success: false, message: `Invalid code. ${5 - otpRecord.attempts} attempts remaining.` });
    }

    // OTP is correct
    if (purpose === "register") {
      await User.findOneAndUpdate({ email: email.toLowerCase() }, { isVerified: true });
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({
      success: true,
      message: purpose === "register" ? "Email verified successfully! You can now log in." : "Code verified! Please proceed to reset password.",
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ================= RESEND OTP =================
export const resendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    if (!email || !purpose) {
      return res.status(400).json({ success: false, message: "Email and purpose are required." });
    }

    // Check rate limit: if existing OTP was created less than 60 seconds ago
    const existingOtp = await OTP.findOne({ email: email.toLowerCase(), purpose });
    if (existingOtp) {
      const timePassed = (new Date() - existingOtp.createdAt) / 1000;
      if (timePassed < 60) {
        return res.status(400).json({ success: false, message: `Please wait ${Math.ceil(60 - timePassed)} seconds before requesting another code.` });
      }
      await OTP.deleteOne({ _id: existingOtp._id });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await OTP.create({
      email: email.toLowerCase(),
      otp: hashedOtp,
      purpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
    });

    const subject = purpose === "register" ? "Verify your account" : "Reset your password";
    const bodyText = `Your security code is: ${otp}. It is valid for 10 minutes.`;
    const bodyHtml = `<h3>MediCare AI Security Code</h3><p>Your OTP for ${purpose === "register" ? "account verification" : "password reset"} is:</p><h2 style="color:#2dd4bf; letter-spacing:2px;">${otp}</h2><p>This code is valid for 10 minutes.</p>`;

    await sendEmailNotification({
      to: email.toLowerCase(),
      subject,
      text: bodyText,
      html: bodyHtml,
    });

    return res.status(200).json({ success: true, message: "A new security code has been sent to your email." });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ================= FORGOT PASSWORD =================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Please provide an email address." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    // Security: Do not reveal if the email is registered or not
    if (!user) {
      return res.status(200).json({ success: true, message: "If the email is registered, a password reset code has been sent." });
    }

    // Delete existing reset OTP if any
    await OTP.deleteOne({ email: email.toLowerCase(), purpose: "reset" });

    // Generate code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await OTP.create({
      email: email.toLowerCase(),
      otp: hashedOtp,
      purpose: "reset",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendEmailNotification({
      to: email.toLowerCase(),
      subject: "Reset your password",
      text: `Your password reset code is: ${otp}`,
      html: `<h3>Reset Password</h3><p>Use the OTP below to reset your MediCare AI password:</p><h2 style="color:#2dd4bf; letter-spacing:2px;">${otp}</h2><p>This code is valid for 10 minutes.</p>`,
    });

    return res.status(200).json({ success: true, message: "If the email is registered, a password reset code has been sent." });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ================= RESET PASSWORD =================
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, OTP, and new password are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
    }

    const otpRecord = await OTP.findOne({ email: email.toLowerCase(), purpose: "reset" });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Reset code has expired or is invalid. Please request a new one." });
    }

    // Match OTP
    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      if (otpRecord.attempts >= 5) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, message: "Too many wrong attempts. Code invalidated." });
      }
      return res.status(400).json({ success: false, message: "Invalid code. Please try again." });
    }

    // Reset password and increment tokenVersion to log out active sessions
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({ success: true, message: "Password reset successful! You can now log in." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ================= GOOGLE LOGIN =================
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: "Google credential token is required." });
    }

    // Decode Google JWT payload
    const tokenParts = credential.split(".");
    if (tokenParts.length !== 3) {
      return res.status(400).json({ success: false, message: "Invalid credential token structure." });
    }
    const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString("utf-8"));
    
    const email = payload.email?.toLowerCase();
    const fullName = payload.name;

    if (!email) {
      return res.status(400).json({ success: false, message: "Google account does not contain a valid email." });
    }

    let user = await User.findOne({ email });

    if (user) {
      // User exists - merge account and auto-verify
      if (!user.isVerified) {
        user.isVerified = true;
      }
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
    } else {
      // User does not exist - register a new patient automatically
      const salt = await bcrypt.genSalt(10);
      const randomPassword = await bcrypt.hash(Math.random().toString(36).substring(2, 15), salt);

      user = await User.create({
        fullName,
        email,
        password: randomPassword,
        role: "patient",
        isVerified: true,
        tokenVersion: 1,
      });
    }

    const token = generateToken(user._id, user.role, user.tokenVersion);

    return res.status(200).json({
      success: true,
      message: "Google login successful",
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
        availability: user.availability,
      },
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};