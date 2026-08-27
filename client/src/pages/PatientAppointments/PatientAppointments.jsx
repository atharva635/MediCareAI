import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { getPatientAppointments, cancelAppointment, payAppointment } from "../../services/appointmentService";
import { createRazorpayOrder, verifyRazorpayPayment } from "../../services/paymentService";
import { toast } from "react-hot-toast";
import { RiCalendarEventLine, RiTimeLine, RiMoneyRupeeCircleLine, RiCheckboxCircleLine, RiDiscussLine, RiCloseCircleLine, RiShieldFlashLine, RiHeartPulseLine } from "react-icons/ri";
import "./PatientAppointments.css";
import "../../components/BookingModal.css";

export default function PatientAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming"); // 'upcoming' or 'past'
  const [currentTime, setCurrentTime] = useState(new Date());

  // Payment states
  const { user } = useSelector((state) => state.auth);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await getPatientAppointments();
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error("Failed to load patient appointments:", err);
      toast.error("Failed to retrieve your appointments.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment request?")) return;

    try {
      await cancelAppointment(id);
      toast.success("Appointment cancelled successfully ✅");
      loadAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel appointment.");
    }
  };

  const handlePayment = async (appt) => {
    if (paymentLoading) return;
    try {
      setPaymentLoading(true);
      toast.loading("Preparing payment window...", { id: "payment" });
      
      // 1. Create Razorpay order on backend
      const orderRes = await createRazorpayOrder(appt._id);
      const data = orderRes.data;

      if (!data.success) {
        toast.error(data.message || "Failed to initiate payment.", { id: "payment" });
        return;
      }

      // 2. Setup Razorpay Checkout options (restricting to UPI/QR)
      const options = {
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "MediCare AI",
        description: `Consultation with Dr. ${appt.doctor?.fullName || "Specialist"}`,
        order_id: data.order.id,
        handler: async function (paymentResponse) {
          try {
            toast.loading("Verifying transaction...", { id: "payment" });
            
            // 3. Verify Payment on Backend
            const verifyRes = await verifyRazorpayPayment({
              appointmentId: appt._id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });

            if (verifyRes.data.success) {
              toast.success("Payment Successful! Slot Confirmed 🎉", { id: "payment" });
              loadAppointments();
            } else {
              toast.error("Payment verification failed.", { id: "payment" });
            }
          } catch (error) {
            console.error("Verification error:", error);
            toast.error(error.response?.data?.message || "Verification failed.", { id: "payment" });
          }
        },
        prefill: {
          name: user?.fullName || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#2dd4bf",
        },
      };

      toast.dismiss("payment");
      const rzp = new window.Razorpay(options);
      
      rzp.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        toast.error("Payment failed: " + response.error.description);
      });

      rzp.open();
    } catch (error) {
      console.error("Payment init error:", error);
      toast.dismiss("payment");
      toast.error(error.response?.data?.message || "Something went wrong initializing payment.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleMockPayment = async (appt) => {
    if (paymentLoading) return;
    try {
      setPaymentLoading(true);
      toast.loading("Simulating payment...", { id: "payment" });
      const res = await payAppointment(appt._id);
      if (res.data.success) {
        toast.success("Payment Successful (Demo)! Slot Confirmed 🎉", { id: "payment" });
        loadAppointments();
      } else {
        toast.error(res.data.message || "Failed to process mock payment.", { id: "payment" });
      }
    } catch (error) {
      console.error("Mock payment error:", error);
      toast.error(error.response?.data?.message || "Mock payment failed.", { id: "payment" });
    } finally {
      toast.dismiss("payment");
      setPaymentLoading(false);
    }
  };

  const handleJoin = (appt) => {
    // Navigate directly to consultation space
    navigate(`/consultation/${appt._id}`);
  };

  const formatAppointmentDate = (date) => {
    if (!date) return "N/A";

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isAppointmentPast = (appt) => {
    if (!appt.appointmentDate || !appt.appointmentTime) return false;

    const [time, modifier] = appt.appointmentTime.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours !== 12) {
      hours += 12;
    }
    if (modifier === "AM" && hours === 12) {
      hours = 0;
    }

    const appointmentDateTime = new Date(`${appt.appointmentDate}T00:00:00`);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    return appointmentDateTime <= currentTime;
  };

  // Filter appointments
  const upcomingAppointments = appointments.filter((appt) =>
    (appt.appointmentStatus === "pending" ||
      appt.appointmentStatus === "confirmed") &&
    appt.doctorDecision !== "rejected"
  );

  const pastAppointments = appointments.filter((appt) =>
    appt.appointmentStatus === "completed" ||
    appt.appointmentStatus === "cancelled" ||
    appt.doctorDecision === "rejected"
  );

  const displayedAppointments = activeTab === "upcoming" ? upcomingAppointments : pastAppointments;

  return (
    <div className="appointments-layout">
      <Sidebar />

      <div className="appointments-main-area">
        <Navbar />

        <div className="appointments-content">
          <div className="appointments-banner glass-panel">
            <h1>My Consultations</h1>
            <p>Track your upcoming doctor appointments, payments, and join clinical chats.</p>
          </div>

          <div className="appointments-tabs">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`tab-btn ${activeTab === "upcoming" ? "active" : ""}`}
            >
              Upcoming ({upcomingAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab("past")}
              className={`tab-btn ${activeTab === "past" ? "active" : ""}`}
            >
              Consultation History ({pastAppointments.length})
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading appointments...</div>
          ) : displayedAppointments.length === 0 ? (
            <div className="empty-state glass-panel">
              <RiCalendarEventLine style={{ fontSize: "3rem", color: "#475569", marginBottom: "12px" }} />
              <h3>No Appointments Found</h3>
              <p>You do not have any {activeTab} consultations scheduled at the moment.</p>
            </div>
          ) : (
            <div className="appointments-grid">
              {displayedAppointments.map((appt) => (
                <div key={appt._id} className="appointment-card glass-panel">
                  <div className="card-header-doc">
                    <div className="doc-icon-avatar">👨‍⚕️</div>
                    <div className="doc-meta-names">
                      <h3>{appt.doctor?.fullName || "Clinical Officer"}</h3>
                      <p>{appt.doctor?.specialization || "General Medicine"}</p>
                    </div>
                  </div>

                  <div className="card-schedule-info border-top">
                    <div className="schedule-row">
                      <RiCalendarEventLine className="sched-icon" />
                      <span>{formatAppointmentDate(appt.appointmentDate)}</span>
                    </div>
                    <div className="schedule-row">
                      <RiTimeLine className="sched-icon" />
                      <span>{appt.appointmentTime}</span>
                    </div>
                  </div>

                  {appt.symptoms && appt.symptoms.length > 0 && (
                    <div className="appt-symptoms-list border-top" style={{ padding: "10px 0" }}>
                      <strong style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Symptoms Selected:</strong>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                        {appt.symptoms.map(s => <span key={s} className="symptom-tag-small" style={{ fontSize: "0.72rem" }}>{s}</span>)}
                      </div>
                    </div>
                  )}

                  {appt.medicalNote && (
                    <div className="appt-note border-top" style={{ padding: "10px 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                      <strong>Your Note:</strong>
                      <p style={{ margin: "4px 0 0", color: "#cbd5e1" }}>"{appt.medicalNote}"</p>
                    </div>
                  )}

                  <div className="card-payment-fee-status border-top" style={{ paddingTop: "12px" }}>
                    <div className="fee-display">
                      <RiMoneyRupeeCircleLine style={{ verticalAlign: "middle", marginRight: "4px" }} />
                      ₹{appt.amount}
                    </div>

                    <div className="badges-group">
                      <span className={`status-badge ${appt.paymentStatus}`}>
                        {appt.paymentStatus === "paid" ? "✓ Paid" : "⚠ Unpaid"}
                      </span>
                      <span className={`status-badge ${appt.appointmentStatus}`}>
                        {appt.appointmentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row (only for upcoming tabs) */}
                  {activeTab === "upcoming" && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "14px", flexDirection: "column", gap: "10px", alignItems: "stretch" }}>
                      {appt.doctorDecision === "pending" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <span style={{ fontSize: "0.85rem", color: "#f59e0b", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                            ⏳ Waiting for Doctor
                          </span>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#94a3b8" }}>Your appointment request has been sent.</p>
                          <button
                            onClick={() => handleCancel(appt._id)}
                            className="btn-cancel-appt"
                            style={{ alignSelf: "flex-start", width: "auto" }}
                          >
                            Cancel Request
                          </button>
                        </div>
                      )}

                      {appt.doctorDecision === "accepted" && appt.paymentStatus === "pending" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                            ✅ Doctor Accepted
                          </span>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#94a3b8" }}>Please complete payment.</p>
                          
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <button
                              onClick={() => handlePayment(appt)}
                              className="btn-pay-now"
                              style={{ flex: 1, minWidth: "120px" }}
                              disabled={paymentLoading}
                            >
                              <RiShieldFlashLine style={{ marginRight: "4px" }} /> Pay ₹{appt.amount}
                            </button>
                            <button
                              onClick={() => handleMockPayment(appt)}
                              className="btn-pay-now"
                              style={{ flex: 1, minWidth: "120px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }}
                              disabled={paymentLoading}
                            >
                              <RiShieldFlashLine style={{ marginRight: "4px" }} /> Mock Pay (Demo)
                            </button>
                            <button
                              onClick={() => handleCancel(appt._id)}
                              className="btn-cancel-appt"
                              style={{ minWidth: "80px" }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {appt.appointmentStatus === "confirmed" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                            ✅ Confirmed
                          </span>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#94a3b8" }}>Payment Successful.</p>
                          
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button
                              onClick={() => handleJoin(appt)}
                              className="btn-join-consult"
                              style={{ flex: 1 }}
                            >
                              <RiDiscussLine /> Join Consultation
                            </button>
                            <button
                              onClick={() => handleCancel(appt._id)}
                              className="btn-cancel-appt"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Past Tab display */}
                  {activeTab === "past" && appt.appointmentStatus === "completed" && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "10px", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                        <RiCheckboxCircleLine /> Session Completed
                      </span>
                    </div>
                  )}

                  {activeTab === "past" && appt.appointmentStatus === "cancelled" && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "10px", flexDirection: "column", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                        <RiCloseCircleLine /> {appt.doctorDecision === "rejected" ? "Request Rejected" : "Session Cancelled"}
                      </span>
                      {appt.doctorDecision === "rejected" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", marginTop: "6px" }}>
                          <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                            Doctor's reason: "{appt.rejectionReason || "Not specified"}"
                          </span>
                          <button
                            onClick={() => navigate("/patient/dashboard")}
                            className="btn-primary-custom"
                            style={{ alignSelf: "flex-start", padding: "6px 12px", fontSize: "0.8rem", width: "auto" }}
                          >
                            Find Another Doctor
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
                          Cancelled by Patient
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
