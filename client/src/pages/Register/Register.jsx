import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { registerUser } from "../../services/authService";
import { RiUser3Line, RiMailLine, RiLockLine, RiHeartPulseLine } from "react-icons/ri";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "patient",
    specialization: "",
    experience: "",
    location: "",
    consultationFee: "",
    about: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const res = await registerUser(formData);

      toast.success(res.data.message || "Account Registered Successfully! Please login.");
      navigate("/");
    } catch (err) {
      console.log("FULL ERROR:", err);
      console.log("STATUS:", err.response?.status);
      console.log("DATA:", err.response?.data);

      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-wrapper">
      {/* Background Decorative Blobs */}
      <div className="blob-1"></div>
      <div className="blob-2"></div>

      <div className="register-card glass-panel" style={{ maxWidth: formData.role === "doctor" ? "650px" : "480px" }}>
        <div className="register-header">
          <div className="logo-badge">
            <RiHeartPulseLine className="logo-pulse-icon" />
          </div>
          <h1>MediCare AI</h1>
          <p className="subtitle">Clinical Registration Portal</p>
        </div>

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
                placeholder={formData.role === "patient" ? "patient@gmail.com" : "professional@gmail.com"}
                value={formData.email}
                onChange={handleChange}
                required
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