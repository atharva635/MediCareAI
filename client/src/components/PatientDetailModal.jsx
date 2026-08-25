import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getConsultants } from "../services/authService";
import { referPatient, addRecommendation } from "../services/patientService";
import { toast } from "react-hot-toast";
import { RiCloseLine, RiCalendarLine, RiUserLine, RiHeartLine, RiHistoryLine, RiStickyNoteLine, RiVerifiedBadgeLine } from "react-icons/ri";
import "./PatientDetailModal.css";

export default function PatientDetailModal({ patient, onClose, readOnly }) {
  if (!patient) return null;

  const { user } = useSelector((state) => state.auth);
  const [consultants, setConsultants] = useState([]);
  const [selectedConsultant, setSelectedConsultant] = useState("");
  const [referralReason, setReferralReason] = useState("");
  const [consultantNotes, setConsultantNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === "doctor" && !patient.referredTo) {
      const loadConsultants = async () => {
        try {
          const res = await getConsultants();
          setConsultants(res.data.consultants || []);
          if (res.data.consultants?.length > 0) {
            setSelectedConsultant(res.data.consultants[0]._id);
          }
        } catch (err) {
          console.error("Failed to load consultants:", err);
        }
      };
      loadConsultants();
    }
  }, [user, patient]);

  const handleRefer = async (e) => {
    e.preventDefault();
    if (!selectedConsultant) {
      toast.error("Please select a consultant");
      return;
    }
    try {
      setSubmitting(true);
      const res = await referPatient(patient._id, {
        consultantId: selectedConsultant,
        referralReason,
      });
      toast.success("Patient referred successfully! ✅");
      patient.referredTo = selectedConsultant;
      patient.referralReason = referralReason;
      patient.referralStatus = "Pending";
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to refer patient");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecommend = async (e) => {
    e.preventDefault();
    if (!consultantNotes.trim()) {
      toast.error("Please enter recommendation notes");
      return;
    }
    try {
      setSubmitting(true);
      const res = await addRecommendation(patient._id, {
        consultantNotes,
      });
      toast.success("Consultation advice submitted! ✅");
      patient.consultantNotes = consultantNotes;
      patient.referralStatus = "Reviewed";
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit recommendation");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = new Date(patient.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="modal-overlay">
      <div className="modal-container glass-panel">
        <div className="modal-header">
          <div className="modal-header-title">
            <span className="modal-avatar">
              {patient.name[0].toUpperCase()}
            </span>
            <div>
              <h3>{patient.name}</h3>
              <p>Registered: {formattedDate}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <RiCloseLine />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">
            <div className="modal-info-card">
              <RiUserLine className="info-card-icon" />
              <div>
                <span className="info-card-label">Basic Information</span>
                <p className="info-card-value">{patient.gender} • {patient.age} years old</p>
              </div>
            </div>

            <div className="modal-info-card">
              <RiHeartLine className="info-card-icon" />
              <div>
                <span className="info-card-label">Risk Assessment</span>
                <div>
                  <span className={`badge ${patient.riskLevel.toLowerCase()}`}>
                    {patient.riskLevel} Level
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">
              <RiStickyNoteLine />
              <span>Reported Symptoms</span>
            </div>
            <div className="symptoms-badges">
              {patient.symptoms.map((symptom, idx) => (
                <span key={idx} className="symptom-tag">
                  {symptom}
                </span>
              ))}
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">
              <RiHistoryLine />
              <span>Medical History & Notes</span>
            </div>
            <div className="notes-box">
              <p>{patient.medicalHistory || "No previous medical history recorded."}</p>
            </div>
          </div>

          {/* Referral & Recommendation Section */}
          {user?.role === "doctor" && (
            <div className="modal-section referral-wrapper border-top">
              <div className="modal-section-title">
                <RiVerifiedBadgeLine />
                <span>Specialist Consultation Referral</span>
              </div>
              {patient.referredTo ? (
                <div className="referral-details-box glass-panel">
                  <p><strong>Referral Status:</strong> <span className={`referral-status-label ${patient.referralStatus.toLowerCase()}`}>{patient.referralStatus}</span></p>
                  <p><strong>Reason for Referral:</strong> {patient.referralReason}</p>
                  {patient.consultantNotes ? (
                    <div className="recommendation-notes-box">
                      <p><strong>Consultant Recommendations:</strong></p>
                      <p className="recommendation-text">{patient.consultantNotes}</p>
                    </div>
                  ) : (
                    <p className="waiting-text-info">Waiting for specialist review...</p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleRefer} className="referral-form">
                  <div className="input-group-modal">
                    <label className="input-label-modal">Select Specialist Consultant</label>
                    <select
                      value={selectedConsultant}
                      onChange={(e) => setSelectedConsultant(e.target.value)}
                      required
                      className="form-input-custom"
                    >
                      {consultants.length === 0 ? (
                        <option value="">No specialists registered</option>
                      ) : (
                        consultants.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.fullName} ({c.email})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="input-group-modal">
                    <label className="input-label-modal">Reason for Referral</label>
                    <textarea
                      value={referralReason}
                      onChange={(e) => setReferralReason(e.target.value)}
                      placeholder="Explain symptoms, diagnostic history, or questions for the consultant..."
                      required
                      className="form-textarea-custom"
                      rows="3"
                    />
                  </div>
                  <button type="submit" disabled={submitting || consultants.length === 0} className="btn-primary-custom">
                    {submitting ? "Sending Referral..." : "Refer Patient Case"}
                  </button>
                </form>
              )}
            </div>
          )}

          {user?.role === "consultant" && (
            <div className="modal-section referral-wrapper border-top">
              <div className="modal-section-title">
                <RiVerifiedBadgeLine />
                <span>Specialist Recommendation Review</span>
              </div>
              <div className="referral-reason-summary glass-panel">
                <p><strong>Reason for referral:</strong></p>
                <p className="reason-text">{patient.referralReason}</p>
              </div>

              {patient.referralStatus === "Reviewed" ? (
                <div className="recommendation-notes-box glass-panel">
                  <p><strong>Your Submitted Recommendation:</strong></p>
                  <p className="recommendation-text">{patient.consultantNotes}</p>
                </div>
              ) : (
                <form onSubmit={handleRecommend} className="recommendation-form">
                  <div className="input-group-modal">
                    <label className="input-label-modal">Specialist Recommendations & Advice</label>
                    <textarea
                      value={consultantNotes}
                      onChange={(e) => setConsultantNotes(e.target.value)}
                      placeholder="Write your clinical notes, diagnostic assessments, or prescription suggestions here..."
                      required
                      className="form-textarea-custom"
                      rows="4"
                    />
                  </div>
                  <button type="submit" disabled={submitting} className="btn-primary-custom">
                    {submitting ? "Submitting Advice..." : "Submit Consultation Advice"}
                  </button>
                </form>
              )}
            </div>
          )}

          {(user?.role === "patient" || readOnly) && patient.referredTo && (
            <div className="modal-section referral-wrapper border-top">
              <div className="modal-section-title">
                <RiVerifiedBadgeLine />
                <span>Consultation Recommendations</span>
              </div>
              <div className="referral-details-box glass-panel">
                <p><strong>Referral Reason:</strong> {patient.referralReason}</p>
                {patient.consultantNotes ? (
                  <div className="recommendation-notes-box">
                    <p><strong>Specialist Recommendations:</strong></p>
                    <p className="recommendation-text">{patient.consultantNotes}</p>
                  </div>
                ) : (
                  <p className="waiting-text-info">Recommendation pending review by specialist.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-modal-close">
            Dismiss File
          </button>
        </div>
      </div>
    </div>
  );
}
