import { useState, useEffect } from "react";
import { saveAvailability } from "../services/appointmentService";
import { toast } from "react-hot-toast";
import { RiCloseLine, RiCalendarCheckLine, RiAddLine, RiDeleteBinLine, RiTimeLine } from "react-icons/ri";
import "./AvailabilityModal.css";

const TIME_OPTIONS = [
  "12:00 AM", "12:30 AM", "01:00 AM", "01:30 AM", "02:00 AM", "02:30 AM",
  "03:00 AM", "03:30 AM", "04:00 AM", "04:30 AM", "05:00 AM", "05:30 AM",
  "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM",
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
  "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM",
  "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM"
];

// Helper: Normalize time string to minutes from midnight
const parseTimeToMinutes = (timeStr) => {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// Helper: Formats YYYY-MM-DD into a human-friendly label "Monday, 31 August 2026"
const formatDateNicely = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return dateStr;
  return dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function AvailabilityModal({ doctor, onClose, onSaveSuccess }) {
  // Convert standard Mongoose Map back to a clean plain object for React state
  const getInitialAvailability = () => {
    const raw = doctor?.availability || {};
    if (raw instanceof Map) {
      const obj = {};
      for (const [key, val] of raw.entries()) {
        obj[key] = val;
      }
      return obj;
    }
    return { ...raw };
  };

  const [availability, setAvailability] = useState(getInitialAvailability());
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("01:00 PM");
  const [saving, setSaving] = useState(false);

  // Setup default date picker minimum to today in Asia/Kolkata timezone
  const getTodayKolkataString = () => {
    const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
    return new Intl.DateTimeFormat("en-CA", options).format(new Date());
  };

  const todayStr = getTodayKolkataString();

  useEffect(() => {
    setSelectedDate(todayStr);
  }, []);

  const handleAddSlot = (e) => {
    e.preventDefault();
    if (!selectedDate) {
      toast.error("Please pick a consultation date.");
      return;
    }

    // Expiry check
    const now = new Date();
    const kolkataDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const kolkataTimeStr = now.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
    const [curH, curM] = kolkataTimeStr.split(":").map(Number);
    const currentMinutes = curH * 60 + curM;

    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);

    if (endMin <= startMin) {
      toast.error("End time must be strictly after start time.");
      return;
    }

    if (selectedDate < kolkataDateStr) {
      toast.error("Cannot schedule consultation slots in the past.");
      return;
    }

    if (selectedDate === kolkataDateStr && endMin <= currentMinutes) {
      toast.error("Consultation slot end time cannot be in the past.");
      return;
    }

    const newRange = `${startTime} - ${endTime}`;
    const existingRanges = availability[selectedDate] || [];

    if (existingRanges.includes(newRange)) {
      toast.error("This exact slot is already added for this day.");
      return;
    }

    // Check for overlapping slots on the same day
    const overlap = existingRanges.some(r => {
      const parts = r.split("-").map(p => p.trim());
      const existingStart = parseTimeToMinutes(parts[0]);
      const existingEnd = parseTimeToMinutes(parts[1]);
      return (startMin < existingEnd && endMin > existingStart);
    });

    if (overlap) {
      toast.error("This slot overlaps with an existing schedule on this day!");
      return;
    }

    setAvailability(prev => ({
      ...prev,
      [selectedDate]: [...existingRanges, newRange].sort((a, b) => {
        const aStart = parseTimeToMinutes(a.split("-")[0].trim());
        const bStart = parseTimeToMinutes(b.split("-")[0].trim());
        return aStart - bStart;
      })
    }));

    toast.success("Schedule slot added to queue!");
  };

  const handleRemoveSlot = (dateKey, indexToRemove) => {
    setAvailability(prev => {
      const updatedList = [...prev[dateKey]];
      updatedList.splice(indexToRemove, 1);
      
      const newAvail = { ...prev };
      if (updatedList.length === 0) {
        delete newAvail[dateKey];
      } else {
        newAvail[dateKey] = updatedList;
      }
      return newAvail;
    });
    toast.success("Slot removed.");
  };

  // Check if a specific slot is active right now (LIVE NOW)
  const isSlotLive = (dateKey, range) => {
    const now = new Date();
    const kolkataDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (dateKey !== kolkataDate) return false;

    const kolkataTime = now.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
    const [curH, curM] = kolkataTime.split(":").map(Number);
    const currentMinutes = curH * 60 + curM;

    const parts = range.split("-").map(p => p.trim());
    const startMin = parseTimeToMinutes(parts[0]);
    const endMin = parseTimeToMinutes(parts[1]);

    return currentMinutes >= startMin && currentMinutes < endMin;
  };

  // Check if a slot is expired
  const isSlotExpired = (dateKey, range) => {
    const now = new Date();
    const kolkataDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (dateKey < kolkataDate) return true;

    if (dateKey === kolkataDate) {
      const kolkataTime = now.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
      const [curH, curM] = kolkataTime.split(":").map(Number);
      const currentMinutes = curH * 60 + curM;

      const parts = range.split("-").map(p => p.trim());
      const endMin = parseTimeToMinutes(parts[1]);
      return currentMinutes >= endMin;
    }

    return false;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Prune out past expired dates automatically on submit to keep DB clean
    const prunedAvailability = {};
    for (const [dateKey, ranges] of Object.entries(availability)) {
      const activeRanges = ranges.filter(r => !isSlotExpired(dateKey, r));
      if (activeRanges.length > 0) {
        prunedAvailability[dateKey] = activeRanges;
      }
    }

    try {
      const res = await saveAvailability({ availability: prunedAvailability });
      toast.success("Schedule saved successfully! 📅");
      if (onSaveSuccess) {
        onSaveSuccess(res.data.availability);
      }
      onClose();
    } catch (err) {
      console.error("Save Availability Error:", err);
      toast.error(err.response?.data?.message || "Failed to update availability.");
    } finally {
      setSaving(false);
    }
  };

  // Compile active slot list, sorting by date and time
  const activeSlots = [];
  Object.entries(availability).forEach(([dateKey, ranges]) => {
    ranges.forEach((range, idx) => {
      if (!isSlotExpired(dateKey, range)) {
        activeSlots.push({ dateKey, range, idx });
      }
    });
  });

  activeSlots.sort((a, b) => {
    if (a.dateKey !== b.dateKey) {
      return a.dateKey.localeCompare(b.dateKey);
    }
    const aStart = parseTimeToMinutes(a.range.split("-")[0].trim());
    const bStart = parseTimeToMinutes(b.range.split("-")[0].trim());
    return aStart - bStart;
  });

  return (
    <div className="modal-overlay">
      <div className="modal-container availability-modal glass-panel">
        <button className="modal-close-btn" onClick={onClose}>
          <RiCloseLine />
        </button>

        <div className="modal-header">
          <h3>Set Attending Hours</h3>
          <p className="modal-subtitle">Configure date-specific consultation slots for patient bookings.</p>
        </div>

        {/* Add Slot Form */}
        <form onSubmit={handleAddSlot} className="add-slot-form-box">
          <div className="form-row-custom">
            <div className="input-group-custom">
              <label>Select Consultation Date</label>
              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                required
                className="date-picker-custom-input"
              />
              {selectedDate && (
                <div className="weekday-label-box">
                  {formatDateNicely(selectedDate)}
                </div>
              )}
            </div>
          </div>

          <div className="form-row-custom time-slots-picker-row">
            <div className="time-select-wrapper">
              <span>Time Slot: From</span>
              <select
                className="time-dropdown-custom"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              >
                {TIME_OPTIONS.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            <div className="time-select-wrapper">
              <span>To</span>
              <select
                className="time-dropdown-custom"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              >
                {TIME_OPTIONS.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-add-slot-custom">
              <RiAddLine /> Add Slot
            </button>
          </div>
        </form>

        {/* Configured Slots List */}
        <div className="availability-list-container">
          <h4 className="list-title">Your Configured Slots</h4>
          <div className="availability-scroll-list">
            {activeSlots.length === 0 ? (
              <div className="empty-schedule-state">
                <RiTimeLine style={{ fontSize: "2rem", color: "#475569", marginBottom: "8px" }} />
                <p>No active slots configured. Schedule timings using the form above.</p>
              </div>
            ) : (
              activeSlots.map(({ dateKey, range, idx }) => {
                const live = isSlotLive(dateKey, range);
                return (
                  <div key={`${dateKey}-${range}-${idx}`} className={`configured-slot-item ${live ? "live" : ""}`}>
                    <div className="slot-info-box">
                      <div className="slot-date-label">📅 {formatDateNicely(dateKey)}</div>
                      <div className="slot-time-range">{range}</div>
                    </div>
                    <div className="slot-actions-box">
                      {live ? (
                        <span className="live-status-badge">🟢 LIVE NOW</span>
                      ) : (
                        <span className="upcoming-status-badge">📅 UPCOMING</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(dateKey, idx)}
                        className="btn-delete-slot-item"
                        title="Delete Schedule"
                      >
                        <RiDeleteBinLine />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-actions-custom">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-save-avail" onClick={handleSave} disabled={saving}>
            <RiCalendarCheckLine /> {saving ? "Saving Changes..." : "Save Availability"}
          </button>
        </div>
      </div>
    </div>
  );
}
