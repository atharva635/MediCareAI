import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { getDoctorAppointments, completeAppointment, cancelAppointment, acceptAppointment, rejectAppointment } from "../../services/appointmentService";
import { toast } from "react-hot-toast";
import { RiCalendarEventLine, RiTimeLine, RiMoneyRupeeCircleLine, RiDiscussLine, RiCheckboxCircleLine, RiCloseCircleLine } from "react-icons/ri";
import "./DoctorAppointments.css";

export default function DoctorAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming"); // 'upcoming' or 'past'
  const [expandedIntakeId, setExpandedIntakeId] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, []);

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

  const handleStartConsultation = (appt) => {
    // Navigate directly to consultation space
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

  // Filter appointments
  const upcomingAppointments = appointments.filter(appt =>
    ["pending", "confirmed"].includes(appt.appointmentStatus)
  );

  const pastAppointments = appointments.filter(appt =>
    ["completed", "cancelled"].includes(appt.appointmentStatus)
  );

  const displayedAppointments = activeTab === "upcoming" ? upcomingAppointments : pastAppointments;

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

          <div className="doctor-appointments-tabs">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`tab-btn ${activeTab === "upcoming" ? "active" : ""}`}
            >
              Scheduled consultations ({upcomingAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab("past")}
              className={`tab-btn ${activeTab === "past" ? "active" : ""}`}
            >
              Consultation History ({pastAppointments.length})
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Retrieving bookings...</div>
          ) : displayedAppointments.length === 0 ? (
            <div className="empty-state glass-panel">
              <RiCalendarEventLine style={{ fontSize: "3rem", color: "#475569", marginBottom: "12px" }} />
              <h3>No Bookings Scheduled</h3>
              <p>You do not have any {activeTab} patient sessions at the moment.</p>
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

                  {appt.aiIntake ? (
                    <div className="appt-ai-intake-report border-top" style={{ padding: "12px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#38bdf8" }}>🤖 AI Intake Report</span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <span className={`status-badge severity-${appt.aiIntake.severity?.toLowerCase()}`} style={{ fontSize: "0.75rem" }}>
                            {appt.aiIntake.severity} Severity
                          </span>
                          <span className={`status-badge risk-${appt.aiIntake.riskLevel?.toLowerCase()}`} style={{ fontSize: "0.75rem" }}>
                            {appt.aiIntake.riskLevel} Risk
                          </span>
                        </div>
                      </div>

                      <div style={{ fontSize: "0.85rem", color: "#e2e8f0", marginBottom: "6px" }}>
                        <strong>Chief Complaint:</strong> {appt.aiIntake.chiefComplaint}
                      </div>

                      {appt.aiIntake.summary && (
                        <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>
                          <strong>AI Summary:</strong> <span style={{ color: "#cbd5e1" }}>"{appt.aiIntake.summary}"</span>
                        </div>
                      )}

                      {(appt.aiIntake.history || appt.aiIntake.medications) && (
                        <div style={{ background: "rgba(15, 23, 42, 0.25)", padding: "8px", borderRadius: "6px", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "8px" }}>
                          {appt.aiIntake.history && <div><strong>History:</strong> {appt.aiIntake.history}</div>}
                          {appt.aiIntake.medications && <div><strong>Medications:</strong> {appt.aiIntake.medications}</div>}
                        </div>
                      )}

                      {appt.aiIntake.chatHistory && appt.aiIntake.chatHistory.length > 0 && (
                        <div>
                          <button
                            onClick={() => setExpandedIntakeId(expandedIntakeId === appt._id ? null : appt._id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#38bdf8",
                              fontSize: "0.8rem",
                              cursor: "pointer",
                              padding: 0,
                              fontWeight: "600",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            {expandedIntakeId === appt._id ? "Hide Chat Log ▲" : "View Pre-Intake Chat Log ▼"}
                          </button>
                          
                          {expandedIntakeId === appt._id && (
                            <div style={{
                              maxHeight: "180px",
                              overflowY: "auto",
                              background: "rgba(15, 23, 42, 0.4)",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              borderRadius: "8px",
                              padding: "10px",
                              marginTop: "8px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px"
                            }}>
                              {appt.aiIntake.chatHistory.map((chat, cIdx) => (
                                <div key={cIdx} style={{ fontSize: "0.78rem" }}>
                                  <strong style={{ color: chat.sender === "ai" ? "#38bdf8" : "#10b981" }}>
                                    {chat.sender === "ai" ? "AI Intake" : "Patient"}:
                                  </strong>
                                  <p style={{ margin: "2px 0 0", color: "#cbd5e1" }}>{chat.text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {appt.symptoms && appt.symptoms.length > 0 && (
                        <div className="appt-symptoms-list border-top" style={{ padding: "10px 0" }}>
                          <strong style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Symptoms:</strong>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                            {appt.symptoms.map(s => <span key={s} className="symptom-tag-small">{s}</span>)}
                          </div>
                        </div>
                      )}

                      {appt.medicalNote && (
                        <div className="appt-note border-top" style={{ padding: "10px 0", fontSize: "0.85rem", color: "#94a3b8" }}>
                          <strong>Medical Note:</strong>
                          <p style={{ margin: "4px 0 0", color: "#cbd5e1" }}>"{appt.medicalNote}"</p>
                        </div>
                      )}
                    </>
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
                      {appt.doctorDecision && (
                        <span className={`status-badge decision-${appt.doctorDecision}`}>
                          {appt.doctorDecision}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  {activeTab === "upcoming" && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "14px" }}>
                      {appt.doctorDecision === "pending" ? (
                        <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                          <button
                            onClick={() => handleAccept(appt._id)}
                            className="btn-accept-request"
                          >
                            Accept Request
                          </button>
                          <button
                            onClick={() => handleReject(appt._id)}
                            className="btn-reject-request"
                          >
                            Reject
                          </button>
                        </div>
                      ) : appt.appointmentStatus === "confirmed" ? (
                        <>
                          <button
                            onClick={() => handleStartConsultation(appt)}
                            className="btn-start-consult"
                          >
                            <RiDiscussLine /> Start Consult
                          </button>
                          <button
                            onClick={() => handleComplete(appt._id)}
                            className="btn-complete-appt"
                          >
                            Complete
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#f59e0b", fontStyle: "italic", alignSelf: "center", marginRight: "auto" }}>
                          Waiting for patient payment
                        </span>
                      )}

                      {appt.doctorDecision !== "pending" && (
                        <button
                          onClick={() => handleCancel(appt._id)}
                          className="btn-cancel-appt"
                          style={{ marginLeft: appt.appointmentStatus === "confirmed" ? "0" : "auto" }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}

                  {activeTab === "past" && appt.appointmentStatus === "completed" && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "10px", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                        <RiCheckboxCircleLine /> Session Completed
                      </span>
                    </div>
                  )}

                  {activeTab === "past" && appt.appointmentStatus === "cancelled" && (
                    <div className="card-actions-row border-top" style={{ paddingTop: "10px", flexDirection: "column", alignItems: "flex-end" }}>
                      <span style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                        <RiCloseCircleLine /> {appt.doctorDecision === "rejected" ? "Request Rejected" : "Session Cancelled"}
                      </span>
                      {appt.rejectionReason && (
                        <span style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
                          Reason: "{appt.rejectionReason}"
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
