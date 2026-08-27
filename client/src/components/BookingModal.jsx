import { useState, useEffect, useRef } from "react";
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

export default function BookingModal({ doctor, onClose, initialDate = "", initialTime = "" }) {
  const navigate = useNavigate();
  const [step, setStep] = useState("select"); // "select", "symptoms", "success"
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [appointment, setAppointment] = useState(null);
  
  // Request states
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [symptoms, setSymptoms] = useState([]);
  const [medicalNote, setMedicalNote] = useState("");

  // AI Intake Chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInputText, setChatInputText] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  const intakeQuestions = [
    "What symptoms are you experiencing?",
    "Since when (duration) have you been feeling this way?",
    "Do you have any previous medical history (chronic conditions, allergies, or past surgeries)?",
    "Are you currently taking any daily medicines or treatments?"
  ];

  // Auto-scroll chat area
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
    }
  }, [chatMessages, isAiTyping]);

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
      // Only reset selected slot if we changed the date from the initial pre-filled date
      if (selectedDate !== initialDate) {
        setSelectedTime("");
      }
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
    if (chatMessages.length === 0) {
      setIsAiTyping(true);
      setTimeout(() => {
        setChatMessages([
          {
            sender: "ai",
            text: `Hello! I am your MediCare AI Intake Assistant. To help Dr. ${doctor.fullName} prepare for your virtual consultation, please answer a few quick questions.\n\nFirst: ${intakeQuestions[0]}`,
            timestamp: new Date()
          }
        ]);
        setIsAiTyping(false);
      }, 800);
    }
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;

    const patientMsg = {
      sender: "patient",
      text: chatInputText.trim(),
      timestamp: new Date()
    };

    setChatMessages((prev) => [...prev, patientMsg]);
    setChatInputText("");
    setIsAiTyping(true);

    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);

    setTimeout(() => {
      if (nextIndex < intakeQuestions.length) {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: intakeQuestions[nextIndex],
            timestamp: new Date()
          }
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: "Thank you! I have successfully processed your intake data. Please click 'Send Appointment Request' below to submit this summary to Dr. " + doctor.fullName + ".",
            timestamp: new Date()
          }
        ]);
        setQuestionIndex(-1); // Conversation complete
      }
      setIsAiTyping(false);
    }, 1000);
  };

  const handleSendRequest = async () => {
    try {
      setPaymentLoading(true);
      const res = await createAppointment({
        doctor: doctor._id,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        symptoms: [],
        medicalNote: "",
        aiChatHistory: chatMessages,
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
              <div className="chat-badge-info">
                🤖 <strong>MediCare AI Triage Intake</strong> is evaluating your concerns. Please answer the questions below.
              </div>
              
              <div className="intake-chat-container">
                <div className="intake-chat-messages" ref={chatEndRef}>
                  {chatMessages.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.sender}`}>
                      {msg.text.split("\n").map((line, lIdx) => (
                        <p key={lIdx} style={{ margin: "4px 0" }}>{line}</p>
                      ))}
                    </div>
                  ))}
                  {isAiTyping && (
                    <div className="chat-message typing">
                      <span>●</span><span>●</span><span>●</span> AI is typing...
                    </div>
                  )}
                </div>

                {questionIndex !== -1 ? (
                  <form onSubmit={handleSendChatMessage} className="intake-chat-input-area">
                    <input
                      type="text"
                      className="intake-chat-input"
                      placeholder="Type your response here..."
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      disabled={isAiTyping}
                    />
                    <button
                      type="submit"
                      className="btn-chat-send"
                      disabled={isAiTyping || !chatInputText.trim()}
                    >
                      Send
                    </button>
                  </form>
                ) : null}
              </div>

              <div className="payment-actions" style={{ marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={handleSendRequest}
                  className="btn-primary-custom btn-booking-action"
                  disabled={paymentLoading || questionIndex !== -1}
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
                  onClick={() => {
                    setStep("select");
                    setChatMessages([]);
                    setQuestionIndex(0);
                  }}
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
