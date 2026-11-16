import { STUDIO_TIME_SLOTS } from '../data/seedCatalog';
import type {
  BookedSlot,
  DayScheduleOverride,
  StudioScheduleConfig,
} from '../types/studio';

export const DEFAULT_OPEN_WEEKDAYS = [0, 2, 3, 4, 5, 6]; // Sun, Tue-Sat open; Mon closed

export function buildDefaultWeekdaySlots(
  baseSlots: string[] = STUDIO_TIME_SLOTS,
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (let d = 0; d <= 6; d += 1) {
    map[String(d)] = [...baseSlots];
  }
  return map;
}

export const DEFAULT_STUDIO_SCHEDULE: StudioScheduleConfig = {
  openWeekdays: DEFAULT_OPEN_WEEKDAYS,
  timeSlots: STUDIO_TIME_SLOTS,
  weekdaySlots: buildDefaultWeekdaySlots(STUDIO_TIME_SLOTS),
};

export const WEEKDAY_OPTIONS = [
  { day: 0, short: 'Sun', label: 'Sunday' },
  { day: 1, short: 'Mon', label: 'Monday' },
  { day: 2, short: 'Tue', label: 'Tuesday' },
  { day: 3, short: 'Wed', label: 'Wednesday' },
  { day: 4, short: 'Thu', label: 'Thursday' },
  { day: 5, short: 'Fri', label: 'Friday' },
  { day: 6, short: 'Sat', label: 'Saturday' },
];

export const COMMON_STUDIO_TIMES = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
];

export function formatIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getTodayIso(): string {
  const now = new Date();
  return formatIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

export function parseTimeSlotToMinutes(slot: string): number {
  const trimmed = slot.trim().toUpperCase();
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(trimmed);
  if (!match) return 9999;
  let hours = Number(match[1]);
  const mins = Number(match[2]);
  const meridiem = match[3];
  if (meridiem === 'AM') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }
  return hours * 60 + mins;
}

export function sortTimeSlots(slots: string[]): string[] {
  const unique = Array.from(new Set(slots.map((s) => s.trim()).filter(Boolean)));
  return unique.sort((a, b) => {
    const diff = parseTimeSlotToMinutes(a) - parseTimeSlotToMinutes(b);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}

export function formatTimeInputToSlot(hhmm: string): string | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h24 = Number(match[1]);
  const mins = Number(match[2]);
  if (Number.isNaN(h24) || Number.isNaN(mins) || h24 < 0 || h24 > 23 || mins < 0 || mins > 59) {
    return null;
  }
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${meridiem}`;
}

export function getWeekdayTimeSlots(
  schedule: StudioScheduleConfig,
  dayOfWeek: number,
): string[] {
  const key = String(dayOfWeek);
  const perDay = schedule.weekdaySlots?.[key];
  if (Array.isArray(perDay)) {
    return sortTimeSlots(perDay);
  }
  return sortTimeSlots(schedule.timeSlots);
}

export interface DaySlotState {
  slot: string;
  isBlocked: boolean;
  isBooked: boolean;
  isExtra: boolean;
  isAvailable: boolean;
}

export interface DayScheduleInfo {
  date: string;
  dayOfWeek: number;
  dayStatus: 'default' | 'open' | 'closed';
  isWeeklyOpen: boolean;
  isClosed: boolean;
  allSlots: string[];
  clientVisibleSlots: DaySlotState[];
  adminSlots: DaySlotState[];
  openCount: number;
}

export function getDayScheduleInfo(
  dateIso: string,
  schedule: StudioScheduleConfig,
  overridesByDate: Record<string, DayScheduleOverride>,
  bookedSlots: BookedSlot[],
): DayScheduleInfo {
  const dayOfWeek = new Date(`${dateIso}T12:00:00`).getDay();
  const isWeeklyOpen = schedule.openWeekdays.includes(dayOfWeek);
  const override = overridesByDate[dateIso];
  const dayStatus = override?.dayStatus ?? 'default';

  const isClosed =
    dayStatus === 'closed' ? true : dayStatus === 'open' ? false : !isWeeklyOpen;

  const weekdayBaseSlots = getWeekdayTimeSlots(schedule, dayOfWeek);
  const extraSet = new Set(override?.extraSlots ?? []);
  const blockedSet = new Set(override?.blockedSlots ?? []);

  const combinedSlots = sortTimeSlots([
    ...weekdayBaseSlots,
    ...(override?.extraSlots ?? []),
  ]);

  const activeBookedForDate = new Set(
    bookedSlots
      .filter((b) => b.date === dateIso && b.status === 'active')
      .map((b) => b.timeSlot),
  );

  const adminSlots: DaySlotState[] = combinedSlots.map((slot) => {
    const isBlocked = blockedSet.has(slot);
    const isBooked = activeBookedForDate.has(slot);
    const isExtra = extraSet.has(slot) && !weekdayBaseSlots.includes(slot);
    const isAvailable = !isClosed && !isBlocked && !isBooked;
    return { slot, isBlocked, isBooked, isExtra, isAvailable };
  });

  // Clients see unblocked slots (including booked ones so they know it's taken)
  const clientVisibleSlots = adminSlots.filter((s) => !s.isBlocked || s.isBooked);
  const openCount = isClosed
    ? 0
    : adminSlots.filter((s) => !s.isBlocked && !s.isBooked).length;

  return {
    date: dateIso,
    dayOfWeek,
    dayStatus,
    isWeeklyOpen,
    isClosed,
    allSlots: combinedSlots,
    clientVisibleSlots,
    adminSlots,
    openCount,
  };
}

export function getNextOpenDateIso(
  schedule: StudioScheduleConfig,
  overridesByDate: Record<string, DayScheduleOverride>,
  bookedSlots: BookedSlot[],
): string {
  const base = new Date();
  for (let offset = 0; offset < 21; offset += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    const iso = formatIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
    const info = getDayScheduleInfo(iso, schedule, overridesByDate, bookedSlots);
    if (!info.isClosed && info.openCount > 0) {
      return iso;
    }
  }
  return getTodayIso();
}

export function formatOpenWeekdaysSummary(openWeekdays: number[]): string {
  if (openWeekdays.length === 0) return 'All days closed by default';
  if (openWeekdays.length === 7) return 'Open daily (Mon – Sun)';
  const sorted = [...openWeekdays].sort((a, b) => a - b);
  const openNames = WEEKDAY_OPTIONS.filter((w) => sorted.includes(w.day)).map((w) => w.short);
  const closedNames = WEEKDAY_OPTIONS.filter((w) => !sorted.includes(w.day)).map((w) => w.short);
  if (closedNames.length === 1) {
    return `Open ${openNames.join(', ')} · Closed ${closedNames[0]}`;
  }
  return `Open: ${openNames.join(', ')} · Closed: ${closedNames.join(', ')}`;
}
