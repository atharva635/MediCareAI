import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/authSlice";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import EditProfileModal from "../../components/EditProfileModal";
import AvailabilityModal from "../../components/AvailabilityModal";
import { RiUser3Line, RiShieldUserLine, RiEdit2Line, RiCalendarCheckLine } from "react-icons/ri";
import "./Dashboard.css";

// Helpers for checking doctor's availability locally in Asia/Kolkata timezone
const formatTime = (timeStr) => {
  try {
    const parts = timeStr.trim().split(/\s+/);
    if (parts.length < 2) return timeStr.trim();
    let [time, modifier] = parts;
    let [hours, minutes] = time.split(":");
    hours = hours.padStart(2, "0");
    minutes = minutes.padStart(2, "0");
    return `${hours}:${minutes} ${modifier.toUpperCase()}`;
  } catch (e) {
    return timeStr.trim();
  }
};

const parseTimeToMinutes = (timeStr) => {
  const normalized = formatTime(timeStr);
  const [time, modifier] = normalized.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) {
    hours += 12;
  }
  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
};

const getKolkataTimeInfo = (date = new Date()) => {
  const options = {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "long"
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(date);
  const info = {};
  for (const part of parts) {
    info[part.type] = part.value;
  }
  return {
    dayName: info.weekday,
    hours: parseInt(info.hour),
    minutes: parseInt(info.minute)
  };
};

const checkAvailability = (availability) => {
  if (!availability) return false;
  
  const now = new Date();
  const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
  const dateStr = new Intl.DateTimeFormat("en-CA", options).format(now);
  
  const { hours, minutes } = getKolkataTimeInfo(now);
  const currentMinutes = hours * 60 + minutes;
  
  const ranges = availability[dateStr];
  if (!ranges || ranges.length === 0) {
    return false;
  }
  
  for (const range of ranges) {
    const parts = range.split("-");
    if (parts.length !== 2) continue;
    const startMinutes = parseTimeToMinutes(parts[0].trim());
    const endMinutes = parseTimeToMinutes(parts[1].trim());
    
    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return true;
    }
  }
  
  return false;
};

export default function Dashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [isAvailableNow, setIsAvailableNow] = useState(false);

  useEffect(() => {
    const updateAvailabilityStatus = () => {
      setIsAvailableNow(checkAvailability(user?.availability));
    };

    updateAvailabilityStatus();
    const interval = setInterval(updateAvailabilityStatus, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [user?.availability]);

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
                <span className={`status-avail-dot ${isAvailableNow ? "pulsing-green" : ""}`} style={{ backgroundColor: isAvailableNow ? "#10b981" : "#64748b" }}></span>
                <h3 style={{ color: isAvailableNow ? "#34d399" : "#94a3b8" }}>
                  Attending Clinician: {isAvailableNow ? "AVAILABLE NOW" : "INACTIVE / OFFLINE"}
                </h3>
              </div>
              <p className="status-desc-text">
                {isAvailableNow 
                  ? "Your consultation profile is currently active and visible to patients in search lists."
                  : "Your profile is hidden from patient searches because you are outside your configured consultation hours. Use 'Set Availability' below to adjust your timings."
                }
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
                  <strong>{user?.location?.name || user?.location || "Ghaziabad"}</strong>
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