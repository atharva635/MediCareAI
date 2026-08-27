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

export default function PatientDashboard() {
  const { user } = useSelector((state) => state.auth);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [bookingInitialDate, setBookingInitialDate] = useState("");
  const [bookingInitialTime, setBookingInitialTime] = useState("");

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    loadOnlineDoctors(filterDate);
  }, [filterDate]);

  const loadOnlineDoctors = async (date = "") => {
    try {
      setLoading(true);
      const res = await getDoctors(date);
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
              <p>Discover medical officers currently online and consult instantly.</p>
            </div>
            <div className="banner-icon-bg">
              <RiSignalTowerLine />
            </div>
          </div>

          <div className="dashboard-discovery-section">
            <div className="section-header-row">
              <h2 className="section-title">Online Attending Doctors</h2>
              <span className="live-count-badge">🟢 {doctors.length} Active Now</span>
            </div>

            {/* Date filter picker */}
            <div className="patient-dashboard-filter-card glass-panel" style={{ padding: '16px', marginBottom: '24px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(30, 41, 59, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label htmlFor="filter-date" style={{ fontSize: '0.92rem', fontWeight: '700', color: '#cbd5e1' }}>Check Doctor Availability by Date</label>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Select a date to filter doctors and view their available consultation slots.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="date"
                    id="filter-date"
                    min={getTodayString()}
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#f3f4f6', padding: '10px 14px', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
                  />
                  {filterDate && (
                    <button
                      onClick={() => setFilterDate("")}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 16px', borderRadius: '10px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {doctors.length === 0 ? (
              <div className="empty-doctors-state glass-panel">
                <RiHeartPulseLine className="pulse-icon-empty" />
                <h3>No Doctors Available</h3>
                <p>{filterDate ? "No doctors have available slots on the selected date. Try another date." : "No active physicians are registered as online. Please wait or check back shortly."}</p>
              </div>
            ) : (
              <div className="doctors-discovery-grid">
                {doctors.map((doc) => {
                  const distance = getStableDistance(doc._id);
                  return (
                    <div key={doc._id} className="patient-doctor-card glass-panel animate-slide">
                      <div className="doctor-avatar-box">👨‍⚕️</div>
                      <div className="doctor-card-content">
                        <span className="card-avail-badge">🟢 Available</span>
                        <h3>{doc.fullName}</h3>
                        <p className="card-spec-text">{doc.specialization || "General Medicine"}</p>
                        
                        <div className="card-ratings">
                          <RiStarFill className="star-icon" />
                          <span>{doc.rating ? doc.rating.toFixed(1) : "4.8"}</span>
                        </div>

                        <div className="card-meta-line border-top">
                          <span>📍 {doc.location || "Ghaziabad"}</span>
                          <span>📏 {distance} km away</span>
                        </div>

                        <div className="card-meta-line" style={{ marginTop: "4px" }}>
                          <span>💼 {doc.experience || 5} years experience</span>
                          <span className="card-fee">₹{doc.consultationFee || 299}</span>
                        </div>

                        {filterDate && doc.availableSlotsToday && doc.availableSlotsToday.length > 0 && (
                          <div className="card-slots-section border-top" style={{ padding: '12px 0 0 0', marginTop: '12px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Available Slots:</span>
                            <div className="dashboard-card-slots-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {doc.availableSlotsToday.map((slot) => (
                                <button
                                  key={slot}
                                  onClick={() => {
                                    setSelectedDoctor(doc);
                                    setBookingInitialDate(filterDate);
                                    setBookingInitialTime(slot);
                                    setShowBookingModal(true);
                                  }}
                                  style={{ background: 'rgba(45, 212, 191, 0.1)', border: '1px solid rgba(45, 212, 191, 0.2)', color: '#2dd4bf', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                  {slot}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

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
                              setBookingInitialDate(filterDate);
                              setBookingInitialTime("");
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
            setBookingInitialDate(filterDate);
            setBookingInitialTime("");
            setShowBookingModal(true);
          }}
        />
      )}

       {showBookingModal && selectedDoctor && (
        <BookingModal
          doctor={selectedDoctor}
          initialDate={bookingInitialDate}
          initialTime={bookingInitialTime}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedDoctor(null);
            setBookingInitialDate("");
            setBookingInitialTime("");
            loadOnlineDoctors(filterDate);
          }}
        />
      )}

      <AIChatbot />
    </div>
  );
}
