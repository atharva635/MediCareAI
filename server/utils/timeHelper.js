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

// Check if doctor is currently available based on availability map and current date/time in Asia/Kolkata timezone
export const checkDoctorAvailability = (availability, checkDate = new Date()) => {
  if (!availability) return false;
  
  const { dayName, hours, minutes } = getKolkataTimeInfo(checkDate);
  const currentMinutes = hours * 60 + minutes;
  
  const ranges = availability instanceof Map ? availability.get(dayName) : availability[dayName];
  if (!ranges || ranges.length === 0) {
    return false;
  }
  
  for (const range of ranges) {
    const parts = range.split("-");
    if (parts.length !== 2) continue;
    const startMinutes = parseTimeToMinutes(parts[0].trim());
    const endMinutes = parseTimeToMinutes(parts[1].trim());
    
    // Exclusive end check (currentMinutes < endMinutes)
    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return true;
    }
  }
  
  return false;
};

// Check if a specific date and time slot is within the doctor's weekly availability
export const isSlotWithinAvailability = (availability, dateString, timeString) => {
  if (!availability) return false;

  const dateParts = dateString.split("-");
  if (dateParts.length !== 3) return false;
  
  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1;
  const day = parseInt(dateParts[2]);
  
  const dateObj = new Date(year, month, day);
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = daysOfWeek[dateObj.getDay()];
  
  const ranges = availability instanceof Map ? availability.get(dayName) : availability[dayName];
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
