import { useEffect, useState } from "react";
import { getPatients } from "../../services/patientService";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import Loader from "../../components/Loader";
import PatientDetailModal from "../../components/PatientDetailModal";
import { RiFolderReceivedLine, RiTimeLine, RiCheckboxCircleLine, RiFileList2Line } from "react-icons/ri";
import "./ConsultantDashboard.css";

export default function ConsultantDashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    loadReferredPatients();
  }, []);

  const loadReferredPatients = async () => {
    try {
      const res = await getPatients();
      setPatients(res.data.patients || []);
    } catch (err) {
      console.error("Failed to load referred patients:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: patients.length,
    pending: patients.filter((p) => p.referralStatus === "Pending").length,
    completed: patients.filter((p) => p.referralStatus === "Reviewed").length,
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="consultant-dashboard-layout">
      <Sidebar />

      <div className="consultant-dashboard-main-area">
        <Navbar />

        <div className="consultant-dashboard-content">
          <div className="consultant-welcome-banner glass-panel">
            <h1>Clinical Consultation Space</h1>
            <p>Review diagnostic history, evaluate simulated AI risk profiles, and submit specialized advice.</p>
          </div>

          {/* Stats Grid */}
          <div className="consultant-stats-grid">
            <div className="consultant-stat-card glass-panel">
              <div className="stat-icon-wrapper total-icon">
                <RiFolderReceivedLine />
              </div>
              <div className="stat-info">
                <span className="stat-label">Assigned Referrals</span>
                <span className="stat-value">{stats.total}</span>
              </div>
            </div>

            <div className="consultant-stat-card glass-panel">
              <div className="stat-icon-wrapper pending-icon">
                <RiTimeLine />
              </div>
              <div className="stat-info">
                <span className="stat-label">Pending Reviews</span>
                <span className="stat-value">{stats.pending}</span>
              </div>
            </div>

            <div className="consultant-stat-card glass-panel">
              <div className="stat-icon-wrapper completed-icon">
                <RiCheckboxCircleLine />
              </div>
              <div className="stat-info">
                <span className="stat-label">Completed Advice</span>
                <span className="stat-value">{stats.completed}</span>
              </div>
            </div>
          </div>

          {/* Referrals Section */}
          <div className="referred-patients-section glass-panel">
            <h2 className="section-title">Referred Consultation Cases</h2>
            {patients.length === 0 ? (
              <div className="no-cases-state">
                <RiFileList2Line className="no-cases-icon" />
                <p>No diagnostic case referrals assigned to your profile yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="consultant-table">
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Age / Gender</th>
                      <th>Referral Reason</th>
                      <th>Simulated Risk</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => (
                      <tr key={p._id} className="consultant-table-row">
                        <td>
                          <div className="patient-primary-cell">
                            <span className="patient-name-cell">{p.name}</span>
                            <span className="patient-email-cell">{p.email || "No email linked"}</span>
                          </div>
                        </td>
                        <td>{p.age} Y / {p.gender}</td>
                        <td className="referral-reason-cell" title={p.referralReason}>
                          {p.referralReason || "N/A"}
                        </td>
                        <td>
                          <span className={`badge ${p.riskLevel.toLowerCase()} risk-badge-cell`}>
                            {p.riskLevel}
                          </span>
                        </td>
                        <td>
                          <span className={`referral-status-label ${p.referralStatus.toLowerCase()}`}>
                            {p.referralStatus}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedPatient(p)}
                            className="btn-review-case"
                          >
                            {p.referralStatus === "Reviewed" ? "View Details" : "Review Case"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => {
            setSelectedPatient(null);
            loadReferredPatients(); // reload table if details was modified
          }}
        />
      )}
    </div>
  );
}
