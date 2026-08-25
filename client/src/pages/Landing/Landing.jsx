import { Link, useNavigate } from "react-router-dom";
import { RiHeartPulseLine, RiUser3Line, RiShieldUserLine } from "react-icons/ri";
import "./Landing.css";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page-wrapper">
      {/* Background Decorative Blobs */}
      <div className="blob-1"></div>
      <div className="blob-2"></div>
      <div className="blob-3"></div>

      <div className="landing-container">
        {/* Header */}
        <header className="landing-header">
          <div className="logo-badge">
            <RiHeartPulseLine className="logo-pulse-icon" />
          </div>
          <h1>MediCare AI</h1>
          <p className="subtitle">Clinical Support & Patient Ecosystem</p>
        </header>

        {/* Introduction */}
        <section className="landing-intro glass-panel">
          <h3>Stateless, Secure AI-Assisted Clinical Support</h3>
          <p>
            MediCareAI is a next-generation decision support platform bridging patients, 
            diagnosticians, and clinical specialists. Securely track health trends, 
            evaluate clinical risk indicators, and request instant professional referrals.
          </p>
        </section>

        {/* Portal Entry Pathways */}
        <div className="portal-gateways-grid">
          {/* Patient Card */}
          <div className="portal-card glass-panel" onClick={() => navigate("/login?portal=patient")}>
            <div className="portal-icon-wrapper patient-icon">
              <RiUser3Line />
            </div>
            <h4>Patient Portal</h4>
            <p>
              View your clinical case history, track diagnosed risk scores, and review medication 
              suggestions or specialist recommendations.
            </p>
            <button className="btn-portal-entry btn-patient">
              Patient Access
            </button>
          </div>

          {/* Professional Card */}
          <div className="portal-card glass-panel" onClick={() => navigate("/login?portal=professional")}>
            <div className="portal-icon-wrapper professional-icon">
              <RiShieldUserLine />
            </div>
            <h4>Professional Portal</h4>
            <p>
              Perform real-time diagnostic assessments, leverage AI risk insights, 
              and manage consultant referral lifecycles.
            </p>
            <button className="btn-portal-entry btn-professional">
              Clinician Access
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <footer className="landing-footer">
          <span>New to the system? </span>
          <Link to="/register" className="register-link">
            Create Clinical Account
          </Link>
        </footer>
      </div>
    </div>
  );
}
