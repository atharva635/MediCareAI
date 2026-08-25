import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addPatient } from "../../services/patientService";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { toast } from "react-hot-toast";
import { RiShieldCrossLine, RiCheckLine, RiArrowRightLine, RiHeartPulseLine } from "react-icons/ri";
import "./PatientTriage.css";

export default function PatientTriage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [triageResult, setTriageResult] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "Male",
    symptoms: [],
    medicalHistory: "", // Used as free-text description of symptoms
    severity: "Moderate",
    duration: "2 days",
  });

  const symptomOptions = [
    { label: "Chest Pain", description: "Tightness, pressure or crushing pain" },
    { label: "Breathing Difficulty", description: "Shortness of breath or heavy breathing" },
    { label: "High Fever", description: "Body temperature above 101°F" },
    { label: "Vomiting", description: "Severe nausea or vomiting" },
    { label: "Cough", description: "Dry or productive chesty cough" },
    { label: "Headache", description: "Migraine, pressure or tension pain" },
    { label: "Body Pain", description: "General muscle aches or joint pain" },
    { label: "Weakness", description: "Fatigue, exhaustion or lack of energy" },
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleSymptom = (symptom) => {
    setFormData((prev) => {
      const isSelected = prev.symptoms.includes(symptom);
      return {
        ...prev,
        symptoms: isSelected
          ? prev.symptoms.filter((s) => s !== symptom)
          : [...prev.symptoms, symptom],
      };
    });
  };

  const getTriageDetails = (riskLevel, symptomsList) => {
    let score = 35;
    let action = "Self-care and monitoring recommended.";
    let careArea = "General Medicine";

    if (riskLevel === "Critical") {
      score = 92;
      action = "Immediate online consultation or hospital visit recommended.";
      careArea = symptomsList.includes("Chest Pain") ? "Cardiologist" : "Internal Medicine";
    } else if (riskLevel === "High") {
      score = 78;
      action = "Prompt medical review is recommended within 24 hours.";
      careArea = "Internal Medicine";
    } else if (riskLevel === "Medium") {
      score = 64;
      action = "Consultation with a primary care doctor is recommended.";
      careArea = "General Physician";
    }

    return { score, action, careArea };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.symptoms.length === 0) {
      toast.error("Please select at least one symptom for triage analysis");
      return;
    }

    try {
      setLoading(true);
      // We send the triage data to addPatient (which creates a "Triage" Patient log)
      const res = await addPatient({
        name: formData.name,
        age: formData.age,
        gender: formData.gender,
        symptoms: formData.symptoms,
        medicalHistory: `[Duration: ${formData.duration} | Severity: ${formData.severity}] - Description: ${formData.medicalHistory}`,
      });

      const patientRecord = res.data.patient;
      const details = getTriageDetails(patientRecord.riskLevel, formData.symptoms);

      setTriageResult({
        id: patientRecord._id,
        riskLevel: patientRecord.riskLevel,
        score: details.score,
        action: details.action,
        careArea: details.careArea,
      });

      toast.success("AI Preliminary Triage Complete! ✅");
    } catch (err) {
      toast.error(err.response?.data?.message || "Triage failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="triage-layout">
      <Sidebar />

      <div className="triage-main-area">
        <Navbar />

        <div className="triage-content">
          {!triageResult ? (
            <div className="triage-form-card glass-panel">
              <div className="triage-header">
                <div className="header-icon-wrapper">
                  <RiShieldCrossLine className="header-icon" />
                </div>
                <div>
                  <h2>AI Symptom Triage & Urgency Assessment</h2>
                  <p>Tell us what you are experiencing to evaluate clinical risk indicators.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="triage-form">
                {/* Basic Info */}
                <div className="form-row-grid">
                  <div className="input-group">
                    <label className="input-label">Patient Name</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g. Atharva"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="form-input-custom"
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Age (Years)</label>
                    <input
                      type="number"
                      name="age"
                      placeholder="e.g. 24"
                      value={formData.age}
                      onChange={handleChange}
                      required
                      className="form-input-custom"
                      min="1"
                      max="120"
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="form-input-custom form-select-custom"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Duration & Severity */}
                <div className="form-row-grid duration-severity-grid">
                  <div className="input-group">
                    <label className="input-label">Duration of Symptoms</label>
                    <select
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      className="form-input-custom form-select-custom"
                    >
                      <option value="1 day">1 day</option>
                      <option value="2 days">2 days</option>
                      <option value="3 days">3 days</option>
                      <option value="5 days">5 days</option>
                      <option value="1 week">1 week</option>
                      <option value="More than a week">More than a week</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Perceived Severity</label>
                    <select
                      name="severity"
                      value={formData.severity}
                      onChange={handleChange}
                      className="form-input-custom form-select-custom"
                    >
                      <option value="Mild">Mild</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Severe">Severe</option>
                    </select>
                  </div>
                </div>

                {/* Symptoms grid */}
                <div className="symptoms-section">
                  <label className="input-label section-label">Select Presenting Symptoms</label>
                  <div className="symptoms-grid">
                    {symptomOptions.map((opt) => {
                      const isChecked = formData.symptoms.includes(opt.label);
                      return (
                        <div
                          key={opt.label}
                          className={`symptom-card glass-panel ${isChecked ? "selected" : ""}`}
                          onClick={() => toggleSymptom(opt.label)}
                        >
                          <div className="symptom-card-header">
                            <span className="symptom-name">{opt.label}</span>
                            <span className="custom-check-indicator">
                              {isChecked && <RiCheckLine />}
                            </span>
                          </div>
                          <p className="symptom-desc">{opt.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div className="input-group">
                  <label className="input-label">Describe your condition in detail</label>
                  <textarea
                    name="medicalHistory"
                    placeholder="Provide context like when it increases, key details (e.g. fever spikes at night, throat pain, fatigue)..."
                    value={formData.medicalHistory}
                    onChange={handleChange}
                    className="form-textarea-custom"
                    rows="3"
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary-custom">
                  {loading ? "AI Engines Evaluating Symptoms..." : "Analyze Symptoms & AI Triage"}
                </button>
              </form>
            </div>
          ) : (
            <div className="triage-result-card glass-panel">
              <div className="result-header">
                <RiHeartPulseLine className="result-logo-pulse" />
                <h3>AI Preliminary Triage Summary</h3>
              </div>

              <div className="result-score-section">
                <div className={`score-ring ${triageResult.riskLevel.toLowerCase()}`}>
                  <span className="score-ring-val">{triageResult.score}/100</span>
                  <span className="score-ring-lbl">Triage Score</span>
                </div>
                <div className="urgency-details">
                  <span className="urgency-lbl">Urgency Level Rating</span>
                  <span className={`badge ${triageResult.riskLevel.toLowerCase()} urgency-badge`}>
                    {triageResult.riskLevel}
                  </span>
                </div>
              </div>

              <div className="result-care-box glass-panel">
                <p><strong>Suggested Care Specialty:</strong> {triageResult.careArea}</p>
                <p className="recommend-text"><strong>Recommendation:</strong> {triageResult.action}</p>
              </div>

              <div className="disclaimer-alert">
                <p>
                  ⚠️ <strong>Disclaimer:</strong> This is a preliminary triage analysis to assess symptom urgency level.
                  It does not constitute a definitive medical diagnosis and does not replace evaluation by a clinical doctor.
                </p>
              </div>

              <div className="result-actions">
                <button
                  onClick={() => navigate(`/patient/doctors/${triageResult.id}`)}
                  className="btn-primary-custom btn-find-doctor"
                >
                  Find Available Doctors <RiArrowRightLine />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
