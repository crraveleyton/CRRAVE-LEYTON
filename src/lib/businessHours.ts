/**
 * Business hours for Crrave Leyton
 * Mon - Sun: 12:00 - 00:00 (12:00pm - 12:00am)
 */

export interface BusinessDay {
  day: string;
  open: string;
  close: string;
  openMins: number;
  closeMins: number;
}

export const DEFAULT_BUSINESS_HOURS: Record<number, { open: string; close: string; openMins: number; closeMins: number }> = {
  0: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60 }, // Sun
  1: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60 }, // Mon
  2: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60 }, // Tue
  3: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60 }, // Wed
  4: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60 }, // Thu
  5: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60 }, // Fri
  6: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60 }, // Sat
};

export const BUSINESS_HOURS = DEFAULT_BUSINESS_HOURS;

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface ClosedDateSetting {
  id: string;
  date: string; // YYYY-MM-DD
  reason?: string;
  closeRestaurant: boolean; // closes online ordering
  createdAt?: string;
}

export const getIsoDateString = (dateObj: Date = new Date()): string => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getRestaurantClosedStatus = (
  dateStr: string,
  closedDates?: ClosedDateSetting[]
): { isClosed: boolean; reason?: string } => {
  if (!closedDates || !Array.isArray(closedDates) || !dateStr) {
    return { isClosed: false };
  }
  const match = closedDates.find(c => c.date === dateStr && c.closeRestaurant);
  if (match) {
    return { isClosed: true, reason: match.reason || 'Scheduled restaurant closure' };
  }
  return { isClosed: false };
};

export const isOpenNow = (
  customHours?: typeof DEFAULT_BUSINESS_HOURS,
  closedDates?: ClosedDateSetting[]
) => {
  const todayStr = getIsoDateString();
  const closedStatus = getRestaurantClosedStatus(todayStr, closedDates);
  if (closedStatus.isClosed) {
    return false;
  }

  const hoursConfig = customHours || BUSINESS_HOURS;
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMins = hours * 60 + minutes;
  
  const schedule = hoursConfig[day];
  if (!schedule) return false;
  return currentMins >= schedule.openMins && currentMins <= schedule.closeMins;
};

export const getOpeningTimesText = (customHours?: typeof DEFAULT_BUSINESS_HOURS) => {
  const hoursToUse = customHours || BUSINESS_HOURS;
  const isUniform = [0, 1, 2, 3, 4, 5, 6].every(
    (d) => hoursToUse[d]?.open === hoursToUse[1]?.open && hoursToUse[d]?.close === hoursToUse[1]?.close
  );
  if (isUniform) {
    const formatTime = (t: string) => {
      if (t === '00:00' || t === '24:00') return '12:00am';
      if (t === '12:00') return '12:00pm';
      return t;
    };
    return [
      { days: 'Mon - Sun', hours: `${formatTime(hoursToUse[1].open)} - ${formatTime(hoursToUse[1].close)}` },
    ];
  }
  return [
    { days: 'Mon - Sun', hours: `${hoursToUse[1].open} - ${hoursToUse[1].close}` },
  ];
};

export const getTodayHours = (customHours?: typeof DEFAULT_BUSINESS_HOURS) => {
  const hoursToUse = customHours || BUSINESS_HOURS;
  const day = new Date().getDay();
  return hoursToUse[day];
};
