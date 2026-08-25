import { useEffect, useState } from "react";
import { getPatients } from "../../services/patientService";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import PatientTable from "../../components/PatientTable";
import PatientDetailModal from "../../components/PatientDetailModal";
import Loader from "../../components/Loader";
import "./History.css";

export default function History() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const res = await getPatients();
      setPatients(res.data.patients);
    } catch (err) {
      console.error("Patient history load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="history-layout">
      <Sidebar />

      <div className="history-main-area">
        <Navbar />

        <div className="history-content">
          <div className="history-welcome-banner glass-panel">
            <h1>Clinical History & Records</h1>
            <p>Review comprehensive diagnostic case reports, risk factors, and notes recorded in this clinic.</p>
          </div>

          <div className="history-records-card">
            <h2 className="section-title">All Diagnostic Records</h2>
            <PatientTable
              patients={patients}
              onViewPatient={(patient) => setSelectedPatient(patient)}
            />
          </div>
        </div>
      </div>

      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </div>
  );
}