import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getDoctors } from "../../services/authService";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import Loader from "../../components/Loader";
import DoctorProfileModal from "../../components/DoctorProfileModal";
import BookingModal from "../../components/BookingModal";
import { RiStarFill, RiMapPinLine, RiHeartPulseLine, RiDiscussLine, RiSignalTowerLine } from "react-icons/ri";
import "./PatientDashboard.css";
import AIChatbot from "../../components/AIChatbot";

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
  
  const { dayName, hours, minutes } = getKolkataTimeInfo(new Date());
  const currentMinutes = hours * 60 + minutes;
  
  const ranges = availability[dayName];
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

export default function PatientDashboard() {
  const { user } = useSelector((state) => state.auth);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    loadOnlineDoctors();
  }, []);

  const loadOnlineDoctors = async () => {
    try {
      const res = await getDoctors();
      setDoctors(res.data.doctors || []);
    } catch (err) {
      console.error("Failed to load online doctors:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get stable distance based on Mongoose ObjectId
  const getStableDistance = (id) => {
    if (!id) return "2.5";
    const sum = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return ((sum % 4) + 1.2).toFixed(1);
  };

  const onlineDoctors = doctors.filter((doc) => checkAvailability(doc.availability));
  const offlineDoctors = doctors.filter((doc) => !checkAvailability(doc.availability));

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="patient-dashboard-layout">
      <Sidebar />

      <div className="patient-dashboard-main-area">
        <Navbar />

        <div className="patient-dashboard-content">
          {/* Welcome Banner */}
          <div className="patient-welcome-banner glass-panel">
            <div className="banner-left">
              <h1>Good Morning, {user?.fullName?.split(" ")[0]} 👋</h1>
              <p>Discover medical officers currently available and consult instantly.</p>
            </div>
            <div className="banner-icon-bg">
              <RiSignalTowerLine />
            </div>
          </div>

          {/* Section 1: Available Now */}
          <div className="dashboard-discovery-section">
            <div className="section-header-row">
              <h2 className="section-title">Attending Doctors Available Now</h2>
              <span className="live-count-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                🟢 {onlineDoctors.length} Online
              </span>
            </div>

            {onlineDoctors.length === 0 ? (
              <div className="empty-doctors-state glass-panel" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                <RiHeartPulseLine className="pulse-icon-empty" style={{ fontSize: "2.5rem", color: "#475569", marginBottom: "10px" }} />
                <h3>No Doctors Online Now</h3>
                <p>No clinicians are currently active. Please check "Book for Later" below or check back shortly.</p>
              </div>
            ) : (
              <div className="doctors-discovery-grid">
                {onlineDoctors.map((doc) => {
                  const distance = getStableDistance(doc._id);
                  return (
                    <div key={doc._id} className="patient-doctor-card glass-panel animate-slide">
                      <div className="doctor-avatar-box">👨‍⚕️</div>
                      <div className="doctor-card-content">
                        <span className="card-avail-badge" style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: "700"
                        }}>
                          🟢 AVAILABLE NOW
                        </span>
                        <h3>{doc.fullName}</h3>
                        <p className="card-spec-text">{doc.specialization || "General Medicine"}</p>
                        
                        <div className="card-ratings">
                          <RiStarFill className="star-icon" />
                          <span>{doc.rating ? doc.rating.toFixed(1) : "4.8"}</span>
                        </div>

                        <div className="card-meta-line border-top">
                          <span>📍 {doc.location?.name || doc.location || "Ghaziabad"}</span>
                          <span>📏 {distance} km away</span>
                        </div>

                        <div className="card-meta-line" style={{ marginTop: "4px" }}>
                          <span>💼 {doc.experience || 5} years experience</span>
                          <span className="card-fee">₹{doc.consultationFee || 299}</span>
                        </div>

                        <div className="card-weekly-avail border-top" style={{ padding: "8px 0", fontSize: "0.75rem" }}>
                          <span style={{ color: "#94a3b8", fontWeight: "700" }}>Weekly Schedule:</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                            {Object.entries(doc.availability || {}).map(([day, ranges]) => {
                              if (!ranges || ranges.length === 0) return null;
                              return (
                                <div key={day} style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
                                  <span>{day}</span>
                                  <span style={{ color: "#38bdf8", fontWeight: "600" }}>{ranges.join(", ")}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="card-actions-row border-top">
                          <button 
                            onClick={() => setSelectedDoctor(doc)} 
                            className="btn-table-view btn-card-details"
                          >
                            View Profile
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setShowBookingModal(true);
                            }}
                            className="btn-primary-custom btn-card-consult"
                          >
                            <RiDiscussLine /> Consult
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Book for Later */}
          <div className="dashboard-discovery-section" style={{ marginTop: "40px" }}>
            <div className="section-header-row">
              <h2 className="section-title">📅 Book for Later / Consultation Schedules</h2>
              <span className="live-count-badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                Accepting Bookings
              </span>
            </div>

            {offlineDoctors.length === 0 ? (
              <div className="empty-doctors-state glass-panel" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                <p>No other clinicians are registered under the booking schedules.</p>
              </div>
            ) : (
              <div className="doctors-discovery-grid">
                {offlineDoctors.map((doc) => {
                  const distance = getStableDistance(doc._id);
                  return (
                    <div key={doc._id} className="patient-doctor-card glass-panel animate-slide">
                      <div className="doctor-avatar-box" style={{ background: "rgba(255,255,255,0.03)" }}>👨‍⚕️</div>
                      <div className="doctor-card-content">
                        <span className="card-avail-badge" style={{
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#f59e0b",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: "700"
                        }}>
                          📅 BOOKING ACTIVE
                        </span>
                        <h3>{doc.fullName}</h3>
                        <p className="card-spec-text">{doc.specialization || "General Medicine"}</p>
                        
                        <div className="card-ratings">
                          <RiStarFill className="star-icon" />
                          <span>{doc.rating ? doc.rating.toFixed(1) : "4.8"}</span>
                        </div>

                        <div className="card-meta-line border-top">
                          <span>📍 {doc.location?.name || doc.location || "Ghaziabad"}</span>
                          <span>📏 {distance} km away</span>
                        </div>

                        <div className="card-meta-line" style={{ marginTop: "4px" }}>
                          <span>💼 {doc.experience || 5} years experience</span>
                          <span className="card-fee">₹{doc.consultationFee || 299}</span>
                        </div>

                        <div className="card-weekly-avail border-top" style={{ padding: "8px 0", fontSize: "0.75rem" }}>
                          <span style={{ color: "#94a3b8", fontWeight: "700" }}>Weekly Schedule:</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                            {Object.entries(doc.availability || {}).map(([day, ranges]) => {
                              if (!ranges || ranges.length === 0) return null;
                              return (
                                <div key={day} style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
                                  <span>{day}</span>
                                  <span style={{ color: "#38bdf8", fontWeight: "600" }}>{ranges.join(", ")}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="card-actions-row border-top">
                          <button 
                            onClick={() => setSelectedDoctor(doc)} 
                            className="btn-table-view btn-card-details"
                          >
                            View Profile
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setShowBookingModal(true);
                            }}
                            className="btn-primary-custom btn-card-consult"
                          >
                            <RiDiscussLine /> Consult
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {selectedDoctor && !showBookingModal && (
        <DoctorProfileModal
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          onConsult={(doc) => {
            setShowBookingModal(true);
          }}
        />
      )}

      {showBookingModal && selectedDoctor && (
        <BookingModal
          doctor={selectedDoctor}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedDoctor(null);
          }}
        />
      )}

      <AIChatbot />
    </div>
  );
}
