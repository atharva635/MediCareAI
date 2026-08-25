import { useState, useEffect } from "react";
import { saveAvailability } from "../services/appointmentService";
import { toast } from "react-hot-toast";
import { RiCloseLine, RiCalendarCheckLine } from "react-icons/ri";
import "./AvailabilityModal.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_OPTIONS = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM",
  "08:00 PM", "08:30 PM", "09:00 PM"
];

export default function AvailabilityModal({ doctor, onClose, onSaveSuccess }) {
  const [availability, setAvailability] = useState({});
  const [saving, setSaving] = useState(false);

  // Initialize state based on existing doctor's availability Map
  useEffect(() => {
    const initial = {};
    const docAvail = doctor?.availability || {};
    
    // Normalize mapping from doctor's availability
    DAYS.forEach(day => {
      const ranges = docAvail instanceof Map ? docAvail.get(day) : docAvail[day];
      if (ranges && ranges.length > 0) {
        const parts = ranges[0].split("-").map(p => p.trim());
        if (parts.length === 2) {
          initial[day] = {
            active: true,
            start: parts[0],
            end: parts[1]
          };
          return;
        }
      }
      initial[day] = {
        active: false,
        start: "10:00 AM",
        end: "01:00 PM"
      };
    });
    setAvailability(initial);
  }, [doctor]);

  const handleToggleActive = (day) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        active: !prev[day].active
      }
    }));
  };

  const handleTimeChange = (day, type, value) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate that end time is strictly after start time for all active days
    const parseToMinutes = (timeStr) => {
      const [time, modifier] = timeStr.split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const formattedAvailability = {};
    for (const day of DAYS) {
      const settings = availability[day];
      if (settings?.active) {
        const startMin = parseToMinutes(settings.start);
        const endMin = parseToMinutes(settings.end);
        if (endMin <= startMin) {
          toast.error(`End time must be after start time on ${day}`);
          return;
        }
        // Save format: ["10:00 AM - 01:00 PM"]
        formattedAvailability[day] = [`${settings.start} - ${settings.end}`];
      } else {
        // Explicitly clear day if inactive
        formattedAvailability[day] = [];
      }
    }

    try {
      setSaving(true);
      const res = await saveAvailability({ availability: formattedAvailability });
      toast.success("Availability updated successfully! 📅");
      if (onSaveSuccess) {
        onSaveSuccess(res.data.availability);
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update availability.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container availability-modal glass-panel">
        <button className="modal-close-btn" onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#6b7280', fontSize: '1.5rem', cursor: 'pointer' }}>
          <RiCloseLine />
        </button>

        <div className="modal-header">
          <h3>Set Weekly Availability</h3>
          <p className="modal-subtitle">Define the start and end hours for your consultation slots.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="availability-list">
            {DAYS.map((day) => {
              const settings = availability[day] || { active: false, start: "10:00 AM", end: "01:00 PM" };
              return (
                <div key={day} className={`day-row ${settings.active ? "active" : "inactive"}`}>
                  <div className="day-label-group">
                    <input
                      type="checkbox"
                      id={`check-${day}`}
                      className="day-checkbox"
                      checked={settings.active}
                      onChange={() => handleToggleActive(day)}
                    />
                    <label htmlFor={`check-${day}`} className="day-name">
                      {day}
                    </label>
                  </div>

                  {settings.active ? (
                    <div className="time-slot-inputs">
                      <div className="time-select-wrapper">
                        <span>From</span>
                        <select
                          className="time-dropdown"
                          value={settings.start}
                          onChange={(e) => handleTimeChange(day, "start", e.target.value)}
                        >
                          {TIME_OPTIONS.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>

                      <div className="time-select-wrapper">
                        <span>To</span>
                        <select
                          className="time-dropdown"
                          value={settings.end}
                          onChange={(e) => handleTimeChange(day, "end", e.target.value)}
                        >
                          {TIME_OPTIONS.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'right' }}>
                      <span className="status-label">Not Attending</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save-avail" disabled={saving}>
              <RiCalendarCheckLine /> {saving ? "Saving timings..." : "Save Availability"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
