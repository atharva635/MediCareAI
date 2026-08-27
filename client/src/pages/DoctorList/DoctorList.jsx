import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDoctors } from "../../services/authService";
import { bookDoctor } from "../../services/patientService";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import Loader from "../../components/Loader";
import { toast } from "react-hot-toast";
import { RiStarFill, RiMapPinLine, RiMoneyRupeeCircleLine, RiCheckDoubleLine, RiHeartPulseLine } from "react-icons/ri";
import "./DoctorList.css";

export default function DoctorList() {
  const { triageId } = useParams();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      const res = await getDoctors();
      setDoctors(res.data.doctors || []);
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
      toast.error("Failed to load doctor database.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedDoctor) return;

    try {
      setPaymentLoading(true);
      const res = await bookDoctor(triageId, {
        doctorId: selectedDoctor._id,
        consultationFee: selectedDoctor.consultationFee,
      });

      toast.success("Payment Successful! Consultation Confirmed ✅");
      setSelectedDoctor(null);

      // Redirect directly to the online consultation workspace
      navigate(`/consultation/${triageId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment process failed.");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="doctorlist-layout">
      <Sidebar />

      <div className="doctorlist-main-area">
        <Navbar />

        <div className="doctorlist-content">
          <div className="doctorlist-welcome-banner glass-panel">
            <h1>Select Consultation Clinician</h1>
            <p>Select from available general practitioners and specialists ready to consult now.</p>
          </div>

          <div className="doctors-grid">
            {doctors.length === 0 ? (
              <div className="no-doctors-card glass-panel">
                <h3>No Doctors Available</h3>
                <p>No active doctors are registered in the system right now. Please create a doctor account first.</p>
              </div>
            ) : (
              doctors.map((doc) => (
                <div key={doc._id} className="doctor-card glass-panel">
                  <div className="doc-avatar-large">
                    👨‍⚕️
                  </div>
                  <div className="doc-meta">
                    <span className="doc-specialty">{doc.specialty}</span>
                    <h3>{doc.fullName}</h3>
                    
                    <div className="doc-stats">
                      <span className="doc-stat-item rating">
                        <RiStarFill /> {doc.rating}
                      </span>
                      <span className="doc-stat-item">
                        <RiMapPinLine /> {doc.distance} km
                      </span>
                    </div>

                    <div className="doc-fee">
                      <RiMoneyRupeeCircleLine /> ₹{doc.consultationFee} consultation
                    </div>

                    <div className="doc-status-indicator">
                      <span className="availability-dot"></span> AVAILABLE NOW
                    </div>

                    <button
                      onClick={() => setSelectedDoctor(doc)}
                      className="btn-primary-custom btn-doc-consult"
                    >
                      Book Consultation
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mock Payment Modal */}
      {selectedDoctor && (
        <div className="modal-overlay">
          <div className="modal-container payment-modal glass-panel">
            <div className="modal-header">
              <div className="modal-header-title">
                <RiHeartPulseLine className="logo-pulse-icon" style={{ color: "#2dd4bf" }} />
                <h3>Secure Consultation Booking</h3>
              </div>
            </div>

            <div className="modal-body payment-body">
              <div className="booking-summary glass-panel">
                <h4>Doctor Consultation Booking</h4>
                <p className="summary-doc-name">{selectedDoctor.fullName}</p>
                <p className="summary-doc-spec">{selectedDoctor.specialty}</p>
                
                <div className="fee-breakdown border-top">
                  <div className="fee-line">
                    <span>Consultation Fee</span>
                    <span>₹{selectedDoctor.consultationFee}</span>
                  </div>
                  <div className="fee-line total">
                    <span>Amount Payable</span>
                    <span>₹{selectedDoctor.consultationFee}</span>
                  </div>
                </div>
              </div>

              <div className="payment-alert-text">
                <p>
                  ℹ️ This is a secure mock billing gateway for your college presentation. 
                  No real money will be charged from your account.
                </p>
              </div>

              <div className="payment-action-buttons">
                <button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="btn-primary-custom btn-confirm-pay"
                >
                  {paymentLoading ? "Confirming Booking..." : `Pay ₹${selectedDoctor.consultationFee} & Start Consult`}
                </button>
                <button
                  onClick={() => setSelectedDoctor(null)}
                  disabled={paymentLoading}
                  className="btn-modal-close"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
