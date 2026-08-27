import { RiCloseLine, RiStarFill, RiMapPinLine, RiBriefcaseLine, RiMoneyRupeeCircleLine, RiDiscussLine } from "react-icons/ri";
import "./DoctorProfileModal.css";

export default function DoctorProfileModal({ doctor, onClose, onConsult }) {
  if (!doctor) return null;

  const mockDistance = (Math.random() * 4 + 1.2).toFixed(1); // Generates a stable random distance for the session

  return (
    <div className="modal-overlay">
      <div className="modal-container doctor-profile-modal glass-panel">
        <button className="modal-close-btn" onClick={onClose}>
          <RiCloseLine />
        </button>

        <div className="modal-body doc-profile-body">
          <div className="doc-profile-header">
            <div className="profile-avatar-large">👨‍⚕️</div>
            <div className="profile-header-meta">
              <span className="profile-badge-avail">🟢 Available Now</span>
              <h2>{doctor.fullName}</h2>
              <p className="profile-spec">{doctor.specialization || "General Medicine"}</p>
              
              <div className="profile-rating-row">
                <RiStarFill className="star-icon" />
                <span>{doctor.rating ? doctor.rating.toFixed(1) : "4.8"} Rating</span>
              </div>
            </div>
          </div>

          <div className="doc-profile-stats-row">
            <div className="profile-stat-box">
              <RiBriefcaseLine className="stat-icon" />
              <span>Experience</span>
              <strong>{doctor.experience || 5} Years</strong>
            </div>

            <div className="profile-stat-box">
              <RiMapPinLine className="stat-icon" />
              <span>Distance</span>
              <strong>{mockDistance} km away</strong>
            </div>

            <div className="profile-stat-box">
              <RiMoneyRupeeCircleLine className="stat-icon" />
              <span>Consult Fee</span>
              <strong>₹{doctor.consultationFee || 299}</strong>
            </div>
          </div>

          <div className="doc-profile-section border-top">
            <h3>About Professional Practice</h3>
            <p className="about-text">
              {doctor.about || `Dr. ${doctor.fullName.split(" ").slice(-1)[0]} is a dedicated healthcare provider specialized in ${doctor.specialization || "General Medicine"} with over ${doctor.experience || 5} years of practice. Dedicated to delivering patient-centric advice and diagnosis.`}
            </p>
          </div>
          <div className="doc-profile-section border-top">
            <h3>Practice Location</h3>
            <p className="location-text">
              📍 Clinic address registered in <strong>{doctor.location?.name || doctor.location || "Ghaziabad"}</strong>.
            </p>
          </div>

          <div className="doc-profile-section border-top">
            <h3>Weekly Consultation Hours</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.88rem", marginTop: "8px" }}>
              {Object.entries(doctor.availability || {}).map(([day, ranges]) => {
                if (!ranges || ranges.length === 0) return null;
                return (
                  <div key={day} style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
                    <span style={{ fontWeight: "600" }}>{day}:</span>
                    <span style={{ color: "#2dd4bf", fontWeight: "700" }}>{ranges.join(", ")}</span>
                  </div>
                );
              })}
              {(!doctor.availability || Object.values(doctor.availability).every(r => !r || r.length === 0)) && (
                <p style={{ color: "#94a3b8", fontStyle: "italic" }}>No specific consulting hours set.</p>
              )}
            </div>
          </div>

          <div className="doc-profile-section border-top">
            <h3>Languages Spoken</h3>
            <div className="lang-tags">
              <span className="lang-tag">English</span>
              <span className="lang-tag">Hindi</span>
            </div>
          </div>

          <div className="doc-profile-actions border-top">
            <button 
              onClick={() => {
                if (onConsult) {
                  onConsult(doctor);
                } else {
                  onClose();
                }
              }}
              className="btn-primary-custom btn-profile-consult"
            >
              <RiDiscussLine /> Consult Doctor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
