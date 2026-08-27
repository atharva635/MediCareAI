import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getDoctors } from "../../services/authService";
import { toast } from "react-hot-toast";
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

  const handleFindNearbyDoctors = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported by your browser.");
      return;
    }

    toast.loading("Fetching coordinates...", { id: "geoSearch" });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          toast.loading("Finding nearest doctors...", { id: "geoSearch" });
          const res = await getDoctors({ latitude, longitude });
          setDoctors(res.data.doctors || []);
          toast.success("Nearby doctors found! 📍", { id: "geoSearch" });
        } catch (error) {
          toast.error("Failed to load nearby doctors.", { id: "geoSearch" });
        }
      },
      (error) => {
        console.error(error);
        toast.error("Please allow location permission to find doctors nearby.", { id: "geoSearch" });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
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
              <p>Discover medical officers currently available and consult instantly.</p>
            </div>
            <div className="banner-icon-bg">
              <RiSignalTowerLine />
            </div>
          </div>

          <div className="dashboard-discovery-section">
            <div className="section-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <h2 className="section-title">Attending Doctors Available Now</h2>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={handleFindNearbyDoctors}
                  className="btn-primary-custom btn-location-trigger"
                  style={{ background: "rgba(45, 212, 191, 0.1)", color: "#2dd4bf", border: "1px solid rgba(45, 212, 191, 0.2)", padding: "6px 12px", fontSize: "0.85rem" }}
                >
                  📍 Find Doctors Near Me
                </button>
                <span className="live-count-badge">🟢 {doctors.length} Available Now</span>
              </div>
            </div>

            {doctors.length === 0 ? (
              <div className="empty-doctors-state glass-panel">
                <RiHeartPulseLine className="pulse-icon-empty" />
                <h3>No Doctors Currently Available</h3>
                <p>No physicians are currently available for consultation. Please wait or check back shortly.</p>
              </div>
            ) : (
              <div className="doctors-discovery-grid">
                {doctors.map((doc) => {
                  const distance = getStableDistance(doc._id);
                  return (
                    <div key={doc._id} className="patient-doctor-card glass-panel animate-slide">
                      <div className="doctor-avatar-box">👨‍⚕️</div>
                      <div className="doctor-card-content">
                        <span className="card-avail-badge">🟢 AVAILABLE NOW</span>
                        <h3>{doc.fullName}</h3>
                        <p className="card-spec-text">{doc.specialization || "General Medicine"}</p>
                        
                        <div className="card-ratings">
                          <RiStarFill className="star-icon" />
                          <span>{doc.rating ? doc.rating.toFixed(1) : "4.8"}</span>
                        </div>

                        <div className="card-meta-line border-top">
                          <span>📍 {doc.locationName || (typeof doc.location === "string" ? doc.location : "Ghaziabad")}</span>
                          <span>📏 {doc.distance !== undefined ? `${(doc.distance / 1000).toFixed(1)} km away` : `${distance} km away`}</span>
                        </div>

                        <div className="card-meta-line" style={{ marginTop: "4px" }}>
                          <span>💼 {doc.experience || 5} years experience</span>
                          <span className="card-fee">₹{doc.consultationFee || 299}</span>
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
