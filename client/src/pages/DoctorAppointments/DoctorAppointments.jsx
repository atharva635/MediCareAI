import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { getDoctorAppointments, completeAppointment, cancelAppointment, acceptAppointment, rejectAppointment, deleteAppointment } from "../../services/appointmentService";
import { toast } from "react-hot-toast";
import { RiCalendarEventLine, RiTimeLine, RiMoneyRupeeCircleLine, RiDiscussLine, RiCheckboxCircleLine, RiCloseCircleLine } from "react-icons/ri";
import "./DoctorAppointments.css";

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

export default function DoctorAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("new"); // 'new', 'paid', 'upcoming', 'attention', 'history'
  const [expandedIntakeId, setExpandedIntakeId] = useState(null);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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
      const res = await getDoctorAppointments();
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error("Failed to load doctor appointments:", err);
      toast.error("Failed to retrieve patient bookings.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      await acceptAppointment(id);
      toast.success("Appointment request accepted successfully ✅");
      loadAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to accept appointment.");
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Enter reason for rejection:");
    if (reason === null) return;
    try {
      await rejectAppointment(id, { rejectionReason: reason });
      toast.success("Appointment request rejected ❌");
      loadAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject appointment.");
    }
  };

  const handleStartConsultation = (appt) => {
    navigate(`/consultation/${appt._id}`);
  };

  const handleComplete = async (id) => {
    try {
      await completeAppointment(id);
      toast.success("Appointment completed successfully ✅");
      loadAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete appointment.");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await cancelAppointment(id);
      toast.success("Booking cancelled successfully ✅");
      loadAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel booking.");
    }
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

  const newRequests = appointments.filter(appt => {
    if (appt.doctorDecision !== "pending" || appt.appointmentStatus === "cancelled") return false;
    return !isAppointmentExpired(appt);
  });

  const paidScheduled = appointments.filter(appt => {
    if (appt.doctorDecision !== "accepted" || appt.appointmentStatus !== "confirmed" || appt.paymentStatus !== "paid") return false;
    const start = parseAppointmentDateTime(appt.appointmentDate, appt.appointmentTime);
    if (!start) return false;
    const isToday = start.toDateString() === currentTime.toDateString();
    return isToday && !isAppointmentExpired(appt);
  });

  const upcomingAppointments = appointments.filter(appt => {
    if (appt.doctorDecision !== "accepted" || appt.appointmentStatus !== "confirmed" || appt.paymentStatus !== "paid") return false;
    const start = parseAppointmentDateTime(appt.appointmentDate, appt.appointmentTime);
    if (!start) return false;
    const isToday = start.toDateString() === currentTime.toDateString();
    return start > currentTime && !isToday;
  });

  const attentionAppointments = appointments.filter(appt => {
    if (appt.doctorDecision !== "accepted" || appt.paymentStatus !== "pending" || appt.appointmentStatus === "cancelled") return false;
    return !isAppointmentExpired(appt);
  });

  const historyAppointments = appointments.filter(appt => {
    if (appt.appointmentStatus === "completed" || appt.appointmentStatus === "cancelled" || appt.doctorDecision === "rejected") {
      return true;
    }
    return isAppointmentExpired(appt);
  });

  let displayedAppointments = [];
  if (activeTab === "new") displayedAppointments = newRequests;
  else if (activeTab === "paid") displayedAppointments = paidScheduled;
  else if (activeTab === "upcoming") displayedAppointments = upcomingAppointments;
  else if (activeTab === "attention") displayedAppointments = attentionAppointments;
  else if (activeTab === "history") displayedAppointments = historyAppointments;

  return (
    <div className="doctor-appointments-layout">
      <Sidebar />

      <div className="doctor-appointments-main-area">
        <Navbar />

        <div className="doctor-appointments-content">
          <div className="doctor-appointments-banner glass-panel">
            <h1>Patient Bookings</h1>
            <p>View your scheduled slots, start consultation channels, and manage completed sessions.</p>
          </div>

          <div className="doctor-appointments-tabs" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
            <button
              onClick={() => setActiveTab("new")}
              className={`tab-btn ${activeTab === "new" ? "active" : ""}`}
            >
              New Requests ({newRequests.length})
            </button>
            <button
              onClick={() => setActiveTab("paid")}
              className={`tab-btn ${activeTab === "paid" ? "active" : ""}`}
            >
              Paid & Scheduled ({paidScheduled.length})
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`tab-btn ${activeTab === "upcoming" ? "active" : ""}`}
            >
              Upcoming ({upcomingAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab("attention")}
              className={`tab-btn ${activeTab === "attention" ? "active" : ""}`}
            >
              Needs Attention ({attentionAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
            >
              History ({historyAppointments.length})
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Retrieving bookings...</div>
          ) : displayedAppointments.length === 0 ? (
            <div className="empty-state glass-panel">
              <RiCalendarEventLine style={{ fontSize: "3rem", color: "#475569", marginBottom: "12px" }} />
              <h3>No Bookings</h3>
              <p>You do not have any patient sessions in the "{activeTab.toUpperCase()}" category at the moment.</p>
            </div>
          ) : (
            <div className="doctor-appointments-grid">
              {displayedAppointments.map((appt) => (
                <div key={appt._id} className="doctor-appointment-card glass-panel animate-slide">
                  <div className="card-header-patient">
                    <div className="patient-icon-avatar">👤</div>
                    <div className="patient-meta-names">
                      <h3>{appt.patient?.fullName || "Patient Access"}</h3>
                      <p>{appt.patient?.email || "patient@medicare.ai"}</p>
                    </div>
                  </div>

                  <div className="card-schedule-info border-top">
                    <div className="schedule-row">
                      <RiCalendarEventLine className="sched-icon" />
                      <span>{appt.appointmentDate}</span>
                    </div>
                    <div className="schedule-row">
                      <RiTimeLine className="sched-icon" />
                      <span>{appt.appointmentTime}</span>
                    </div>
                  </div>

                  {appt.aiIntake && (
                    <div className="appt-ai-intake-report border-top" style={{ padding: "12px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#38bdf8" }}>🤖 AI Intake Report</span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <span className={`status-badge severity-${appt.aiIntake.severity?.toLowerCase()}`} style={{ fontSize: "0.75rem" }}>{appt.aiIntake.severity}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#e2e8f0", marginBottom: "6px" }}>
                        <strong>Chief Complaint:</strong> {appt.aiIntake.chiefComplaint}
                      </div>
                      {appt.aiIntake.chatHistory && appt.aiIntake.chatHistory.length > 0 && (
                        <div>
                          <button onClick={() => setExpandedIntakeId(expandedIntakeId === appt._id ? null : appt._id)} style={{ background: "none", border: "none", color: "#38bdf8", fontSize: "0.8rem", cursor: "pointer", fontWeight: "600" }}>
                            {expandedIntakeId === appt._id ? "Hide Chat Log ▲" : "View Chat Log ▼"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="card-payment-fee-status border-top" style={{ paddingTop: "12px" }}>
                    <div className="fee-display">
                      <RiMoneyRupeeCircleLine style={{ verticalAlign: "middle", marginRight: "4px" }} />
                      ₹{appt.amount}
                    </div>
                  </div>

                  {activeTab === "new" && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "14px", display: "flex", gap: "10px", width: "100%" }}>
                      <button onClick={() => handleAccept(appt._id)} className="btn-accept-request" style={{ flex: 1 }}>Accept Request</button>
                      <button onClick={() => handleReject(appt._id)} className="btn-reject-request" style={{ flex: 1 }}>Reject</button>
                    </div>
                  )}

                  {activeTab === "paid" && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "14px", display: "flex", gap: "10px", width: "100%" }}>
                      <button onClick={() => handleStartConsultation(appt)} className="btn-start-consult" style={{ flex: 1 }}><RiDiscussLine /> Start Consult</button>
                      <button onClick={() => handleComplete(appt._id)} className="btn-complete-appt" style={{ flex: 1 }}>Complete</button>
                    </div>
                  )}

                  {activeTab === "upcoming" && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "14px", display: "flex", flexDirection: "column", width: "100%" }}>
                      <span style={{ fontSize: "0.85rem", color: "#38bdf8", fontWeight: "600", marginBottom: "6px", textAlign: "center" }}>📅 Confirmed for Future Date</span>
                      <button disabled className="btn-start-consult" style={{ opacity: 0.5, cursor: "not-allowed", width: "100%", justifyContent: "center" }}>Consultation Room Locked</button>
                    </div>
                  )}

                  {activeTab === "attention" && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "14px", display: "flex", flexDirection: "column", width: "100%" }}>
                      <span style={{ fontSize: "0.85rem", color: "#f59e0b", fontStyle: "italic", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}>⏳ Accepted, Waiting for Patient Payment</span>
                      <button onClick={() => handleCancel(appt._id)} className="btn-cancel-appt" style={{ marginTop: "10px", width: "100%" }}>Cancel Slot</button>
                    </div>
                  )}

                  {activeTab === "history" && appt.appointmentStatus === "completed" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                      <div className="card-actions-row border-top" style={{ paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}><RiCheckboxCircleLine /> Session Completed</span>
                        <button onClick={() => setExpandedReportId(expandedReportId === appt._id ? null : appt._id)} className="btn-table-view" style={{ padding: "4px 8px", fontSize: "0.78rem" }}>{expandedReportId === appt._id ? "Hide Report ▲" : "View Clinical Report ▼"}</button>
                      </div>
                      {expandedReportId === appt._id && (
                        <div className="clinical-report-card glass-panel" style={{ padding: "12px", background: "rgba(15, 23, 42, 0.3)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)", fontSize: "0.82rem" }}>
                          <h4 style={{ margin: "0 0 8px 0", color: "#38bdf8" }}>🩺 Attending Doctor Triage Report</h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div><strong style={{ color: "#94a3b8" }}>Chief Complaint:</strong><p style={{ margin: "2px 0 0 0", color: "#cbd5e1" }}>{appt.aiIntake?.chiefComplaint || "Not specified."}</p></div>
                            <div><strong style={{ color: "#94a3b8" }}>AI Summary:</strong><p style={{ margin: "2px 0 0 0", color: "#cbd5e1" }}>{appt.aiIntake?.summary || "No AI summary available."}</p></div>
                            <div><strong style={{ color: "#94a3b8" }}>Prescribed Medications:</strong><p style={{ margin: "2px 0 0 0", color: "#34d399", fontWeight: "600" }}>{appt.prescriptions || "No prescriptions logged."}</p></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "history" && appt.appointmentStatus === "cancelled" && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "10px", display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
                      <span style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}><RiCloseCircleLine /> {appt.doctorDecision === "rejected" ? "Request Rejected" : "Session Cancelled"}</span>
                    </div>
                  )}

                  {activeTab === "history" && (appt.appointmentStatus === "expired" || isAppointmentExpired(appt)) && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "10px", display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
                      <span style={{ fontSize: "0.85rem", color: "#f59e0b", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}><RiTimeLine /> Consultation Expired</span>
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>This appointment was not attended within the scheduled time.</p>
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
