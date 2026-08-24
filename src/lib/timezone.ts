// Timezone utility for Pará (Belém) - UTC-3 (America/Belem)
// Pará uses Brasília Time (UTC-3) year-round (no DST).
const BRAZIL_TIMEZONE = 'America/Belem';

type BrazilNorthDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const getBrazilNorthDateParts = (date: Date = new Date()): BrazilNorthDateParts => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value || 0);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
};

/**
 * Get the current date/time in Brazil timezone (Brasília - UTC-3)
 * Uses Intl API for reliable timezone conversion
 */
export const getBrazilNorthDate = (): Date => {
  const { year, month, day, hour, minute, second } = getBrazilNorthDateParts();

  return new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    second
  );
};

/**
 * Get today's date string (YYYY-MM-DD) in Brazil timezone (Brasília)
 */
export const getBrazilNorthTodayString = (): string => {
  const { year, month, day } = getBrazilNorthDateParts();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Get tomorrow's date string (YYYY-MM-DD) in Brazil timezone
 */
export const getBrazilNorthTomorrowString = (): string => {
  const date = getBrazilNorthDate();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Get current month-year string (YYYY-MM) in Brazil timezone
 */
export const getBrazilNorthMonthYear = (): string => {
  const today = getBrazilNorthTodayString();
  return today.substring(0, 7);
};

/**
 * Get the current month (0-indexed) in Brazil timezone
 */
export const getBrazilNorthMonth = (): number => {
  return getBrazilNorthDate().getMonth();
};

/**
 * Get the current day of month in Brazil timezone
 */
export const getBrazilNorthDayOfMonth = (): number => {
  return getBrazilNorthDate().getDate();
};

/**
 * Get the current year in Brazil timezone
 */
export const getBrazilNorthYear = (): number => {
  return getBrazilNorthDate().getFullYear();
};

/**
 * Get a Date object set to midnight in Brazil timezone
 * for comparison purposes
 */
export const getBrazilNorthMidnight = (): Date => {
  const date = getBrazilNorthDate();
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Convert a date string to a Date object and normalize to midnight
 * for Brazil timezone comparison — constructs the same way as getBrazilNorthMidnight
 */
export const parseDateForBrazilNorth = (dateStr: string): Date => {
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
};

/**
 * Calculate days until an event from Brazil timezone perspective.
 * Both dates are built identically (local-midnight from calendar components)
 * so the diff is always exact.
 */
export const getDaysUntilEventBrazilNorth = (eventDateStr: string): number => {
  const { year: ty, month: tm, day: td } = getBrazilNorthDateParts();

  const [ey, em, ed] = eventDateStr.slice(0, 10).split('-').map(Number);

  const diffTime = Date.UTC(ey, em - 1, ed) - Date.UTC(ty, tm - 1, td);
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Format the current Brazil North date for display (localized)
 */
export const formatBrazilNorthDateDisplay = (): string => {
  return new Date().toLocaleDateString("pt-BR", {
    timeZone: BRAZIL_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/**
 * Get current time string (HH:MM:SS) in Brazil timezone (Brasília - UTC-3)
 */
export const getBrazilNorthTimeString = (): string => {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: BRAZIL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};
