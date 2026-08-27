import { useState } from "react";
import { updateDoctorProfile } from "../services/authService";
import { toast } from "react-hot-toast";
import { RiCloseLine, RiSave3Line } from "react-icons/ri";
import "./EditProfileModal.css";

export default function EditProfileModal({ doctor, onClose, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    specialization: doctor?.specialization || "",
    experience: doctor?.experience || "",
    location: doctor?.locationName || (doctor?.location && typeof doctor.location === "string" ? doctor.location : ""),
    consultationFee: doctor?.consultationFee || "",
    about: doctor?.about || "",
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const res = await updateDoctorProfile(formData);
      toast.success("Clinical profile updated successfully! ✅");
      onSaveSuccess(res.data.user);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save updates.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container edit-profile-modal glass-panel">
        <button className="modal-close-btn" onClick={onClose}>
          <RiCloseLine />
        </button>

        <div className="modal-header">
          <h3>Edit Clinical Profile</h3>
          <p className="modal-subtitle">Update fields visible to patient search cards.</p>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          <div className="input-group-modal">
            <label className="input-label-modal">Medical Specialization</label>
            <input
              type="text"
              name="specialization"
              placeholder="e.g. General Physician, Pediatrician"
              value={formData.specialization}
              onChange={handleChange}
              required
              className="form-input-custom"
            />
          </div>

          <div className="modal-row-grid">
            <div className="input-group-modal">
              <label className="input-label-modal">Experience (Years)</label>
              <input
                type="number"
                name="experience"
                placeholder="e.g. 10"
                value={formData.experience}
                onChange={handleChange}
                required
                className="form-input-custom"
                min="0"
              />
            </div>

            <div className="input-group-modal">
              <label className="input-label-modal">Consultation Fee (₹)</label>
              <input
                type="number"
                name="consultationFee"
                placeholder="e.g. 350"
                value={formData.consultationFee}
                onChange={handleChange}
                required
                className="form-input-custom"
                min="0"
              />
            </div>
          </div>

          <div className="input-group-modal">
            <label className="input-label-modal">Clinic Location (City)</label>
            <input
              type="text"
              name="location"
              placeholder="e.g. Ghaziabad"
              value={formData.location}
              onChange={handleChange}
              required
              className="form-input-custom"
            />
          </div>

          <div className="input-group-modal">
            <label className="input-label-modal">Practice Description</label>
            <textarea
              name="about"
              placeholder="Type details regarding medical certifications, clinic details..."
              value={formData.about}
              onChange={handleChange}
              required
              className="form-textarea-custom"
              rows="4"
            />
          </div>

          <div className="modal-actions border-top">
            <button type="submit" disabled={saving} className="btn-primary-custom btn-save-profile">
              <RiSave3Line /> {saving ? "Saving Changes..." : "Save Profile Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
