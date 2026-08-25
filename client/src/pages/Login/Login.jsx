import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-hot-toast";
import { loginUser } from "../../services/authService";
import { setUser, logout } from "../../redux/slices/authSlice";
import { RiMailLine, RiLockLine, RiHeartPulseLine } from "react-icons/ri";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const queryParams = new URLSearchParams(window.location.search);
  const initialPortal = queryParams.get("portal") || "patient";

  const [activeTab, setActiveTab] = useState(
    initialPortal === "professional" ? "professional" : "patient"
  );

  const [formData, setFormData] = useState({
    email: "",
    password: "",
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
      const res = await loginUser(formData);

      const userRole = res.data.user.role;

      // Verify portal match
      if (activeTab === "patient" && userRole !== "patient") {
        toast.error("Invalid credentials for Patient portal!");
        setLoading(false);
        return;
      }
      if (activeTab === "professional" && !["doctor", "consultant"].includes(userRole)) {
        toast.error("Invalid credentials for Clinical Professional portal!");
        setLoading(false);
        return;
      }

      dispatch(
        setUser({
          user: res.data.user,
          token: res.data.token,
        })
      );

      if (userRole === "patient") {
        toast.success(`Welcome back, ${res.data.user.fullName}! ✅`);
        navigate("/patient/dashboard");
      } else if (userRole === "doctor") {
        toast.success("Welcome back, Doctor! Login Successful ✅");
        navigate("/doctor/dashboard");
      } else if (userRole === "consultant") {
        toast.success("Welcome back, Consultant Specialist! Login Successful ✅");
        navigate("/consultant/dashboard");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* Background Decorative Blobs */}
      <div className="blob-1"></div>
      <div className="blob-2"></div>

      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="logo-badge">
            <RiHeartPulseLine className="logo-pulse-icon" />
          </div>
          <h1>MediCare AI</h1>
          <p className="subtitle">
            {activeTab === "patient" ? "Patient Clinical Hub" : "Professional Workstation"}
          </p>
        </div>

        {/* Portal Tabs Selector */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${activeTab === "patient" ? "active" : ""}`}
            onClick={() => setActiveTab("patient")}
          >
            👤 Patient / User
          </button>
          <button
            type="button"
            className={`login-tab ${activeTab === "professional" ? "active" : ""}`}
            onClick={() => setActiveTab("professional")}
          >
            🩺 Professional
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div className="input-wrapper">
              <RiMailLine className="input-icon" />
              <input
                type="email"
                name="email"
                placeholder={activeTab === "patient" ? "patient@gmail.com" : "doctor@gmail.com"}
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

          <button type="submit" disabled={loading} className="btn-primary-custom">
            {loading
              ? activeTab === "patient"
                ? "Authenticating Patient..."
                : "Authenticating Professional..."
              : "Enter Workspace"}
          </button>
        </form>

        <div className="login-footer">
          <span>New to MediCareAI? </span>
          <Link to="/register" className="register-link">
            Create Account Access
          </Link>
        </div>
      </div>
    </div>
  );
}