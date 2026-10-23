// Real-Time Hospital & Doctor Availability Calculation Engine
const DAYS_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Converts a 12-hour ("08:00 AM", "10:30 PM") or 24-hour ("08:00", "22:30") time string
 * into minutes since midnight (0 - 1439).
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const s = timeStr.trim().toUpperCase();
  const match12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const mins = parseInt(match12[2], 10);
    const period = match12[3];
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }
  const match24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }
  return null;
}

/**
 * Parses an operatingHours string (e.g., "08:00 AM - 10:00 PM", "24 Hours / 7 Days")
 * or structured operatingSchedule into open/close minutes and active days.
 */
function parseOperatingWindow(operatingHoursStr, operatingSchedule = null, open24x7 = false) {
  if (open24x7 || (operatingHoursStr && /24\s*(hours|\/|x)/i.test(operatingHoursStr))) {
    return {
      is24x7: true,
      openMinutes: 0,
      closeMinutes: 1439,
      openFormatted: '00:00',
      closeFormatted: '23:59',
      days: DAYS_MAP
    };
  }

  if (operatingSchedule && operatingSchedule.openTime && operatingSchedule.closeTime) {
    const oMin = parseTimeToMinutes(operatingSchedule.openTime);
    const cMin = parseTimeToMinutes(operatingSchedule.closeTime);
    if (oMin !== null && cMin !== null) {
      return {
        is24x7: false,
        openMinutes: oMin,
        closeMinutes: cMin,
        openFormatted: operatingSchedule.openTime,
        closeFormatted: operatingSchedule.closeTime,
        days: Array.isArray(operatingSchedule.days) && operatingSchedule.days.length > 0
          ? operatingSchedule.days
          : DAYS_MAP
      };
    }
  }

  if (operatingHoursStr && typeof operatingHoursStr === 'string') {
    const rangeMatch = operatingHoursStr.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–to]+\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (rangeMatch) {
      const oMin = parseTimeToMinutes(rangeMatch[1]);
      const cMin = parseTimeToMinutes(rangeMatch[2]);
      if (oMin !== null && cMin !== null) {
        return {
          is24x7: false,
          openMinutes: oMin,
          closeMinutes: cMin,
          openFormatted: rangeMatch[1].trim(),
          closeFormatted: rangeMatch[2].trim(),
          days: parseDaysFromText(operatingHoursStr)
        };
      }
    }
  }

  return {
    is24x7: Boolean(open24x7),
    openMinutes: 8 * 60,
    closeMinutes: 20 * 60,
    openFormatted: '08:00 AM',
    closeFormatted: '08:00 PM',
    days: DAYS_MAP
  };
}

function parseDaysFromText(text) {
  if (!text) return DAYS_MAP;
  const rangeMatch = text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*[-–to]+\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i);
  if (rangeMatch) {
    const startIdx = DAYS_MAP.findIndex(d => d.toLowerCase() === rangeMatch[1].slice(0, 3).toLowerCase());
    const endIdx = DAYS_MAP.findIndex(d => d.toLowerCase() === rangeMatch[2].slice(0, 3).toLowerCase());
    if (startIdx !== -1 && endIdx !== -1) {
      const days = [];
      let i = startIdx;
      while (true) {
        days.push(DAYS_MAP[i]);
        if (i === endIdx) break;
        i = (i + 1) % 7;
      }
      return days;
    }
  }
  const explicitDays = DAYS_MAP.filter(d => new RegExp(`\\b${d}`, 'i').test(text));
  return explicitDays.length > 0 ? explicitDays : DAYS_MAP;
}

