import { useState, useEffect } from "react";
import { saveAvailability, getAvailability } from "../services/appointmentService";
import { toast } from "react-hot-toast";
import { RiCloseLine, RiCalendarCheckLine, RiDeleteBin7Line } from "react-icons/ri";
import "./AvailabilityModal.css";

const TIME_OPTIONS = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM",
  "08:00 PM", "08:30 PM", "09:00 PM"
];

export default function AvailabilityModal({ doctor, onClose, onSaveSuccess }) {
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [fullAvailability, setFullAvailability] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch full availability map on mount
  useEffect(() => {
    loadAvailability();
  }, [doctor]);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const res = await getAvailability(doctor._id);
      if (res.data.success) {
        setFullAvailability(res.data.availability || {});
      }
    } catch (err) {
      console.error("Error loading availability:", err);
      toast.error("Failed to load availability settings.");
    } finally {
      setLoading(false);
    }
  };

  // Sync selected slots when selectedDate or fullAvailability changes
  useEffect(() => {
    if (selectedDate) {
      const slots = fullAvailability[selectedDate] || [];
      setSelectedSlots(slots);
    } else {
      setSelectedSlots([]);
    }
  }, [selectedDate, fullAvailability]);

  const handleToggleSlot = (slot) => {
    setSelectedSlots((prev) => {
      if (prev.includes(slot)) {
        return prev.filter((s) => s !== slot);
      } else {
        return [...prev, slot].sort((a, b) => {
          const parseTime = (t) => {
            const [time, modifier] = t.split(" ");
            let [h, m] = time.split(":").map(Number);
            if (modifier === "PM" && h < 12) h += 12;
            if (modifier === "AM" && h === 12) h = 0;
            return h * 60 + m;
          };
          return parseTime(a) - parseTime(b);
        });
      }
    });
  };

  const handleMarkUnavailable = async () => {
    try {
      setSaving(true);
      const res = await saveAvailability({ date: selectedDate, slots: [] });
      if (res.data.success) {
        toast.success("Date marked as unavailable! 📅");
        setFullAvailability(res.data.availability || {});
        if (onSaveSuccess) {
          onSaveSuccess(res.data.availability);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update availability.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedDate) {
      toast.error("Please select a date.");
      return;
    }

    try {
      setSaving(true);
      const res = await saveAvailability({ date: selectedDate, slots: selectedSlots });
      if (res.data.success) {
        toast.success("Availability updated successfully! 📅");
        setFullAvailability(res.data.availability || {});
        if (onSaveSuccess) {
          onSaveSuccess(res.data.availability);
        }
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save availability.");
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
          <h3>Set Slot Availability</h3>
          <p className="modal-subtitle">Configure available consultation slots for specific dates.</p>
        </div>

        {loading ? (
          <div className="loader-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '40px' }}>
            <span style={{ color: '#cbd5e1' }}>Loading availability data...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="availability-date-picker">
              <label htmlFor="modal-date-picker">Select Date</label>
              <input
                type="date"
                id="modal-date-picker"
                value={selectedDate}
                min={getTodayString()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="modal-date-input"
              />
            </div>

            <div className="availability-slots-selection">
              <label className="section-label">Select Available Slots</label>
              <div className="slots-grid-container">
                {TIME_OPTIONS.map((slot) => {
                  const isActive = selectedSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={`slot-pill ${isActive ? "active" : ""}`}
                      onClick={() => handleToggleSlot(slot)}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-unavailable"
                onClick={handleMarkUnavailable}
                disabled={saving || !selectedSlots.length}
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RiDeleteBin7Line /> Mark Unavailable
              </button>
              <button type="submit" className="btn-save-avail" disabled={saving}>
                <RiCalendarCheckLine /> {saving ? "Saving..." : "Save Slots"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
