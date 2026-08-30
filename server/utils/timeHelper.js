// Helper: Normalize time string to uniform "HH:MM AM/PM" format
export const formatTime = (timeStr) => {
  try {
    const parts = timeStr.trim().split(/\s+/);
    if (parts.length < 2) return timeStr.trim();
    let [time, modifier] = parts;
    let [hours, minutes] = time.split(":");
    hours = hours.padStart(2, "0");
    minutes = minutes.padStart(2, "0");
    return `${hours}:${minutes} ${modifier.toUpperCase()}`;
  } catch (e) {
    return timeStr.trim();
  }
};

// Helper: Convert time string e.g. "10:30 AM" to minutes from midnight
export const parseTimeToMinutes = (timeStr) => {
  const normalized = formatTime(timeStr);
  const [time, modifier] = normalized.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) {
    hours += 12;
  }
  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
};

// Helper: Convert minutes from midnight back to time string
export const minutesToTimeString = (minutes) => {
  let hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const modifier = hours >= 12 ? "PM" : "AM";
  if (hours > 12) {
    hours -= 12;
  }
  if (hours === 0) {
    hours = 12;
  }
  const minsStr = mins < 10 ? `0${mins}` : mins;
  const hoursStr = hours < 10 ? `0${hours}` : hours;
  return `${hoursStr}:${minsStr} ${modifier}`;
};

// Retrieve current date info in Asia/Kolkata timezone
export const getKolkataTimeInfo = (date = new Date()) => {
  const options = {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "long"
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(date);
  const info = {};
  for (const part of parts) {
    info[part.type] = part.value;
  }
  return {
    dayName: info.weekday, // e.g. "Thursday"
    hours: parseInt(info.hour),
    minutes: parseInt(info.minute)
  };
};

export const getKolkataDateString = (date = new Date()) => {
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  };
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  return formatter.format(date);
};

export const checkDoctorAvailability = (availability, checkDate = new Date()) => {
  if (!availability) return false;
  
  const dateStr = getKolkataDateString(checkDate);
  const timeInfo = getKolkataTimeInfo(checkDate);
  const currentMinutes = timeInfo.hours * 60 + timeInfo.minutes;
  
  const ranges = availability instanceof Map ? availability.get(dateStr) : availability[dateStr];
  if (!ranges || ranges.length === 0) {
    return false;
  }
  
  for (const range of ranges) {
    const parts = range.split("-");
    if (parts.length !== 2) continue;
    const startMinutes = parseTimeToMinutes(parts[0].trim());
    const endMinutes = parseTimeToMinutes(parts[1].trim());
    
    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return true;
    }
  }
  
  return false;
};

export const isSlotWithinAvailability = (availability, dateString, timeString) => {
  if (!availability) return false;
  
  const ranges = availability instanceof Map ? availability.get(dateString) : availability[dateString];
  if (!ranges || ranges.length === 0) return false;
  
  const slotMinutes = parseTimeToMinutes(timeString);
  
  for (const range of ranges) {
    const parts = range.split("-");
    if (parts.length !== 2) continue;
    const startMinutes = parseTimeToMinutes(parts[0].trim());
    const endMinutes = parseTimeToMinutes(parts[1].trim());
    
    if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
      return true;
    }
  }
  
  return false;
};

export const hasUpcomingAvailability = (availability) => {
  if (!availability) return false;
  const todayStr = getKolkataDateString();
  
  if (availability instanceof Map) {
    for (const [dateStr, ranges] of availability.entries()) {
      if (dateStr >= todayStr && ranges && ranges.length > 0) {
        return true;
      }
    }
  } else {
    for (const [dateStr, ranges] of Object.entries(availability)) {
      if (dateStr >= todayStr && ranges && ranges.length > 0) {
        return true;
      }
    }
  }
  return false;
};


