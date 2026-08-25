import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { 
  RiCalendarEventLine, 
  RiTimeLine, 
  RiCloseLine, 
  RiMoneyRupeeCircleLine, 
  RiBankCardLine, 
  RiCheckboxCircleLine, 
  RiLoader5Line,
  RiShieldCheckLine
} from "react-icons/ri";
import { 
  getAvailableSlots, 
  createAppointment, 
  payAppointment 
} from "../services/appointmentService";
import "./BookingModal.css";

export default function BookingModal({ doctor, onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState("select"); // "select", "symptoms", "success"
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [appointment, setAppointment] = useState(null);
  
  // Request states
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [symptoms, setSymptoms] = useState([]);
  const [medicalNote, setMedicalNote] = useState("");

  // Get date range limits (Today to Today + 7 days)
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMaxDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch slots when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
      setSelectedTime(""); // Reset selected slot when date changes
    } else {
      setSlots([]);
    }
  }, [selectedDate]);

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      const res = await getAvailableSlots(doctor._id, selectedDate);
      if (res.data.success) {
        setSlots(res.data.availableSlots || []);
      } else {
        toast.error("Failed to load slots.");
      }
    } catch (err) {
      console.error("Error fetching slots:", err);
      toast.error(err.response?.data?.message || "Could not retrieve available slots.");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleProceedToSymptoms = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select both a date and a time slot.");
      return;
    }
    setStep("symptoms");
  };

  const handleToggleSymptom = (sym) => {
    if (symptoms.includes(sym)) {
      setSymptoms(symptoms.filter((s) => s !== sym));
    } else {
      setSymptoms([...symptoms, sym]);
    }
  };

  const handleSendRequest = async () => {
    try {
      setPaymentLoading(true);
      const res = await createAppointment({
        doctor: doctor._id,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        symptoms,
        medicalNote,
      });

      if (res.data.success) {
        setAppointment(res.data.appointment);
        toast.success("Appointment request sent successfully! 📅");
        setStep("success");
      } else {
        toast.error(res.data.message || "Failed to send request.");
      }
    } catch (err) {
      console.error("Booking error:", err);
      toast.error(err.response?.data?.message || "Failed to send request.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const baseFee = doctor.consultationFee || 100;
  const platformFee = 50;
  const totalAmount = baseFee + platformFee;

  return (
    <div className="booking-modal-overlay">
      <div className="booking-modal-container glass-panel animate-zoom">
        
        {/* Modal Header */}
        <div className="booking-modal-header">
          <div className="doctor-info-summary">
            <span className="booking-avatar">👨‍⚕️</span>
            <div>
              <h3>Book Appointment</h3>
              <p>Consultation with <strong>{doctor.fullName}</strong></p>
              <span className="spec-tag">{doctor.specialization || "General Medicine"}</span>
            </div>
          </div>
          {step !== "success" && (
            <button className="booking-close-btn" onClick={onClose}>
              <RiCloseLine />
            </button>
          )}
        </div>

        {/* Progress Bar (Visual only) */}
        <div className="booking-progress-bar">
          <div className={`progress-step ${step === "select" ? "active" : "completed"}`}>1. Slots</div>
          <div className={`progress-line ${step !== "select" ? "completed" : ""}`}></div>
          <div className={`progress-step ${step === "symptoms" ? "active" : step === "success" ? "completed" : ""}`}>2. Symptoms & Notes</div>
          <div className={`progress-line ${step === "success" ? "completed" : ""}`}></div>
          <div className={`progress-step ${step === "success" ? "active" : ""}`}>3. Request Sent</div>
        </div>

        {/* Modal Content */}
        <div className="booking-modal-body">
          
          {/* STEP 1: SELECT DATE & TIME SLOT */}
          {step === "select" && (
            <div className="step-select-layout">
              <div className="date-picker-section">
                <label className="booking-label">
                  <RiCalendarEventLine /> Choose Date
                </label>
                <input 
                  type="date"
                  className="booking-date-input"
                  min={getTodayString()}
                  max={getMaxDateString()}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div className="slots-section">
                <label className="booking-label">
                  <RiTimeLine /> Available Slots
                </label>

                {!selectedDate ? (
                  <div className="empty-slots-message">
                    Please select a date first to fetch the attending clinician's schedule.
                  </div>
                ) : loadingSlots ? (
                  <div className="slots-loader">
                    <RiLoader5Line className="spinner-icon" />
                    <span>Checking live availability...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="empty-slots-message warn">
                    No slots are currently available on this day. Please select another date.
                  </div>
                ) : (
                  <div className="slots-grid">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className={`slot-pill ${selectedTime === slot ? "selected" : ""}`}
                        onClick={() => setSelectedTime(slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing breakdown summary */}
              {selectedTime && (
                <div className="billing-summary-box glass-panel fade-in">
                  <h4>Billing & Consultation Summary</h4>
                  <div className="summary-item">
                    <span>Consultation Charge</span>
                    <span>₹{baseFee}</span>
                  </div>
                  <div className="summary-item">
                    <span>Platform & Care Fee</span>
                    <span>₹{platformFee}</span>
                  </div>
                  <div className="summary-item total">
                    <span>Total Amount Due</span>
                    <span>₹{totalAmount}</span>
                  </div>

                  <button
                    onClick={handleProceedToSymptoms}
                    className="btn-primary-custom btn-booking-action"
                    disabled={paymentLoading}
                  >
                    Next: Add Symptoms & Notes
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SYMPTOMS & NOTES */}
          {step === "symptoms" && (
            <div className="step-symptoms-layout fade-in">
              <div className="symptoms-selection-box glass-panel" style={{ padding: "18px" }}>
                <label className="booking-label">
                  What problems / symptoms are you facing?
                </label>
                <div className="symptoms-checkbox-grid">
                  {["Chest pain", "Fever", "Cough", "Breathing difficulty", "Headache"].map((sym) => {
                    const isChecked = symptoms.includes(sym);
                    return (
                      <button
                        type="button"
                        key={sym}
                        className={`symptom-checkbox-pill ${isChecked ? "selected" : ""}`}
                        onClick={() => handleToggleSymptom(sym)}
                      >
                        {isChecked ? "✓ " : "+ "} {sym}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="medical-note-box glass-panel" style={{ marginTop: "16px", padding: "18px" }}>
                <label className="booking-label">
                  Additional details or medical note:
                </label>
                <textarea
                  className="booking-textarea-input"
                  placeholder="e.g. Having fever since 2 days, mild chest pain during deep breath..."
                  rows="4"
                  value={medicalNote}
                  onChange={(e) => setMedicalNote(e.target.value)}
                />
              </div>

              <div className="payment-actions" style={{ marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={handleSendRequest}
                  className="btn-primary-custom btn-booking-action"
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <>
                      <RiLoader5Line className="spinner-icon" /> Sending Request...
                    </>
                  ) : (
                    "Send Appointment Request"
                  )}
                </button>
                
                <button
                  type="button"
                  className="btn-secondary-custom btn-booking-cancel"
                  onClick={() => setStep("select")}
                  disabled={paymentLoading}
                >
                  Back to Slots
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: BOOKING REQUEST SENT SUCCESS */}
          {step === "success" && (
            <div className="step-success-layout text-center fade-in">
              <div className="success-checkmark-wrapper">
                <RiCheckboxCircleLine className="success-big-icon" />
              </div>
              <h2>Request Sent Successfully!</h2>
              <p className="success-subtitle">Your appointment request is pending doctor's review and approval.</p>

              <div className="success-details-card glass-panel">
                <div className="detail-row">
                  <span>Assigned Doctor:</span>
                  <strong>{doctor.fullName}</strong>
                </div>
                <div className="detail-row">
                  <span>Specialization:</span>
                  <strong>{doctor.specialization || "General Medicine"}</strong>
                </div>
                <div className="detail-row">
                  <span>Requested Date:</span>
                  <strong>{selectedDate}</strong>
                </div>
                <div className="detail-row">
                  <span>Requested Slot:</span>
                  <strong>{selectedTime}</strong>
                </div>
                <div className="detail-row">
                  <span>Decision Status:</span>
                  <span className="room-badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>Pending Approval</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  navigate("/patient/appointments");
                }}
                className="btn-primary-custom btn-success-finish"
              >
                View My Appointments
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
