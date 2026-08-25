import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/authSlice";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import EditProfileModal from "../../components/EditProfileModal";
import AvailabilityModal from "../../components/AvailabilityModal";
import { RiUser3Line, RiShieldUserLine, RiEdit2Line, RiCalendarCheckLine } from "react-icons/ri";
import "./Dashboard.css";

export default function Dashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  const handleProfileSave = (updatedUser) => {
    dispatch(setUser({ user: updatedUser }));
  };

  const handleAvailabilitySave = (updatedAvailability) => {
    dispatch(setUser({ user: { ...user, availability: updatedAvailability } }));
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main-area">
        <Navbar />

        <div className="dashboard-content">
          {/* Welcome Banner */}
          <div className="dashboard-welcome-banner glass-panel">
            <h1>Welcome, Dr. {user?.fullName?.split(" ").slice(-1)[0]}</h1>
            <p>Clinical status is active. Manage details visible to patients below.</p>
          </div>

          <div className="dashboard-insights-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div className="doctor-status-alert glass-panel">
              <div className="status-header">
                <span className="status-avail-dot pulsing-green"></span>
                <h3>Attending Clinician: ONLINE</h3>
              </div>
              <p className="status-desc-text">
                Your credentials and consultation cards are active in patient searches. 
                Logout to set status to offline.
              </p>
            </div>

            {/* Profile Overview Card */}
            <div className="clinician-summary-card glass-panel">
              <div className="summary-header">
                <div className="icon-wrapper"><RiShieldUserLine /></div>
                <div>
                  <h2>Clinical Profile Card</h2>
                  <p>Matches information displayed on patient search lists.</p>
                </div>
                <div className="summary-header-actions" style={{ display: "flex", gap: "10px" }}>
                  <button 
                    onClick={() => setShowAvailabilityModal(true)}
                    className="btn-primary-custom btn-availability-trigger"
                    style={{ background: "rgba(45, 212, 191, 0.1)", color: "#2dd4bf", border: "1px solid rgba(45, 212, 191, 0.2)" }}
                  >
                    <RiCalendarCheckLine /> Set Availability
                  </button>
                  <button 
                    onClick={() => setShowEditModal(true)}
                    className="btn-primary-custom btn-edit-profile-trigger"
                  >
                    <RiEdit2Line /> Edit Profile
                  </button>
                </div>
              </div>

              <div className="summary-fields-row border-top">
                <div className="summary-field">
                  <span>Specialization</span>
                  <strong>{user?.specialization || "General Medicine"}</strong>
                </div>

                <div className="summary-field">
                  <span>Experience</span>
                  <strong>{user?.experience || 5} Years Practice</strong>
                </div>

                <div className="summary-field">
                  <span>Location</span>
                  <strong>{user?.location || "Ghaziabad"}</strong>
                </div>

                <div className="summary-field">
                  <span>Consultation Fee</span>
                  <strong>₹{user?.consultationFee || 299}</strong>
                </div>
              </div>

              <div className="summary-about-section border-top">
                <h3>About Professional Credentials</h3>
                <p className="about-paragraph">
                  {user?.about || "Write a brief description about your hospital affiliations, credentials, and practice details."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal
          doctor={user}
          onClose={() => setShowEditModal(false)}
          onSaveSuccess={handleProfileSave}
        />
      )}

      {showAvailabilityModal && (
        <AvailabilityModal
          doctor={user}
          onClose={() => setShowAvailabilityModal(false)}
          onSaveSuccess={handleAvailabilitySave}
        />
      )}
    </div>
  );
}