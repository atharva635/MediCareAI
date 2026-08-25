import { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { addPatient } from "../../services/patientService";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import { RiShieldCrossLine, RiUserAddLine, RiCheckLine } from "react-icons/ri";
import "./Assessment.css";

export default function Assessment() {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "Male",
    symptoms: [],
    medicalHistory: "",
    email: "",
  });

  const [loading, setLoading] = useState(false);

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

  // Real-time Live Risk Simulator
  const simulatedRisk = useMemo(() => {
    const syms = formData.symptoms;
    if (syms.includes("Chest Pain") || syms.includes("Breathing Difficulty")) {
      return "Critical";
    }
    if (syms.includes("High Fever") || syms.includes("Vomiting")) {
      return "High";
    }
    if (syms.includes("Cough") || syms.includes("Headache")) {
      return "Medium";
    }
    return "Low";
  }, [formData.symptoms]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.symptoms.length === 0) {
      toast.error("Please select at least one symptom for risk calculation");
      return;
    }

    try {
      setLoading(true);
      const res = await addPatient(formData);

      toast.success(`Diagnostic Log Saved! Risk: ${res.data.patient.riskLevel} ✅`);

      setFormData({
        name: "",
        age: "",
        gender: "Male",
        symptoms: [],
        medicalHistory: "",
        email: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving assessment");
    } finally {
      setLoading(false);
    }
  };

  const symptomOptions = [
    { label: "Chest Pain", description: "Tightness or pressure" },
    { label: "Breathing Difficulty", description: "Shortness of breath" },
    { label: "High Fever", description: "Temp > 101°F" },
    { label: "Vomiting", description: "Severe nausea/emesis" },
    { label: "Cough", description: "Dry or productive cough" },
    { label: "Headache", description: "Migraine or acute tension" },
  ];

  return (
    <div className="assessment-layout">
      <Sidebar />

      <div className="assessment-main-area">
        <Navbar />

        <div className="assessment-content">
          <div className="assessment-form-card glass-panel">
            <div className="assessment-header">
              <div className="header-icon-wrapper">
                <RiUserAddLine className="header-icon" />
              </div>
              <div>
                <h2>New Patient Assessment</h2>
                <p>Register a patient and perform instant clinical risk profiling.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="assessment-form">
              {/* Patient Basic Details Grid */}
              <div className="form-row-grid">
                <div className="input-group">
                  <label className="input-label">Patient Name</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter full name"
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
                    placeholder="e.g. 45"
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

              {/* Patient Email Input */}
              <div className="input-group">
                <label className="input-label">Patient Email Address (to link user portal access)</label>
                <input
                  type="email"
                  name="email"
                  placeholder="patient@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input-custom"
                  style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", color: "#f3f4f6" }}
                />
              </div>

              {/* Symptom Selection Cards */}
              <div className="symptoms-section">
                <label className="input-label section-label">Presenting Symptoms</label>
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

              {/* Live Risk Simulator Panel */}
              <div className="live-risk-simulator glass-panel">
                <div className="risk-sim-header">
                  <RiShieldCrossLine className="sim-icon" />
                  <div>
                    <h4>Live Diagnostic Simulator</h4>
                    <p>Real-time calculation based on presenting symptoms.</p>
                  </div>
                </div>
                <div className="risk-sim-result">
                  <span className="sim-label">Simulated Risk Level</span>
                  <span className={`badge ${simulatedRisk.toLowerCase()} sim-risk-badge`}>
                    {simulatedRisk}
                  </span>
                </div>
              </div>

              {/* Medical History */}
              <div className="input-group">
                <label className="input-label">Medical History & Clinical Notes</label>
                <textarea
                  name="medicalHistory"
                  placeholder="Record patient medical history, allergies, chronic ailments, or special diagnostics observations here..."
                  value={formData.medicalHistory}
                  onChange={handleChange}
                  className="form-textarea-custom"
                  rows="4"
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary-custom btn-assessment-submit"
                >
                  {loading ? "Analysing Patient Case..." : "Save Assessment Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
