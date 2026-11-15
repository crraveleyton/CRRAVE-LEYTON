/**
 * Business hours for Crrave Leyton (323A Lea Bridge Road, London E10 7LA)
 * Mon - Sun: 12:00 - 00:00 (12:00pm - 12:00am UK Time)
 */

export interface BusinessDay {
  day: string;
  open: string;
  close: string;
  openMins: number;
  closeMins: number;
  closed?: boolean;
}

export interface DaySchedule {
  open: string;
  close: string;
  openMins: number;
  closeMins: number;
  closed: boolean;
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const DEFAULT_BUSINESS_HOURS: Record<number, DaySchedule> = {
  0: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60, closed: false }, // Sun
  1: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60, closed: false }, // Mon
  2: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60, closed: false }, // Tue
  3: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60, closed: false }, // Wed
  4: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60, closed: false }, // Thu
  5: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60, closed: false }, // Fri
  6: { open: '12:00', close: '00:00', openMins: 12 * 60, closeMins: 24 * 60, closed: false }, // Sat
};

export const BUSINESS_HOURS = DEFAULT_BUSINESS_HOURS;

export interface ClosedDateSetting {
  id: string;
  date: string; // YYYY-MM-DD
  reason?: string;
  closeRestaurant: boolean; // closes online ordering
  createdAt?: string;
}

export const DAY_KEY_MAP: Record<string, number> = {
  sunday: 0,
  sun: 0,
  '0': 0,
  monday: 1,
  mon: 1,
  '1': 1,
  tuesday: 2,
  tue: 2,
  '2': 2,
  wednesday: 3,
  wed: 3,
  '3': 3,
  thursday: 4,
  thu: 4,
  '4': 4,
  friday: 5,
  fri: 5,
  '5': 5,
  saturday: 6,
  sat: 6,
  '6': 6,
};

/**
 * Parse time string (e.g. "12:00", "00:00", "24:00") into total minutes from start of day.
 * When isCloseTime is true, "00:00" and "24:00" are treated as end-of-day (1440 mins).
 */
export function parseTimeToMinutes(timeStr?: string, isCloseTime = false): number {
  if (!timeStr || typeof timeStr !== 'string') {
    return isCloseTime ? 1440 : 720;
  }
  const clean = timeStr.trim();
  if (clean === '00:00' || clean === '24:00' || clean === '24:00:00') {
    return isCloseTime ? 1440 : 0;
  }
  const [hStr, mStr] = clean.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const total = h * 60 + m;
  if (isCloseTime && (total === 0 || clean === '00:00')) {
    return 1440;
  }
  return total;
}

/**
 * Get current London (UK) local time and date info.
 * This guarantees proper timezone detection for Crrave Leyton regardless of client browser timezone.
 */
export function getLondonNow(): {
  date: Date;
  day: number;
  hours: number;
  minutes: number;
  currentMins: number;
  isoDate: string;
} {
  const now = new Date();
  
  // Format YYYY-MM-DD in Europe/London (en-CA standard is YYYY-MM-DD)
  let isoDate = '';
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    isoDate = formatter.format(now);
  } catch (e) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    isoDate = `${y}-${m}-${d}`;
  }

  let londonDate = now;
  try {
    londonDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  } catch (e) {
    londonDate = now;
  }

  const day = londonDate.getDay();
  const hours = londonDate.getHours();
  const minutes = londonDate.getMinutes();
  const currentMins = hours * 60 + minutes;

  return { date: londonDate, day, hours, minutes, currentMins, isoDate };
}

/**
 * Normalizes business hours from any storage structure:
 * - integer keys (0..6)
 * - lowercase strings ("sunday", "monday", ...)
 * Ensures openMins and closeMins are accurate (with 00:00 close = 1440 mins).
 */
export function normalizeBusinessHours(rawHours?: any): Record<number, DaySchedule> & Record<string, DaySchedule> {
  const result: any = {};
  
  // Initialize defaults
  for (let i = 0; i < 7; i++) {
    const defaultDay: DaySchedule = {
      open: '12:00',
      close: '00:00',
      openMins: 720,
      closeMins: 1440,
      closed: false
    };
    result[i] = defaultDay;
    result[DAY_NAMES[i].toLowerCase()] = defaultDay;
  }

  if (!rawHours || typeof rawHours !== 'object') {
    return result;
  }

  for (const [k, v] of Object.entries(rawHours)) {
    const lk = String(k).toLowerCase();
    const idx = DAY_KEY_MAP[lk];
    if (idx !== undefined && v && typeof v === 'object') {
      const item = v as any;
      const open = typeof item.open === 'string' && item.open ? item.open : '12:00';
      const close = typeof item.close === 'string' && item.close ? item.close : '00:00';
      
      const openMins = typeof item.openMins === 'number'
        ? item.openMins
        : parseTimeToMinutes(open, false);
        
      let closeMins = typeof item.closeMins === 'number'
        ? item.closeMins
        : parseTimeToMinutes(close, true);
        
      // If closing time is 00:00 or closeMins <= openMins, treat close as midnight (1440 mins)
      if (closeMins <= openMins && (close === '00:00' || close === '24:00' || closeMins === 0)) {
        closeMins = 1440;
      }

      const dayObj: DaySchedule = {
        open,
        close,
        openMins,
        closeMins,
        closed: Boolean(item.closed)
      };

      result[idx] = dayObj;
      result[DAY_NAMES[idx].toLowerCase()] = dayObj;
    }
  }

  return result;
}

export const getIsoDateString = (dateObj?: Date): string => {
  if (!dateObj) {
    return getLondonNow().isoDate;
  }
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(dateObj);
  } catch (e) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
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
  customHours?: any,
  closedDates?: ClosedDateSetting[]
): boolean => {
  const london = getLondonNow();
  
  // Check if today has a scheduled closure
  const closedStatus = getRestaurantClosedStatus(london.isoDate, closedDates);
  if (closedStatus.isClosed) {
    return false;
  }

  const hoursConfig = normalizeBusinessHours(customHours);
  const schedule = hoursConfig[london.day];
  
  if (!schedule || schedule.closed) {
    return false;
  }

  return london.currentMins >= schedule.openMins && london.currentMins <= schedule.closeMins;
};

export const getOpeningTimesText = (customHours?: any) => {
  const hoursToUse = normalizeBusinessHours(customHours);
  const isUniform = [0, 1, 2, 3, 4, 5, 6].every(
    (d) => hoursToUse[d]?.open === hoursToUse[1]?.open && hoursToUse[d]?.close === hoursToUse[1]?.close && !hoursToUse[d]?.closed
  );

  const formatTime = (t: string) => {
    if (t === '00:00' || t === '24:00') return '12:00am';
    if (t === '12:00') return '12:00pm';
    return t;
  };

  if (isUniform) {
    return [
      { days: 'Mon - Sun', hours: `${formatTime(hoursToUse[1].open)} - ${formatTime(hoursToUse[1].close)}` },
    ];
  }

  return [
    { days: 'Mon - Sun', hours: `${formatTime(hoursToUse[1].open)} - ${formatTime(hoursToUse[1].close)}` },
  ];
};

export const getTodayHours = (customHours?: any) => {
  const hoursToUse = normalizeBusinessHours(customHours);
  const london = getLondonNow();
  return hoursToUse[london.day];
};
