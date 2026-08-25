import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { RiShieldUserLine, RiHospitalLine, RiMailLine, RiVerifiedBadgeLine, RiUserSettingsLine } from "react-icons/ri";
import "./Profile.css";

export default function Profile() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <div className="profile-layout">
      <Sidebar />

      <div className="profile-main-area">
        <Navbar />

        <div className="profile-content">
          <div className="profile-details-card glass-panel">
            <div className="profile-card-header">
              <div className="profile-avatar-large">
                {user?.fullName ? user.fullName[0].toUpperCase() : "U"}
              </div>
              <div className="profile-meta-title">
                <h2>
                  {user?.role === "doctor" ? "Dr. " : user?.role === "consultant" ? "Consultant " : ""}
                  {user?.fullName || "User"}
                </h2>
                <span className="badge low profile-role-badge">
                  <RiVerifiedBadgeLine />
                  {user?.role === "doctor"
                    ? "Verified Medical Officer"
                    : user?.role === "consultant"
                    ? "Specialist Consultant"
                    : "Registered Patient"}
                </span>
              </div>
            </div>

            <div className="profile-stats-grid">
              <div className="profile-info-item">
                <RiMailLine className="info-icon" />
                <div>
                  <span className="info-label">Email Address</span>
                  <p className="info-value">{user?.email || "user@medicare.ai"}</p>
                </div>
              </div>

              <div className="profile-info-item">
                <RiHospitalLine className="info-icon" />
                <div>
                  <span className="info-label">Assigned Medical Facility</span>
                  <p className="info-value">
                    {user?.role === "patient" ? "MediCare AI Clinic Network" : "MediCare AI Central Laboratory"}
                  </p>
                </div>
              </div>

              <div className="profile-info-item">
                <RiShieldUserLine className="info-icon" />
                <div>
                  <span className="info-label">System Role</span>
                  <p className="info-value">
                    {user?.role === "doctor"
                      ? "Lead Medical Inspector"
                      : user?.role === "consultant"
                      ? "Clinical Consultant Specialist"
                      : "Patient Access Group"}
                  </p>
                </div>
              </div>

              <div className="profile-info-item">
                <RiUserSettingsLine className="info-icon" />
                <div>
                  <span className="info-label">Account Identification</span>
                  <p className="info-value">UID-{user?.id?.substring(0, 8).toUpperCase() || user?._id?.substring(0, 8).toUpperCase() || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="profile-card-actions">
              <button onClick={handleLogout} className="logout-btn-large">
                Sign Out of Workspace
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}