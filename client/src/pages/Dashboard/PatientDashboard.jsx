import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getDoctors } from "../../services/authService";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import Loader from "../../components/Loader";
import DoctorProfileModal from "../../components/DoctorProfileModal";
import BookingModal from "../../components/BookingModal";
import { RiStarFill, RiHeartPulseLine, RiDiscussLine, RiSignalTowerLine } from "react-icons/ri";
import "./PatientDashboard.css";
import AIChatbot from "../../components/AIChatbot";

// Helper: Formats YYYY-MM-DD into a human-friendly label "Monday, 31 August 2026"
const formatDateNicely = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return dateStr;
  return dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Main Helper: Analyzes the doctor's live status, slots, and session heartbeat
const getDoctorStatusInfo = (doctor) => {
  const now = new Date();
  
  // Format current date in Kolkata: YYYY-MM-DD
  const kolkataDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const kolkataTimeStr = now.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
  const [curH, curM] = kolkataTimeStr.split(":").map(Number);
  const currentMinutes = curH * 60 + curM;

  const parseToMinutesLocal = (tStr) => {
    const [time, modifier] = tStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Heartbeat online session check (90s tolerance)
  const isOnline = doctor.isOnline && doctor.lastHeartbeat && 
    (now - new Date(doctor.lastHeartbeat) <= 90000);

  const availability = doctor.availability || {};
  const rawAvail = availability instanceof Map ? Object.fromEntries(availability) : availability;

  const slots = [];
  Object.entries(rawAvail).forEach(([dateKey, ranges]) => {
    if (!ranges || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
    ranges.forEach(range => {
      const parts = range.split("-").map(p => p.trim());
      if (parts.length !== 2) return;
      const startMin = parseToMinutesLocal(parts[0]);
      const endMin = parseToMinutesLocal(parts[1]);

      let isExpired = false;
      if (dateKey < kolkataDateStr) {
        isExpired = true;
      } else if (dateKey === kolkataDateStr) {
        isExpired = currentMinutes >= endMin;
      }

      if (!isExpired) {
        slots.push({
          dateKey,
          range,
          startMin,
          endMin,
          startTimeStr: parts[0],
          endTimeStr: parts[1],
          isToday: dateKey === kolkataDateStr,
          isLiveRightNow: dateKey === kolkataDateStr && currentMinutes >= startMin && currentMinutes < endMin
        });
      }
    });
  });

  // Sort slots chronologically
  slots.sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
    return a.startMin - b.startMin;
  });

  const currentLiveSlot = slots.find(s => s.isLiveRightNow);

  if (currentLiveSlot) {
    if (isOnline) {
      return {
        status: "LIVE_NOW",
        activeSlot: currentLiveSlot,
        allSlots: slots,
        onlineSince: doctor.sessionStartedAt ? new Date(doctor.sessionStartedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "Recently",
        consultingUntil: currentLiveSlot.endTimeStr
      };
    } else {
      return {
        status: "SCHEDULED",
        activeSlot: currentLiveSlot,
        allSlots: slots
      };
    }
  }

  const nextSlot = slots[0];
  return {
    status: "OFFLINE",
    activeSlot: null,
    nextSlot: nextSlot || null,
    allSlots: slots
  };
};

export default function PatientDashboard() {
  const { user } = useSelector((state) => state.auth);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    loadOnlineDoctors();
    const interval = setInterval(loadOnlineDoctors, 15000); // Check/update status every 15s
    return () => clearInterval(interval);
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

  const getStableDistance = (id) => {
    if (!id) return "2.5";
    const sum = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return ((sum % 4) + 1.2).toFixed(1);
  };

  // Process doctors live availability information
  const liveDoctorsList = [];
  const bookingSchedulesList = [];

  doctors.forEach(doc => {
    const info = getDoctorStatusInfo(doc);
    
    // Skip rendering if they have absolutely no upcoming or live slots
    if (info.allSlots.length === 0) return;

    const decoratedDoctor = {
      ...doc,
      statusInfo: info
    };

    if (info.status === "LIVE_NOW") {
      liveDoctorsList.push(decoratedDoctor);
    } else {
      bookingSchedulesList.push(decoratedDoctor);
    }
  });

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

          {/* Section 1: LIVE NOW */}
          <div className="dashboard-discovery-section">
            <div className="section-header-row">
              <h2 className="section-title">Attending Doctors Available Now</h2>
              <span className="live-count-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                🟢 {liveDoctorsList.length} Live Now
              </span>
            </div>

            {liveDoctorsList.length === 0 ? (
              <div className="empty-doctors-state glass-panel" style={{ padding: "35px", textAlign: "center", color: "#64748b" }}>
                <RiHeartPulseLine className="pulse-icon-empty" style={{ fontSize: "2.5rem", color: "#475569", marginBottom: "10px" }} />
                <h3>No Doctors Online Right Now</h3>
                <p>No clinicians are currently active on a live session. Please check "Book for Later" below or check back shortly.</p>
              </div>
            ) : (
              <div className="doctors-discovery-grid">
                {liveDoctorsList.map((doc) => {
                  const distance = getStableDistance(doc._id);
                  const statusInfo = doc.statusInfo;
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
                          🟢 LIVE NOW
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

                        {/* Attendance slot information */}
                        <div className="card-live-details" style={{ marginTop: "12px", padding: "10px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700" }}>
                            <span>TODAY'S ATTENDING SESSION</span>
                            <span style={{ color: "#10b981" }}>● LIVE</span>
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "#f1f5f9", fontWeight: "700", marginTop: "4px" }}>
                            📅 {formatDateNicely(statusInfo.activeSlot.dateKey)}
                          </div>
                          <div style={{ fontSize: "0.9rem", color: "#2dd4bf", fontWeight: "700", marginTop: "2px" }}>
                            🕐 {statusInfo.activeSlot.startTimeStr} ─── {statusInfo.activeSlot.endTimeStr}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "6px", fontSize: "0.75rem", color: "#cbd5e1" }}>
                            <span>Online since: <strong>{statusInfo.onlineSince}</strong></span>
                            <span>Consulting until: <strong>{statusInfo.consultingUntil}</strong></span>
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

          {/* Section 2: Book for Later / Consultation Schedules */}
          <div className="dashboard-discovery-section" style={{ marginTop: "40px" }}>
            <div className="section-header-row">
              <h2 className="section-title">📅 Upcoming Schedules / Book for Later</h2>
              <span className="live-count-badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                Accepting Bookings
              </span>
            </div>

            {bookingSchedulesList.length === 0 ? (
              <div className="empty-doctors-state glass-panel" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                <p>No other clinicians currently have future availability schedules configured.</p>
              </div>
            ) : (
              <div className="doctors-discovery-grid">
                {bookingSchedulesList.map((doc) => {
                  const distance = getStableDistance(doc._id);
                  const statusInfo = doc.statusInfo;
                  const isScheduled = statusInfo.status === "SCHEDULED";
                  return (
                    <div key={doc._id} className="patient-doctor-card glass-panel animate-slide">
                      <div className="doctor-avatar-box" style={{ background: "rgba(255,255,255,0.03)" }}>👨‍⚕️</div>
                      <div className="doctor-card-content">
                        <span className="card-avail-badge" style={{
                          background: isScheduled ? "rgba(245, 158, 11, 0.15)" : "rgba(56, 189, 248, 0.15)",
                          color: isScheduled ? "#f59e0b" : "#38bdf8",
                          border: isScheduled ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(56, 189, 248, 0.3)",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: "700"
                        }}>
                          {isScheduled ? "🟡 SCHEDULED" : "📅 AVAILABLE LATER"}
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

                        {/* Upcoming timings information */}
                        <div className="card-live-details" style={{ marginTop: "12px", padding: "10px", background: isScheduled ? "rgba(245, 158, 11, 0.03)" : "rgba(148, 163, 184, 0.05)", border: isScheduled ? "1px solid rgba(245, 158, 11, 0.15)" : "1px solid rgba(148, 163, 184, 0.15)", borderRadius: "8px" }}>
                          {isScheduled ? (
                            <>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700" }}>
                                <span>TODAY'S SCHEDULED SESSION</span>
                                <span style={{ color: "#f59e0b" }}>WAITING</span>
                              </div>
                              <div style={{ fontSize: "0.85rem", color: "#f1f5f9", fontWeight: "700", marginTop: "4px" }}>
                                📅 {formatDateNicely(statusInfo.activeSlot.dateKey)}
                              </div>
                              <div style={{ fontSize: "0.9rem", color: "#cbd5e1", fontWeight: "700", marginTop: "2px" }}>
                                🕐 {statusInfo.activeSlot.startTimeStr} ─── {statusInfo.activeSlot.endTimeStr}
                              </div>
                              <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "#f59e0b", fontStyle: "italic", fontWeight: "600" }}>
                                ⚠️ Doctor hasn't joined yet
                              </div>
                            </>
                          ) : (
                            <>
                              {statusInfo.nextSlot ? (
                                <>
                                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700" }}>
                                    NEXT AVAILABLE CONSULTATION
                                  </div>
                                  <div style={{ fontSize: "0.85rem", color: "#f1f5f9", fontWeight: "700", marginTop: "4px" }}>
                                    📅 {formatDateNicely(statusInfo.nextSlot.dateKey)}
                                  </div>
                                  <div style={{ fontSize: "0.9rem", color: "#38bdf8", fontWeight: "700", marginTop: "2px" }}>
                                    🕐 {statusInfo.nextSlot.startTimeStr} ─── {statusInfo.nextSlot.endTimeStr}
                                  </div>
                                </>
                              ) : (
                                <div style={{ fontSize: "0.75rem", color: "#64748b", fontStyle: "italic" }}>
                                  No upcoming slots.
                                </div>
                              )}
                            </>
                          )}
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
