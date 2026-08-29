import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-hot-toast";
import { loginUser, forgotPassword, resetPassword, loginWithGoogle } from "../../services/authService";
import { setUser } from "../../redux/slices/authSlice";
import {
  RiMailLine,
  RiLockLine,
  RiHeartPulseLine,
  RiEyeLine,
  RiEyeOffLine,
  RiArrowLeftLine,
  RiShieldKeyholeLine,
  RiGoogleFill
} from "react-icons/ri";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialPortal = queryParams.get("portal") || "patient";

  const [activeTab, setActiveTab] = useState(
    initialPortal === "professional" ? "professional" : "patient"
  );

  // View States: 'login' | 'forgot' | 'reset'
  const [viewState, setViewState] = useState("login");

  // Form Data States
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Reset Password States
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Google Login States
  const [googleClientReady, setGoogleClientReady] = useState(false);

  // Load Google GSI Client Script
  useEffect(() => {
    const scriptId = "google-gsi-client-script";
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    // Check for expired session parameter from interceptor
    if (queryParams.get("expired") === "true") {
      toast.error("Your session has expired because your account was signed in from another device. 🚨", {
        duration: 6000
      });
      // Clean query parameters from URL
      navigate("/login", { replace: true });
    }
  }, []);

  // Initialize official Google Sign-in button when google object is ready
  useEffect(() => {
    const initGoogleBtn = () => {
      if (window.google) {
        setGoogleClientReady(true);
        try {
          window.google.accounts.id.initialize({
            // Demo/Developer client ID. Can be configured via env
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "870633837943-78j1j1qj8j1j1j1j1j1j1j1j1j1j1j1j.apps.googleusercontent.com",
            callback: handleGoogleCredentialResponse,
          });
          window.google.accounts.id.renderButton(
            document.getElementById("googleBtnContainer"),
            { theme: "outline", size: "large", width: "100%", text: "continue_with" }
          );
        } catch (err) {
          console.warn("Google button failed to render, using fallback simulated method:", err);
        }
      }
    };

    const checker = setInterval(() => {
      if (window.google) {
        initGoogleBtn();
        clearInterval(checker);
      }
    }, 500);

    return () => clearInterval(checker);
  }, []);

  const handleGoogleCredentialResponse = async (response) => {
    try {
      setLoading(true);
      const res = await loginWithGoogle(response.credential, activeTab);
      const userRole = res.data.user.role;

      // Verify portal match for Google Login
      if (activeTab === "patient" && userRole !== "patient") {
        toast.error("This Google account is registered as a Clinical Professional. Please use the Professional portal!");
        return;
      }
      if (activeTab === "professional" && !["doctor", "consultant"].includes(userRole)) {
        toast.error("This Google account is registered as a Patient. Please use the Patient portal!");
        return;
      }

      toast.success(res.data.message || "Google Login Successful! ✅");
      
      dispatch(
        setUser({
          user: res.data.user,
          token: res.data.token,
        })
      );

      navigate(userRole === "patient" ? "/patient/dashboard" : `/${userRole}/dashboard`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Google Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  // Simulated Google Sign-in for Local Dev (Mock Mode)
  const handleSimulatedGoogleLogin = async () => {
    const email = window.prompt("Enter any email to simulate Google Login (Demo Mode):", "demo-patient@gmail.com");
    if (!email) return;

    // Construct a mock JWT credential token containing the email
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      email: email.toLowerCase(),
      name: email.split("@")[0].toUpperCase() + " (Google Mock)",
      sub: "1234567890",
    }));
    const mockCredential = `${header}.${payload}.signature`;

    try {
      setLoading(true);
      const res = await loginWithGoogle(mockCredential, activeTab);
      const userRole = res.data.user.role;

      // Verify portal match
      if (activeTab === "patient" && userRole !== "patient") {
        toast.error("This account is registered as a Clinical Professional. Please use the Professional portal!");
        return;
      }
      if (activeTab === "professional" && !["doctor", "consultant"].includes(userRole)) {
        toast.error("This account is registered as a Patient. Please use the Patient portal!");
        return;
      }

      toast.success("Simulated Google Login Successful! ✅");

      dispatch(
        setUser({
          user: res.data.user,
          token: res.data.token,
        })
      );

      navigate(userRole === "patient" ? "/patient/dashboard" : `/${userRole}/dashboard`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Simulated Google Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

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
      const res = await loginUser({ ...formData, role: activeTab });
      const userRole = res.data.user.role;

      // Verify portal match
      if (activeTab === "patient" && userRole !== "patient") {
        toast.error("Invalid credentials for Patient portal!");
        return;
      }
      if (activeTab === "professional" && !["doctor", "consultant"].includes(userRole)) {
        toast.error("Invalid credentials for Clinical Professional portal!");
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
      console.error(err);
      if (err.response?.data?.isUnverified) {
        toast.error(err.response.data.message);
        // Redirect immediately to verify email
        navigate(`/register?email=${err.response.data.email}`);
      } else {
        toast.error(err.response?.data?.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    try {
      setForgotLoading(true);
      const res = await forgotPassword(forgotEmail);
      toast.success(res.data.message || "A security code has been sent to your email!");
      setViewState("reset");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to trigger recovery process.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      setResetLoading(true);
      const res = await resetPassword(forgotEmail, resetOtp, newPassword);
      toast.success(res.data.message || "Password updated successfully! Please log in.");
      setViewState("login");
      setFormData({ email: forgotEmail, password: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification code failed.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="blob-1"></div>
      <div className="blob-2"></div>

      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="logo-badge">
            <RiHeartPulseLine className="logo-pulse-icon" />
          </div>
          <h1>MediCare AI</h1>
          <p className="subtitle">
            {viewState === "forgot"
              ? "Password Recovery"
              : viewState === "reset"
              ? "Verify Reset OTP"
              : activeTab === "patient"
              ? "Patient Clinical Hub"
              : "Professional Workstation"}
          </p>
        </div>

        {viewState === "login" && (
          <>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="input-label">Password</label>
                  <button
                    type="button"
                    onClick={() => setViewState("forgot")}
                    style={{ background: "none", border: "none", color: "#2dd4bf", fontSize: "0.78rem", cursor: "pointer", fontWeight: "600" }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="input-wrapper">
                  <RiLockLine className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="form-input-custom"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: "14px", background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    {showPassword ? <RiEyeOffLine /> : <RiEyeLine />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary-custom" style={{ marginTop: "8px" }}>
                {loading
                  ? activeTab === "patient"
                    ? "Authenticating Patient..."
                    : "Authenticating Professional..."
                  : "Enter Workspace"}
              </button>
            </form>

            <div style={{ margin: "16px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ height: "1px", flex: 1, background: "rgba(255,255,255,0.08)" }}></div>
              <span style={{ padding: "0 10px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>OR</span>
              <div style={{ height: "1px", flex: 1, background: "rgba(255,255,255,0.08)" }}></div>
            </div>

            {/* Google Sign-in official button container */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div id="googleBtnContainer" style={{ width: "100%", display: googleClientReady ? "block" : "none" }}></div>
              <button
                type="button"
                onClick={handleSimulatedGoogleLogin}
                className="btn-google-mock"
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px dashed rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#cbd5e1",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "600",
                  gap: "6px"
                }}
              >
                <RiGoogleFill style={{ color: "#ef4444" }} /> Continue with Google (Demo Mode)
              </button>
            </div>
          </>
        )}

        {viewState === "forgot" && (
          <form onSubmit={handleForgotSubmit} className="login-form animate-slide">
            <button
              type="button"
              onClick={() => setViewState("login")}
              style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: "0 0 10px 0" }}
            >
              <RiArrowLeftLine /> Back to Login
            </button>

            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <RiShieldKeyholeLine style={{ fontSize: "2.8rem", color: "#2dd4bf", marginBottom: "6px" }} />
              <h3>Forgot Password</h3>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
                Enter your registered email address to receive a recovery code.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div className="input-wrapper">
                <RiMailLine className="input-icon" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="form-input-custom"
                />
              </div>
            </div>

            <button type="submit" disabled={forgotLoading} className="btn-primary-custom" style={{ marginTop: "10px" }}>
              {forgotLoading ? "Sending Code..." : "Send Verification Code"}
            </button>
          </form>
        )}

        {viewState === "reset" && (
          <form onSubmit={handleResetSubmit} className="login-form animate-slide">
            <button
              type="button"
              onClick={() => setViewState("forgot")}
              style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: "0 0 10px 0" }}
            >
              <RiArrowLeftLine /> Resend Code
            </button>

            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <h3>Enter Recovery Code</h3>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
                We sent a 6-digit recovery code to <strong style={{ color: "#f8fafc" }}>{forgotEmail}</strong>.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">6-Digit Code</label>
              <input
                type="text"
                placeholder="••••••"
                maxLength="6"
                required
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value.replace(/[^0-9]/g, ""))}
                style={{ textAlign: "center", letterSpacing: "6px", fontSize: "1.2rem", fontWeight: "700" }}
                className="form-input-custom"
              />
            </div>

            <div className="input-group">
              <label className="input-label">New Password</label>
              <div className="input-wrapper">
                <RiLockLine className="input-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input-custom"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Confirm New Password</label>
              <div className="input-wrapper">
                <RiLockLine className="input-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="form-input-custom"
                />
              </div>
            </div>

            <button type="submit" disabled={resetLoading} className="btn-primary-custom" style={{ marginTop: "12px" }}>
              {resetLoading ? "Updating Password..." : "Update Password & Login"}
            </button>
          </form>
        )}

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