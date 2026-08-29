import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { registerUser, verifyOtp, resendOtp } from "../../services/authService";
import {
  RiUser3Line,
  RiMailLine,
  RiLockLine,
  RiPhoneLine,
  RiHeartPulseLine,
  RiShieldCheckLine
} from "react-icons/ri";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    role: "patient",
    specialization: "",
    experience: "",
    location: "",
    consultationFee: "",
    about: "",
  });

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "Weak",
    color: "#ef4444",
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  // Manage resend cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cooldown]);

  const checkPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    let label = "Weak";
    let color = "#ef4444";
    if (score >= 4) {
      label = "Strong";
      color = "#10b981";
    } else if (score >= 2) {
      label = "Medium";
      color = "#f59e0b";
    }
    setPasswordStrength({ score, label, color });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === "password") {
      checkPasswordStrength(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (passwordStrength.label === "Weak") {
      toast.error("Please enter a stronger password containing numbers, letters, and uppercase characters.");
      return;
    }

    try {
      setLoading(true);
      const res = await registerUser(formData);
      toast.success(res.data.message || "Security code sent! Please verify your email.");
      setRegisteredEmail(formData.email);
      setIsVerifying(true);
      setCooldown(60);
    } catch (err) {
      console.error("Register Error:", err);
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      setOtpLoading(true);
      const res = await verifyOtp(registeredEmail, otpCode, "register");
      toast.success(res.data.message || "Account activated! Welcome to MediCare AI.");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    try {
      await resendOtp(registeredEmail, "register");
      toast.success("A new security code has been sent to your email! 📨");
      setCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend code.");
    }
  };

  return (
    <div className="register-page-wrapper">
      <div className="blob-1"></div>
      <div className="blob-2"></div>

      <div
        className="register-card glass-panel"
        style={{
          maxWidth: isVerifying ? "450px" : formData.role === "doctor" ? "650px" : "480px",
          transition: "max-width 0.4s ease-in-out"
        }}
      >
        <div className="register-header">
          <div className="logo-badge">
            <RiHeartPulseLine className="logo-pulse-icon" />
          </div>
          <h1>MediCare AI</h1>
          <p className="subtitle">Clinical Registration Portal</p>
        </div>

        {!isVerifying ? (
          <form onSubmit={handleSubmit} className="register-form">
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <div className="input-wrapper">
                <RiUser3Line className="input-icon" />
                <input
                  type="text"
                  name="fullName"
                  placeholder={formData.role === "patient" ? "Your Name" : "Dr. Name"}
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="form-input-custom"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div className="input-wrapper">
                <RiMailLine className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="form-input-custom"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Mobile Number</label>
              <div className="input-wrapper">
                <RiPhoneLine className="input-icon" />
                <input
                  type="tel"
                  name="mobile"
                  placeholder="10-digit mobile number"
                  value={formData.mobile}
                  onChange={handleChange}
                  required
                  maxLength="10"
                  pattern="[0-9]{10}"
                  className="form-input-custom"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <RiLockLine className="input-icon" />
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="form-input-custom"
                />
              </div>
              {formData.password && (
                <div style={{ marginTop: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "4px" }}>
                    <span style={{ color: "#94a3b8" }}>Password Strength:</span>
                    <strong style={{ color: passwordStrength.color }}>{passwordStrength.label}</strong>
                  </div>
                  <div style={{ height: "4px", width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(passwordStrength.score / 5) * 100}%`,
                        background: passwordStrength.color,
                        transition: "width 0.3s ease"
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <div className="input-wrapper">
                <RiLockLine className="input-icon" />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="form-input-custom"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Account Role</label>
              <div className="input-wrapper">
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="form-input-custom form-select-custom"
                  style={{ paddingLeft: "14px" }}
                >
                  <option value="patient">👤 Patient / User</option>
                  <option value="doctor">🩺 Medical Doctor</option>
                  <option value="consultant">💼 Consultant Specialist</option>
                </select>
              </div>
            </div>

            {/* Conditional Doctor Fields */}
            {formData.role === "doctor" && (
              <div className="doctor-extra-inputs-grid animate-slide" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "8px" }}>
                <div className="input-group" style={{ gridColumn: "span 2" }}>
                  <label className="input-label">Medical Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    placeholder="e.g. General Physician, Cardiologist"
                    value={formData.specialization}
                    onChange={handleChange}
                    required={formData.role === "doctor"}
                    className="form-input-custom"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Experience (Years)</label>
                  <input
                    type="number"
                    name="experience"
                    placeholder="e.g. 8"
                    value={formData.experience}
                    onChange={handleChange}
                    required={formData.role === "doctor"}
                    className="form-input-custom"
                    min="0"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    name="consultationFee"
                    placeholder="e.g. 299"
                    value={formData.consultationFee}
                    onChange={handleChange}
                    required={formData.role === "doctor"}
                    className="form-input-custom"
                    min="0"
                  />
                </div>

                <div className="input-group" style={{ gridColumn: "span 2" }}>
                  <label className="input-label">Practice Location / City</label>
                  <input
                    type="text"
                    name="location"
                    placeholder="e.g. Ghaziabad, New Delhi"
                    value={formData.location}
                    onChange={handleChange}
                    required={formData.role === "doctor"}
                    className="form-input-custom"
                  />
                </div>

                <div className="input-group" style={{ gridColumn: "span 2" }}>
                  <label className="input-label">About Professional Practice</label>
                  <textarea
                    name="about"
                    placeholder="Provide background credentials, clinic locations, and brief description..."
                    value={formData.about}
                    onChange={handleChange}
                    required={formData.role === "doctor"}
                    className="form-textarea-custom"
                    rows="3"
                  />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary-custom" style={{ marginTop: "12px" }}>
              {loading ? "Creating Profile..." : "Register Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="register-form animate-slide" style={{ padding: "10px 0" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <RiShieldCheckLine style={{ fontSize: "3rem", color: "#2dd4bf", marginBottom: "8px" }} />
              <h3>Enter Security Code</h3>
              <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "4px" }}>
                We have sent a 6-digit OTP code to <strong style={{ color: "#f8fafc" }}>{registeredEmail}</strong>
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">One-Time Password (OTP)</label>
              <div className="input-wrapper" style={{ letterSpacing: "8px" }}>
                <input
                  type="text"
                  placeholder="••••••"
                  maxLength="6"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                  style={{ textAlign: "center", fontSize: "1.4rem", fontWeight: "700" }}
                  className="form-input-custom"
                />
              </div>
            </div>

            <button type="submit" disabled={otpLoading} className="btn-primary-custom" style={{ marginTop: "16px" }}>
              {otpLoading ? "Verifying..." : "Verify & Activate Account"}
            </button>

            <div style={{ textAlign: "center", marginTop: "20px", fontSize: "0.82rem" }}>
              {cooldown > 0 ? (
                <span style={{ color: "#64748b" }}>Resend code in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  style={{ background: "none", border: "none", color: "#2dd4bf", cursor: "pointer", fontWeight: "600" }}
                >
                  Resend Security Code
                </button>
              )}
            </div>
          </form>
        )}

        <div className="register-footer">
          <span>Already registered? </span>
          <Link to="/" className="login-link">
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}