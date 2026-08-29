import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { getPatientAppointments, cancelAppointment, payAppointment, deleteAppointment } from "../../services/appointmentService";
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
  const [expandedReportId, setExpandedReportId] = useState(null);

  // Payment states
  const { user } = useSelector((state) => state.auth);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // 10 seconds for real-time responsiveness

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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this appointment record?")) return;
    try {
      await deleteAppointment(id);
      toast.success("Appointment record deleted successfully ✅");
      loadAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete record.");
    }
  };

  const formatAppointmentDate = (date) => {
    if (!date) return "N/A";

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const parseAppointmentDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours !== 12) {
      hours += 12;
    }
    if (modifier === "AM" && hours === 12) {
      hours = 0;
    }
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  const isReadyToJoin = (appt) => {
    if (appt.appointmentStatus !== "confirmed" || appt.paymentStatus !== "paid") return false;
    const start = parseAppointmentDateTime(appt.appointmentDate, appt.appointmentTime);
    if (!start) return false;
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const leadTime = new Date(start.getTime() - 10 * 60 * 1000); // 10 mins early
    return currentTime >= leadTime && currentTime <= end;
  };

  const isAppointmentExpired = (appt) => {
    if (appt.appointmentStatus === "completed" || appt.appointmentStatus === "cancelled") return false;
    if (appt.appointmentStatus === "expired") return true;

    // Check if slot has passed (start + 30 mins slot duration)
    const start = parseAppointmentDateTime(appt.appointmentDate, appt.appointmentTime);
    if (!start) return false;
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    return currentTime > end;
  };

  // Filter appointments
  const upcomingAppointments = appointments.filter((appt) => {
    if (appt.appointmentStatus !== "confirmed" || appt.paymentStatus !== "paid" || appt.doctorDecision !== "accepted") {
      return false;
    }
    return !isAppointmentExpired(appt);
  });

  const pendingAppointments = appointments.filter((appt) => {
    if (appt.appointmentStatus === "cancelled" || appt.appointmentStatus === "completed" || appt.appointmentStatus === "expired" || appt.doctorDecision === "rejected") {
      return false;
    }
    if (isAppointmentExpired(appt)) return false;
    return appt.doctorDecision === "pending" || appt.paymentStatus === "pending" || appt.appointmentStatus === "pending";
  });

  const historyAppointments = appointments.filter((appt) => {
    if (appt.appointmentStatus === "completed" || appt.appointmentStatus === "cancelled" || appt.doctorDecision === "rejected") {
      return true;
    }
    return isAppointmentExpired(appt);
  });

  const displayedAppointments =
    activeTab === "upcoming" ? upcomingAppointments :
    activeTab === "pending" ? pendingAppointments :
    historyAppointments;

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

          <div className="appointments-tabs" style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`tab-btn ${activeTab === "upcoming" ? "active" : ""}`}
            >
              Upcoming ({upcomingAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
            >
              Pending ({pendingAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
            >
              History ({historyAppointments.length})
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading appointments...</div>
          ) : displayedAppointments.length === 0 ? (
            <div className="empty-state glass-panel">
              <RiCalendarEventLine style={{ fontSize: "3rem", color: "#475569", marginBottom: "12px" }} />
              <h3>No Appointments Found</h3>
              <p>You do not have any consultations in the "{activeTab.toUpperCase()}" category at the moment.</p>
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
                      {isReadyToJoin(appt) ? (
                        <span className="status-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", animation: "pulse 2s infinite ease-in-out", fontWeight: "700" }}>
                          🟢 CONSULTATION NOW
                        </span>
                      ) : isAppointmentExpired(appt) ? (
                        <span className="status-badge expired" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
                          expired
                        </span>
                      ) : (
                        <span className={`status-badge ${appt.appointmentStatus}`}>
                          {appt.appointmentStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 📅 Upcoming Tab Actions */}
                  {activeTab === "upcoming" && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "14px", display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => handleJoin(appt)}
                        className="btn-join-consult"
                        style={{
                          flex: 1,
                          background: isReadyToJoin(appt) ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : undefined,
                          boxShadow: isReadyToJoin(appt) ? "0 4px 14px rgba(16, 185, 129, 0.4)" : undefined
                        }}
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
                  )}

                  {/* ⏳ Pending Tab Actions */}
                  {activeTab === "pending" && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "14px", flexDirection: "column", gap: "10px", display: "flex", width: "100%" }}>
                      {appt.doctorDecision === "pending" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <span style={{ fontSize: "0.85rem", color: "#f59e0b", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                            ⏳ Awaiting Doctor's Review
                          </span>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#94a3b8" }}>Your request is pending clinician approval.</p>
                          <button
                            onClick={() => handleCancel(appt._id)}
                            className="btn-cancel-appt"
                            style={{ alignSelf: "flex-start", width: "auto" }}
                          >
                            Cancel Request
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                            ✅ Doctor Accepted
                          </span>
                          <p style={{ margin: "0", fontSize: "0.8rem", color: "#94a3b8" }}>Please complete payment to confirm your booking slot.</p>
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
                    </div>
                  )}

                  {/* 📋 History Tab Actions */}
                  {activeTab === "history" && appt.appointmentStatus === "completed" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                      <div className="card-actions-row border-top" style={{ paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                          <RiCheckboxCircleLine /> Session Completed
                        </span>
                        <button
                          onClick={() => setExpandedReportId(expandedReportId === appt._id ? null : appt._id)}
                          className="btn-table-view"
                          style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                        >
                          {expandedReportId === appt._id ? "Hide Report ▲" : "View Clinical Report ▼"}
                        </button>
                      </div>
                      
                      {expandedReportId === appt._id && (
                        <div className="clinical-report-card glass-panel" style={{ padding: "12px", background: "rgba(15, 23, 42, 0.3)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)", fontSize: "0.82rem" }}>
                          <h4 style={{ margin: "0 0 8px 0", color: "#38bdf8", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "4px" }}>🩺 Clinical Report</h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div>
                              <strong style={{ color: "#94a3b8" }}>Observations:</strong>
                              <p style={{ margin: "2px 0 0 0", color: "#cbd5e1" }}>{appt.doctorNotes || "No notes logged by attending doctor."}</p>
                            </div>
                            <div style={{ marginTop: "4px" }}>
                              <strong style={{ color: "#94a3b8" }}>Prescriptions:</strong>
                              <p style={{ margin: "2px 0 0 0", color: "#34d399", fontWeight: "600" }}>{appt.prescriptions || "No prescriptions logged."}</p>
                            </div>
                            <div style={{ marginTop: "4px" }}>
                              <strong style={{ color: "#94a3b8" }}>Follow-up Advice:</strong>
                              <p style={{ margin: "2px 0 0 0", color: "#cbd5e1" }}>{appt.followUp || "None specified."}</p>
                            </div>
                            <div style={{ marginTop: "4px" }}>
                              <strong style={{ color: "#94a3b8" }}>Consultation Fee:</strong>
                              <p style={{ margin: "2px 0 0 0", color: "#38bdf8", fontWeight: "700" }}>₹{appt.amount} (Paid)</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "history" && appt.appointmentStatus === "cancelled" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                      <div className="card-actions-row border-top" style={{ paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                          <RiCloseCircleLine /> {appt.doctorDecision === "rejected" ? "Request Rejected" : "Session Cancelled"}
                        </span>
                      </div>
                      {appt.doctorDecision === "rejected" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                          <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                            Doctor's reason: "{appt.rejectionReason || "Not specified"}"
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                          Cancelled by Patient
                        </span>
                      )}
                    </div>
                  )}

                  {activeTab === "history" && (appt.appointmentStatus === "expired" || isAppointmentExpired(appt)) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                      <div className="card-actions-row border-top" style={{ paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.85rem", color: "#f59e0b", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                          <RiTimeLine /> Consultation Expired
                        </span>
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                        This appointment was not attended within the scheduled time.
                      </span>
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
