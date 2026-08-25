import { useState } from "react";
import { RiSearchLine, RiEyeLine } from "react-icons/ri";
import "./PatientTable.css";

export default function PatientTable({ patients, onViewPatient }) {
  const [search, setSearch] = useState("");

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="patient-table-container glass-panel">
      <div className="table-header-actions">
        <div className="search-box-wrapper">
          <RiSearchLine className="search-icon" />
          <input
            type="text"
            placeholder="Search patients by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input-field"
          />
        </div>
        <div className="patient-count-badge">
          {filteredPatients.length} Active Records
        </div>
      </div>

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Risk Level</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <tr key={patient._id} className="table-row-hover">
                  <td>
                    <div className="patient-name-cell">
                      <span className="patient-avatar-letter">
                        {patient.name[0].toUpperCase()}
                      </span>
                      <div>
                        <p className="p-name">{patient.name}</p>
                        <p className="p-history-preview">
                          {patient.symptoms.slice(0, 2).join(", ")}
                          {patient.symptoms.length > 2 ? "..." : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="info-text">{patient.age} yrs</span>
                  </td>
                  <td>
                    <span className={`gender-tag ${patient.gender.toLowerCase()}`}>
                      {patient.gender === "Male" ? "♂ Male" : "♀ Female"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${patient.riskLevel.toLowerCase()}`}>
                      {patient.riskLevel}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => onViewPatient(patient)}
                      className="action-btn-view"
                      title="View Details"
                    >
                      <RiEyeLine />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-table-cell">
                  <div className="empty-state-wrapper">
                    <span>🔍</span>
                    <p>No patients found matching your search</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