function resolveReferenceTime(checkTimeInput = null) {
  if (!checkTimeInput) return new Date();
  // Support "HH:MM" or "HH:MM AM/PM" time string on current date
  const mins = parseTimeToMinutes(String(checkTimeInput));
  if (mins !== null) {
    const d = new Date();
    d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    return d;
  }
  const parsed = new Date(checkTimeInput);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Dynamically calculates real-time hospital availability from operating hours and bed counts.
 */
function computeHospitalAvailability(hospital, checkTimeInput = null) {
  const refDate = resolveReferenceTime(checkTimeInput);
  const currentDayShort = DAYS_MAP[refDate.getDay()];
  const currentDayFull = FULL_DAYS[refDate.getDay()];
  const currentMinutes = refDate.getHours() * 60 + refDate.getMinutes();
  const formattedTime = `${String(refDate.getHours()).padStart(2, '0')}:${String(refDate.getMinutes()).padStart(2, '0')}`;

  const window = parseOperatingWindow(hospital.operatingHours, hospital.operatingSchedule, hospital.open24x7);
  const isDayActive = window.days.includes(currentDayShort);

  let isOpenNow = false;
  if (window.is24x7) {
    isOpenNow = true;
  } else if (isDayActive) {
    if (window.closeMinutes >= window.openMinutes) {
      isOpenNow = currentMinutes >= window.openMinutes && currentMinutes <= window.closeMinutes;
    } else {
      // Overnight shift (e.g. 20:00 - 06:00)
      isOpenNow = currentMinutes >= window.openMinutes || currentMinutes <= window.closeMinutes;
    }
  }

  const availableBeds = Number(hospital.availableBeds || 0);
  const icuBedsAvailable = Number(hospital.icuBedsAvailable || 0);
  const ventilatorBedsAvailable = Number(hospital.ventilatorBedsAvailable || 0);
  const hasBedsAvailable = availableBeds > 0;
  const isEmergencyOperational = Boolean(hospital.hasEmergency && (window.is24x7 || isOpenNow));
  const isAvailableNow = Boolean(isOpenNow && hasBedsAvailable);

  let statusLabel = 'Closed';
  if (isOpenNow && hasBedsAvailable) {
    statusLabel = window.is24x7 ? 'Open 24/7 - Beds Available' : `Open Now (Until ${window.closeFormatted})`;
  } else if (isOpenNow && !hasBedsAvailable) {
    statusLabel = 'Open - At Full Bed Capacity';
  } else if (!isOpenNow && isEmergencyOperational) {
    statusLabel = 'OPD Closed - Emergency Triage Open';
  } else {
    statusLabel = `Closed (Opens ${window.openFormatted})`;
  }

  return {
    isOpenNow,
    isAvailableNow,
    isEmergencyOperational,
    hasBedsAvailable,
    statusLabel,
    checkedAt: refDate.toISOString(),
    currentLocalTime: formattedTime,
    currentDay: currentDayFull,
    operatingWindow: {
      is24x7: window.is24x7,
      openTime: window.openFormatted,
      closeTime: window.closeFormatted,
      activeDays: window.days
    },
    beds: {
      totalBeds: Number(hospital.totalBeds || 0),
      availableBeds,
      icuBedsAvailable,
      ventilatorBedsAvailable,
      occupancyRatePercent: hospital.totalBeds > 0
        ? Math.round(((hospital.totalBeds - availableBeds) / hospital.totalBeds) * 100)
        : 0
    }
  };
}

/**
 * Dynamically calculates real-time doctor shift availability.
 */
function computeDoctorAvailability(doctor, checkTimeInput = null) {
  const refDate = resolveReferenceTime(checkTimeInput);
  const currentDayShort = DAYS_MAP[refDate.getDay()];
  const currentMinutes = refDate.getHours() * 60 + refDate.getMinutes();

  const is24x7Shift = Boolean(doctor.availability && /24\s*\/\s*7|24x7/i.test(doctor.availability));
  const window = parseOperatingWindow(doctor.availability, doctor.shiftSchedule, is24x7Shift);
  const isDayActive = window.days.includes(currentDayShort);

  const onRegularShift = window.is24x7 || (isDayActive && currentMinutes >= window.openMinutes && currentMinutes <= window.closeMinutes);
  const isAvailableNow = Boolean(onRegularShift || doctor.emergencyOnCall);

  return {
    isAvailableNow,
    onRegularShift,
    emergencyOnCall: Boolean(doctor.emergencyOnCall),
    dutyStatus: onRegularShift
      ? 'On Regular Shift'
      : (doctor.emergencyOnCall ? 'Available via Emergency On-Call' : 'Off Duty'),
    scheduleWindow: {
      openTime: window.openFormatted,
      closeTime: window.closeFormatted,
      days: window.days
    }
  };
}

module.exports = {
  parseTimeToMinutes,
  parseOperatingWindow,
  computeHospitalAvailability,
  computeDoctorAvailability
};
