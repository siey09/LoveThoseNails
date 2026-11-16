import {
  CalendarOff,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Lock,
  Plus,
  RotateCcw,
  Unlock,
  X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useStudio } from '../context/StudioContext';
import { STUDIO_TIME_SLOTS } from '../data/seedCatalog';
import {
  COMMON_STUDIO_TIMES,
  DEFAULT_OPEN_WEEKDAYS,
  WEEKDAY_OPTIONS,
  buildDefaultWeekdaySlots,
  formatIsoDate,
  formatOpenWeekdaysSummary,
  formatTimeInputToSlot,
  getDayScheduleInfo,
  getWeekdayTimeSlots,
  sortTimeSlots,
} from '../lib/schedule';
import type {
  Appointment,
  AppointmentStatus,
  BookedSlot,
  DayOverrideStatus,
} from '../types/studio';

interface AdminCalendarProps {
  appointments: Appointment[];
  bookedSlots: BookedSlot[];
  onUpdateStatus: (appt: Appointment, nextStatus: AppointmentStatus) => Promise<void>;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AdminCalendar({
  appointments,
  bookedSlots,
  onUpdateStatus,
}: AdminCalendarProps) {
  const {
    scheduleConfig,
    dayOverrides,
    adminUpdateStudioSchedule,
    adminUpdateDaySchedule,
  } = useStudio();

  const now = new Date();
  const todayIso = formatIsoDate(now.getFullYear(), now.getMonth(), now.getDate());

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [selectedWeekday, setSelectedWeekday] = useState<number>(() => now.getDay());
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newDefaultTime, setNewDefaultTime] = useState('18:00');
  const [newDayExtraTime, setNewDayExtraTime] = useState('19:00');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingDayControl, setSavingDayControl] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [dayNotice, setDayNotice] = useState<string | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const flashSchedule = (msg: string) => {
    setScheduleError(null);
    setScheduleNotice(msg);
    window.setTimeout(() => {
      setScheduleNotice((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const flashDayNotice = (msg: string) => {
    setDayError(null);
    setDayNotice(msg);
    window.setTimeout(() => {
      setDayNotice((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Group non-cancelled appointments by date for fast lookup
  const activeAppointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appt of appointments) {
      if (appt.status === 'cancelled') continue;
      const list = map.get(appt.date) || [];
      list.push(appt);
      map.set(appt.date, list);
    }
    return map;
  }, [appointments]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelectedDate(formatIsoDate(t.getFullYear(), t.getMonth(), t.getDate()));
  };

  const selectedWeekdayMeta =
    WEEKDAY_OPTIONS.find((w) => w.day === selectedWeekday) ?? WEEKDAY_OPTIONS[0];
  const isSelectedWeekdayOpen = scheduleConfig.openWeekdays.includes(selectedWeekday);
  const selectedWeekdaySlots = useMemo(
    () => getWeekdayTimeSlots(scheduleConfig, selectedWeekday),
    [scheduleConfig, selectedWeekday],
  );

  const buildWeekdaySlotsSnapshot = (
    overrideDay?: number,
    overrideSlots?: string[],
  ): Record<string, string[]> => {
    const map: Record<string, string[]> = {};
    for (let d = 0; d <= 6; d += 1) {
      map[String(d)] =
        overrideDay === d && overrideSlots
          ? sortTimeSlots(overrideSlots)
          : getWeekdayTimeSlots(scheduleConfig, d);
    }
    return map;
  };

  const handleToggleWeekdayQuickSlot = async (weekday: number, slot: string) => {
    if (savingSchedule) return;
    const current = getWeekdayTimeSlots(scheduleConfig, weekday);
    const exists = current.includes(slot);
    if (!exists && current.length >= 24) {
      setScheduleError('Maximum of 24 time slots reached for this day.');
      return;
    }
    setSavingSchedule(true);
    setScheduleError(null);
    try {
      const nextSlots = exists
        ? current.filter((s) => s !== slot)
        : sortTimeSlots([...current, slot]);
      const nextWeekdayMap = buildWeekdaySlotsSnapshot(weekday, nextSlots);
      const dayName = WEEKDAY_OPTIONS.find((w) => w.day === weekday)?.label || 'Day';
      await adminUpdateStudioSchedule({
        openWeekdays: scheduleConfig.openWeekdays,
        timeSlots: scheduleConfig.timeSlots,
        weekdaySlots: nextWeekdayMap,
      });
      flashSchedule(
        exists
          ? `Removed ${slot} from ${dayName}.`
          : `Added ${slot} to ${dayName}.`,
      );
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Unable to update day hours.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleAddWeekdayCustomSlot = async (e: FormEvent) => {
    e.preventDefault();
    const formatted = formatTimeInputToSlot(newDefaultTime);
    if (!formatted) {
      setScheduleError('Please choose a valid time.');
      return;
    }
    const current = getWeekdayTimeSlots(scheduleConfig, selectedWeekday);
    if (current.includes(formatted)) {
      setScheduleError(`${formatted} is already listed for ${selectedWeekdayMeta.label}.`);
      return;
    }
    if (current.length >= 24) {
      setScheduleError(`Maximum of 24 time slots reached for ${selectedWeekdayMeta.label}.`);
      return;
    }
    setSavingSchedule(true);
    setScheduleError(null);
    try {
      const nextSlots = sortTimeSlots([...current, formatted]);
      await adminUpdateStudioSchedule({
        openWeekdays: scheduleConfig.openWeekdays,
        timeSlots: scheduleConfig.timeSlots,
        weekdaySlots: buildWeekdaySlotsSnapshot(selectedWeekday, nextSlots),
      });
      flashSchedule(`Added ${formatted} to ${selectedWeekdayMeta.label}.`);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Unable to add time slot.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleApplyWeekdayToAllOpen = async () => {
    if (savingSchedule) return;
    setSavingSchedule(true);
    setScheduleError(null);
    try {
      const sourceSlots = sortTimeSlots(selectedWeekdaySlots);
      const nextWeekdayMap = buildWeekdaySlotsSnapshot();
      for (const dayNum of scheduleConfig.openWeekdays) {
        nextWeekdayMap[String(dayNum)] = [...sourceSlots];
      }
      await adminUpdateStudioSchedule({
        openWeekdays: scheduleConfig.openWeekdays,
        timeSlots: sourceSlots.length > 0 ? sourceSlots : scheduleConfig.timeSlots,
        weekdaySlots: nextWeekdayMap,
      });
      flashSchedule(
        `Applied ${selectedWeekdayMeta.label}'s hours (${sourceSlots.length} slots) to all open days.`,
      );
    } catch (err) {
      setScheduleError(
        err instanceof Error ? err.message : 'Unable to copy schedule to open days.',
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleResetDefaultHours = async () => {
    if (savingSchedule) return;
    setSavingSchedule(true);
    setScheduleError(null);
    try {
      await adminUpdateStudioSchedule({
        openWeekdays: DEFAULT_OPEN_WEEKDAYS,
        timeSlots: STUDIO_TIME_SLOTS,
        weekdaySlots: buildDefaultWeekdaySlots(STUDIO_TIME_SLOTS),
      });
      flashSchedule('Reset all weekdays and hours to standard studio schedule.');
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Unable to reset schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const selectedDayObj = new Date(`${selectedDate}T12:00:00`);
  const selectedDayInfo = useMemo(
    () => getDayScheduleInfo(selectedDate, scheduleConfig, dayOverrides, bookedSlots),
    [selectedDate, scheduleConfig, dayOverrides, bookedSlots],
  );
  const selectedOverride = dayOverrides[selectedDate];

  const handleSetDayStatus = async (nextStatus: DayOverrideStatus) => {
    if (savingDayControl) return;
    setSavingDayControl(true);
    setDayError(null);
    try {
      await adminUpdateDaySchedule(selectedDate, { dayStatus: nextStatus });
      if (nextStatus === 'closed') {
        flashDayNotice(`${selectedDate} marked Closed to clients.`);
      } else if (nextStatus === 'open') {
        flashDayNotice(`${selectedDate} opened for bookings.`);
      } else {
        flashDayNotice(`${selectedDate} reset to weekly default.`);
      }
    } catch (err) {
      setDayError(err instanceof Error ? err.message : 'Could not update date status.');
    } finally {
      setSavingDayControl(false);
    }
  };

  const handleClearDateOverrides = async () => {
    if (savingDayControl) return;
    setSavingDayControl(true);
    setDayError(null);
    try {
      await adminUpdateDaySchedule(selectedDate, {
        dayStatus: 'default',
        blockedSlots: [],
        extraSlots: [],
      });
      flashDayNotice(`Cleared all custom overrides for ${selectedDate}.`);
    } catch (err) {
      setDayError(err instanceof Error ? err.message : 'Could not reset date overrides.');
    } finally {
      setSavingDayControl(false);
    }
  };

  const handleToggleDateSlotBlock = async (slot: string, currentlyBlocked: boolean) => {
    if (savingDayControl) return;
    setSavingDayControl(true);
    setDayError(null);
    try {
      const currentBlocked = selectedOverride?.blockedSlots ?? [];
      const nextBlocked = currentlyBlocked
        ? currentBlocked.filter((s) => s !== slot)
        : sortTimeSlots([...currentBlocked, slot]);
      await adminUpdateDaySchedule(selectedDate, { blockedSlots: nextBlocked });
      flashDayNotice(
        currentlyBlocked
          ? `Reopened ${slot} on ${selectedDate}.`
          : `Blocked ${slot} on ${selectedDate}.`,
      );
    } catch (err) {
      setDayError(err instanceof Error ? err.message : 'Could not update slot.');
    } finally {
      setSavingDayControl(false);
    }
  };

  const handleAddDateExtraSlot = async (e: FormEvent) => {
    e.preventDefault();
    const formatted = formatTimeInputToSlot(newDayExtraTime);
    if (!formatted) {
      setDayError('Please choose a valid time.');
      return;
    }
    const alreadyExistsUnblocked =
      selectedDayInfo.allSlots.includes(formatted) &&
      !(selectedOverride?.blockedSlots ?? []).includes(formatted) &&
      !selectedDayInfo.isClosed;
    if (alreadyExistsUnblocked) {
      setDayError(`${formatted} is already open on ${selectedDate}.`);
      return;
    }
    setSavingDayControl(true);
    setDayError(null);
    try {
      const currentBlocked = selectedOverride?.blockedSlots ?? [];
      const currentExtra = selectedOverride?.extraSlots ?? [];
      const weekdayBaseSlots = getWeekdayTimeSlots(scheduleConfig, selectedDayObj.getDay());
      const nextBlocked = selectedDayInfo.isClosed
        ? weekdayBaseSlots.filter((s) => s !== formatted)
        : currentBlocked.filter((s) => s !== formatted);
      const nextExtra = weekdayBaseSlots.includes(formatted)
        ? currentExtra
        : sortTimeSlots([...currentExtra, formatted]);
      if (nextExtra.length > 24) {
        setDayError('Maximum of 24 extra time slots reached for this date.');
        return;
      }
      await adminUpdateDaySchedule(selectedDate, {
        blockedSlots: nextBlocked,
        extraSlots: nextExtra,
        dayStatus: selectedDayInfo.isClosed ? 'open' : selectedOverride?.dayStatus,
      });
      flashDayNotice(`Opened ${formatted} for ${selectedDate}.`);
    } catch (err) {
      setDayError(err instanceof Error ? err.message : 'Could not add time slot.');
    } finally {
      setSavingDayControl(false);
    }
  };

  const handleRemoveDateExtraSlot = async (slot: string) => {
    if (savingDayControl) return;
    setSavingDayControl(true);
    setDayError(null);
    try {
      const currentExtra = selectedOverride?.extraSlots ?? [];
      const currentBlocked = selectedOverride?.blockedSlots ?? [];
      const nextExtra = currentExtra.filter((s) => s !== slot);
      const nextBlocked = currentBlocked.filter((s) => s !== slot);
      await adminUpdateDaySchedule(selectedDate, {
        extraSlots: nextExtra,
        blockedSlots: nextBlocked,
      });
      flashDayNotice(`Removed extra slot ${slot} from ${selectedDate}.`);
    } catch (err) {
      setDayError(err instanceof Error ? err.message : 'Could not remove slot.');
    } finally {
      setSavingDayControl(false);
    }
  };

  const handleToggleDateQuickSlot = async (slot: string) => {
    if (savingDayControl) return;
    const slotState = selectedDayInfo.adminSlots.find((s) => s.slot === slot);
    if (slotState?.isBooked) {
      setDayError(`${slot} already has an active booking on ${selectedDate}.`);
      return;
    }

    setSavingDayControl(true);
    setDayError(null);
    try {
      const weekdayBaseSlots = getWeekdayTimeSlots(scheduleConfig, selectedDayObj.getDay());
      const currentBlocked = selectedOverride?.blockedSlots ?? [];
      const currentExtra = selectedOverride?.extraSlots ?? [];

      if (selectedDayInfo.isClosed) {
        const nextBlocked = weekdayBaseSlots.filter((s) => s !== slot);
        const nextExtra = weekdayBaseSlots.includes(slot)
          ? currentExtra
          : sortTimeSlots([...currentExtra, slot]);
        if (nextExtra.length > 24) {
          setDayError('Maximum of 24 extra time slots reached for this date.');
          return;
        }
        await adminUpdateDaySchedule(selectedDate, {
          dayStatus: 'open',
          blockedSlots: nextBlocked,
          extraSlots: nextExtra,
        });
        flashDayNotice(`Opened ${slot} for ${selectedDate}.`);
        return;
      }

      const isCurrentlyOpen = Boolean(
        slotState && !slotState.isBlocked && selectedDayInfo.allSlots.includes(slot),
      );

      if (isCurrentlyOpen) {
        const nextBlocked = weekdayBaseSlots.includes(slot)
          ? sortTimeSlots([...currentBlocked, slot])
          : currentBlocked.filter((s) => s !== slot);
        const nextExtra = weekdayBaseSlots.includes(slot)
          ? currentExtra
          : currentExtra.filter((s) => s !== slot);
        await adminUpdateDaySchedule(selectedDate, {
          blockedSlots: nextBlocked,
          extraSlots: nextExtra,
        });
        flashDayNotice(`Removed ${slot} on ${selectedDate}.`);
      } else {
        const nextBlocked = currentBlocked.filter((s) => s !== slot);
        const nextExtra = weekdayBaseSlots.includes(slot)
          ? currentExtra
          : sortTimeSlots([...currentExtra, slot]);
        if (nextExtra.length > 24) {
          setDayError('Maximum of 24 extra time slots reached for this date.');
          return;
        }
        await adminUpdateDaySchedule(selectedDate, {
          blockedSlots: nextBlocked,
          extraSlots: nextExtra,
        });
        flashDayNotice(`Opened ${slot} on ${selectedDate}.`);
      }
    } catch (err) {
      setDayError(err instanceof Error ? err.message : 'Could not update time slot.');
    } finally {
      setSavingDayControl(false);
    }
  };

  const handleClearOpenSlotsForDate = async () => {
    if (savingDayControl) return;
    setSavingDayControl(true);
    setDayError(null);
    try {
      const bookedSet = new Set(
        selectedDayInfo.adminSlots.filter((s) => s.isBooked).map((s) => s.slot),
      );
      const weekdayBaseSlots = getWeekdayTimeSlots(scheduleConfig, selectedDayObj.getDay());
      const nextBlocked = sortTimeSlots(
        weekdayBaseSlots.filter((s) => !bookedSet.has(s)),
      );
      const currentExtra = selectedOverride?.extraSlots ?? [];
      const nextExtra = sortTimeSlots(currentExtra.filter((s) => bookedSet.has(s)));
      await adminUpdateDaySchedule(selectedDate, {
        blockedSlots: nextBlocked,
        extraSlots: nextExtra,
      });
      flashDayNotice(
        `Cleared unbooked slots on ${selectedDate}. Tap any time below to open specific hours.`,
      );
    } catch (err) {
      setDayError(err instanceof Error ? err.message : 'Could not clear slots for this date.');
    } finally {
      setSavingDayControl(false);
    }
  };

  const handleReopenAllDefaultSlotsForDate = async () => {
    if (savingDayControl) return;
    setSavingDayControl(true);
    setDayError(null);
    try {
      await adminUpdateDaySchedule(selectedDate, {
        dayStatus: selectedDayInfo.isWeeklyOpen ? 'default' : 'open',
        blockedSlots: [],
      });
      flashDayNotice(`Reopened all default hours for ${selectedDate}.`);
    } catch (err) {
      setDayError(err instanceof Error ? err.message : 'Could not reopen default slots.');
    } finally {
      setSavingDayControl(false);
    }
  };

  const selectedDayActiveAppts = useMemo(() => {
    return (activeAppointmentsByDate.get(selectedDate) || []).slice().sort((a, b) =>
      a.timeSlot.localeCompare(b.timeSlot),
    );
  }, [activeAppointmentsByDate, selectedDate]);

  const selectedDayCancelledAppts = useMemo(() => {
    return appointments.filter((a) => a.date === selectedDate && a.status === 'cancelled');
  }, [appointments, selectedDate]);

  const slotRows = useMemo(() => {
    return selectedDayInfo.adminSlots.map((slotState) => {
      const matchedAppt =
        selectedDayActiveAppts.find((a) => a.timeSlot === slotState.slot) || null;
      return { ...slotState, appt: matchedAppt };
    });
  }, [selectedDayInfo.adminSlots, selectedDayActiveAppts]);

  const extraAppts = useMemo(() => {
    const slotSet = new Set(selectedDayInfo.allSlots);
    return selectedDayActiveAppts.filter((a) => !slotSet.has(a.timeSlot));
  }, [selectedDayActiveAppts, selectedDayInfo.allSlots]);

  const triggerStatus = async (appt: Appointment, nextStatus: AppointmentStatus) => {
    setBusyId(appt.id);
    setDayError(null);
    try {
      await onUpdateStatus(appt, nextStatus);
    } catch (err) {
      setDayError(
        err instanceof Error ? err.message : 'Unable to update appointment status.',
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="neu-surface p-4 sm:p-8 space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-[#554C4B]">
            Studio Schedule &amp; Availability
          </p>
          <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-semibold text-[#141212]">
            Admin Calendar
          </h2>
          <p className="text-xs text-[#554C4B]">
            Control open days, add/remove studio hours, or block/open specific slots for any date.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={handleJumpToday}
            className="min-h-[40px] px-3 py-2 neu-btn text-xs font-medium text-[#141212] cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="min-h-[40px] min-w-[40px] p-2.5 flex items-center justify-center neu-btn text-[#141212] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-['Playfair_Display'] text-sm sm:text-base font-semibold text-[#141212] sm:min-w-[145px] text-center">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="min-h-[40px] min-w-[40px] p-2.5 flex items-center justify-center neu-btn text-[#141212] cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Per-Weekday Studio Hours & Open Days Controls */}
      <div id="weekly-schedule-panel" className="neu-inset p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8A5A5C]" />
              <p className="text-xs sm:text-sm font-semibold text-[#141212]">
                Weekly Hours by Day of the Week
              </p>
            </div>
            <p className="text-[11px] text-[#554C4B]">
              Pick a day (Sun–Sat) to set its default time slots, or customize any specific date below.
            </p>
          </div>
          <button
            type="button"
            disabled={savingSchedule}
            onClick={handleResetDefaultHours}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 neu-btn text-[11px] font-medium text-[#554C4B] hover:text-[#141212] cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Default</span>
          </button>
        </div>

        {/* Day Selector Strip */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
          {WEEKDAY_OPTIONS.map(({ day, short }) => {
            const isOpen = scheduleConfig.openWeekdays.includes(day);
            const isActiveTab = selectedWeekday === day;
            const daySlotCount = getWeekdayTimeSlots(scheduleConfig, day).length;
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setSelectedWeekday(day);
                  setScheduleError(null);
                }}
                aria-pressed={isActiveTab}
                className={`px-2 py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                  isActiveTab
                    ? 'neu-btn-ink'
                    : isOpen
                      ? 'neu-btn text-[#141212]'
                      : 'neu-surface-sm text-[#8E353B]/75 opacity-75'
                }`}
              >
                <span className="text-xs font-semibold leading-tight">{short}</span>
                <span
                  className={`text-[10px] font-mono tabular-nums leading-tight ${
                    isActiveTab
                      ? 'text-white/80'
                      : isOpen
                        ? 'text-[#16A34A]'
                        : 'text-[#8E353B]'
                  }`}
                >
                  {isOpen ? `${daySlotCount} slots` : 'Closed'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Weekday Editor */}
        <div className="neu-surface-sm p-3.5 sm:p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#141212]">
                  {selectedWeekdayMeta.label} Schedule
                </p>
                <span
                  className={`text-[11px] font-semibold ${
                    isSelectedWeekdayOpen ? 'text-[#16A34A]' : 'text-[#8E353B]'
                  }`}
                >
                  {isSelectedWeekdayOpen
                    ? `Open (${selectedWeekdaySlots.length} ${
                        selectedWeekdaySlots.length === 1 ? 'slot' : 'slots'
                      })`
                    : 'Closed by Default'}
                </span>
              </div>
              <p className="text-[11px] text-[#554C4B] mt-0.5">
                {isSelectedWeekdayOpen
                  ? `Clients booking on a ${selectedWeekdayMeta.label} will see the slots below unless customized on a specific date.`
                  : `${selectedWeekdayMeta.label}s are closed by default. You can still open any specific ${selectedWeekdayMeta.label} date in the Selected Date panel below.`}
              </p>
            </div>
          </div>

          <div className="neu-divider" />

          {/* Active Slots for Selected Weekday */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#554C4B]">
              Active Time Slots for {selectedWeekdayMeta.label} ({selectedWeekdaySlots.length})
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {selectedWeekdaySlots.length === 0 ? (
                <p className="text-xs text-[#8E353B]">
                  No slots set for {selectedWeekdayMeta.label}. Tap any hour below or add a custom time.
                </p>
              ) : (
                selectedWeekdaySlots.map((slot) => (
                  <span
                    key={slot}
                    className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 neu-inset text-xs font-mono font-medium text-[#141212]"
                  >
                    <span>{slot}</span>
                    <button
                      type="button"
                      disabled={savingSchedule}
                      onClick={() => handleToggleWeekdayQuickSlot(selectedWeekday, slot)}
                      aria-label={`Remove ${slot} from ${selectedWeekdayMeta.label}`}
                      className="p-1 rounded-lg text-[#554C4B] hover:text-[#8E353B] cursor-pointer disabled:opacity-40"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Quick-Toggle Common Studio Hours */}
          <div className="space-y-2">
            <p className="text-[11px] text-[#554C4B]">
              Quick toggle hours for {selectedWeekdayMeta.label}:
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {COMMON_STUDIO_TIMES.map((time) => {
                const active = selectedWeekdaySlots.includes(time);
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={savingSchedule}
                    onClick={() => handleToggleWeekdayQuickSlot(selectedWeekday, time)}
                    aria-pressed={active}
                    className={`px-2.5 py-1.5 text-[11px] font-mono tabular-nums cursor-pointer disabled:opacity-50 ${
                      active
                        ? 'neu-btn-rose font-semibold text-[#141212]'
                        : 'neu-btn text-[#554C4B]'
                    }`}
                  >
                    {active ? `✓ ${time}` : `+ ${time}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Time Input + Copy to All Open Days */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <form
              onSubmit={handleAddWeekdayCustomSlot}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                type="time"
                required
                value={newDefaultTime}
                onChange={(e) => setNewDefaultTime(e.target.value)}
                aria-label={`Custom time slot for ${selectedWeekdayMeta.label}`}
                className="neu-input px-3 py-1.5 text-xs font-mono text-[#141212]"
              />
              <button
                type="submit"
                disabled={savingSchedule}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 neu-btn-ink text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to {selectedWeekdayMeta.short}</span>
              </button>
            </form>

            {scheduleConfig.openWeekdays.length > 1 && (
              <button
                type="button"
                disabled={savingSchedule}
                onClick={handleApplyWeekdayToAllOpen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 neu-btn text-[11px] font-medium text-[#554C4B] hover:text-[#141212] cursor-pointer disabled:opacity-50"
              >
                <Copy className="w-3 h-3" />
                <span>Copy {selectedWeekdayMeta.short} hours to all open days</span>
              </button>
            )}
          </div>
        </div>

        {scheduleNotice && (
          <p className="text-xs font-medium text-[#16A34A]">{scheduleNotice}</p>
        )}
        {scheduleError && (
          <p className="text-xs font-medium text-[#8E353B]">{scheduleError}</p>
        )}
      </div>

      <div className="neu-divider" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Monthly Grid */}
        <div className="lg:col-span-7 space-y-2">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-[11px] font-medium text-[#554C4B] pb-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1">
                <span className="sm:hidden">{day.slice(0, 2)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="h-11 sm:h-16 rounded-xl sm:rounded-2xl bg-[#EDE5E4]/40"
              />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const iso = formatIsoDate(viewYear, viewMonth, day);
              const info = getDayScheduleInfo(iso, scheduleConfig, dayOverrides, bookedSlots);
              const isToday = iso === todayIso;
              const isSelected = selectedDate === iso;
              const dayAppts = activeAppointmentsByDate.get(iso) || [];
              const activeSlotCount = new Set(
                bookedSlots
                  .filter((b) => b.date === iso && b.status === 'active')
                  .map((b) => b.timeSlot),
              ).size;
              const bookingCount = Math.max(dayAppts.length, activeSlotCount);
              const hasOverride = Boolean(dayOverrides[iso]);

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    setSelectedDate(iso);
                    setDayNotice(null);
                    setDayError(null);
                  }}
                  className={`h-11 sm:h-16 p-1 sm:p-2 !rounded-xl sm:!rounded-[14px] flex flex-col items-center sm:items-stretch justify-center sm:justify-between text-center sm:text-left cursor-pointer ${
                    isSelected
                      ? 'neu-btn-ink'
                      : bookingCount > 0
                        ? 'neu-btn-rose font-medium'
                        : info.isClosed
                          ? 'neu-inset text-[#554C4B]/55'
                          : 'neu-btn text-[#141212]'
                  }`}
                >
                  <div className="flex items-center justify-center sm:justify-between w-full">
                    <span className="font-mono tabular-nums text-[11px] sm:text-xs font-medium leading-none">
                      {day}
                    </span>
                    {isToday ? (
                      <span
                        className={`hidden sm:inline text-[9px] uppercase tracking-wider font-semibold ${
                          isSelected ? 'text-white/80' : 'text-[#8A5A5C]'
                        }`}
                      >
                        Today
                      </span>
                    ) : hasOverride ? (
                      <span
                        className={`hidden sm:inline w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-white/80' : 'bg-[#8A5A5C]'
                        }`}
                        title="Custom day override"
                      />
                    ) : null}
                  </div>

                  <span
                    className={`hidden sm:inline text-[10px] font-mono tabular-nums truncate ${
                      isSelected ? 'text-white/85' : 'text-[#554C4B]'
                    }`}
                  >
                    {bookingCount > 0
                      ? `${bookingCount} ${bookingCount === 1 ? 'appt' : 'appts'}`
                      : info.isClosed
                        ? 'Closed'
                        : `${info.openCount} open`}
                  </span>

                  <span
                    className={`sm:hidden text-[9px] font-mono tabular-nums leading-none mt-1 ${
                      isSelected ? 'text-white/85' : 'text-[#554C4B]'
                    }`}
                  >
                    {bookingCount > 0 ? `${bookingCount}` : info.isClosed ? 'Off' : `${info.openCount}`}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#554C4B]">
            <span>{formatOpenWeekdaysSummary(scheduleConfig.openWeekdays)}</span>
            <span>·</span>
            <span className="text-[#141212] font-medium">
              Rose-tinted dates have client bookings
            </span>
          </div>
        </div>

        {/* Selected Date Schedule Panel */}
        <div className="lg:col-span-5 neu-inset p-4 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-[#554C4B]">Selected Date</p>
              <p className="font-mono text-base font-semibold text-[#141212] mt-0.5">
                {selectedDate}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-[#141212]">
                {selectedDayObj.toLocaleDateString('en-US', { weekday: 'long' })}
              </p>
              <p className="text-[11px] font-mono tabular-nums text-[#554C4B] mt-0.5">
                {selectedDayInfo.isClosed
                  ? 'Closed'
                  : `${selectedDayInfo.openCount} open · ${selectedDayActiveAppts.length} booked`}
              </p>
            </div>
          </div>

          {/* Per-Date Open / Close Control */}
          <div className="neu-surface-sm p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="text-xs">
                <span className="text-[#554C4B]">Date Status: </span>
                <span
                  className={`font-semibold ${
                    selectedDayInfo.isClosed ? 'text-[#8E353B]' : 'text-[#16A34A]'
                  }`}
                >
                  {selectedDayInfo.isClosed ? 'Closed to Clients' : 'Open for Booking'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedWeekday(selectedDayInfo.dayOfWeek);
                  document
                    .getElementById('weekly-schedule-panel')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
                className="text-[11px] text-[#8A5A5C] hover:text-[#141212] underline underline-offset-2 cursor-pointer"
              >
                Edit all {selectedDayObj.toLocaleDateString('en-US', { weekday: 'long' })}s weekly hours
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {selectedDayInfo.isClosed ? (
                <button
                  type="button"
                  disabled={savingDayControl}
                  onClick={() => handleSetDayStatus('open')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 neu-btn-ink text-[11px] font-medium cursor-pointer disabled:opacity-50"
                >
                  <CalendarCheck2 className="w-3.5 h-3.5" />
                  <span>{savingDayControl ? 'Saving...' : 'Open This Date'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={savingDayControl}
                  onClick={() => handleSetDayStatus('closed')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 neu-btn-rose text-[11px] font-medium text-[#8E353B] cursor-pointer disabled:opacity-50"
                >
                  <CalendarOff className="w-3.5 h-3.5" />
                  <span>{savingDayControl ? 'Saving...' : 'Close This Date'}</span>
                </button>
              )}
              {selectedOverride && (
                <button
                  type="button"
                  disabled={savingDayControl}
                  onClick={handleClearDateOverrides}
                  className="px-2.5 py-1.5 neu-btn text-[11px] text-[#554C4B] cursor-pointer disabled:opacity-50"
                >
                  Reset Date
                </button>
              )}
            </div>
          </div>

          {dayNotice && (
            <p className="neu-surface-sm px-3 py-2 text-xs font-medium text-[#16A34A]">
              {dayNotice}
            </p>
          )}
          {dayError && (
            <p className="neu-surface-sm px-3 py-2 text-xs font-medium text-[#8E353B]">
              {dayError}
            </p>
          )}

          <div className="neu-divider" />

          {/* Quick Per-Date Available Time Picker */}
          <div className="neu-surface-sm p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[#141212]">
                  Available Times on {selectedDate}
                </p>
                <p className="text-[11px] text-[#554C4B]">
                  Tap hours below to set custom times for this exact date only.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {!selectedDayInfo.isClosed && selectedDayInfo.openCount > 0 && (
                  <button
                    type="button"
                    disabled={savingDayControl}
                    onClick={handleClearOpenSlotsForDate}
                    className="px-2.5 py-1 neu-btn text-[11px] font-medium text-[#8E353B] cursor-pointer disabled:opacity-50"
                  >
                    Clear Open
                  </button>
                )}
                {(selectedOverride?.blockedSlots?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    disabled={savingDayControl}
                    onClick={handleReopenAllDefaultSlotsForDate}
                    className="px-2.5 py-1 neu-btn text-[11px] font-medium text-[#554C4B] hover:text-[#141212] cursor-pointer disabled:opacity-50"
                  >
                    Reopen Default
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {COMMON_STUDIO_TIMES.map((time) => {
                const slotState = selectedDayInfo.adminSlots.find((s) => s.slot === time);
                const isBooked = Boolean(slotState?.isBooked);
                const isOpenOnDate = Boolean(
                  !selectedDayInfo.isClosed && slotState && !slotState.isBlocked,
                );
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={savingDayControl || isBooked}
                    onClick={() => handleToggleDateQuickSlot(time)}
                    aria-pressed={isOpenOnDate}
                    className={`px-2.5 py-1 text-[11px] font-mono tabular-nums cursor-pointer disabled:opacity-55 ${
                      isBooked
                        ? 'neu-inset text-[#8A5A5C] font-semibold'
                        : isOpenOnDate
                          ? 'neu-btn-rose font-semibold text-[#141212]'
                          : 'neu-btn text-[#554C4B]'
                    }`}
                  >
                    {isBooked ? `• ${time}` : isOpenOnDate ? `✓ ${time}` : `+ ${time}`}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={handleAddDateExtraSlot}
              className="flex flex-wrap items-center justify-between gap-2 pt-1"
            >
              <span className="text-[11px] text-[#554C4B]">
                Custom time for {selectedDate}:
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  required
                  value={newDayExtraTime}
                  onChange={(e) => setNewDayExtraTime(e.target.value)}
                  aria-label="Add time slot for selected date"
                  className="neu-input px-2.5 py-1.5 text-xs font-mono text-[#141212]"
                />
                <button
                  type="submit"
                  disabled={savingDayControl}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 neu-btn-ink text-[11px] font-medium cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Time</span>
                </button>
              </div>
            </form>
          </div>

          {selectedDayInfo.isClosed && selectedDayActiveAppts.length === 0 ? (
            <div className="py-4 text-center space-y-1.5">
              <p className="text-sm font-medium text-[#141212]">
                Studio Closed on {selectedDate}
              </p>
              <p className="text-xs text-[#554C4B]">
                Tap any time slot above or click &quot;Open This Date&quot; to accept bookings on{' '}
                {selectedDate}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayInfo.isClosed && selectedDayActiveAppts.length > 0 && (
                <p className="neu-surface-sm px-3 py-2 text-[11px] text-[#8E353B]">
                  This date is currently closed to new client bookings. Existing appointments are
                  shown below.
                </p>
              )}

              {slotRows.map(({ slot, isBlocked, isExtra, appt }) => {
                if (!appt) {
                  return (
                    <div
                      key={slot}
                      className={`neu-surface-sm px-3.5 py-2.5 flex items-center justify-between gap-2 ${
                        isBlocked || selectedDayInfo.isClosed ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`font-mono tabular-nums text-xs font-semibold ${
                            isBlocked || selectedDayInfo.isClosed
                              ? 'line-through text-[#554C4B]'
                              : 'text-[#141212]'
                          }`}
                        >
                          {slot}
                        </span>
                        <span
                          className={`text-[11px] ${
                            selectedDayInfo.isClosed
                              ? 'text-[#554C4B]'
                              : isBlocked
                                ? 'text-[#8E353B]'
                                : 'text-[#16A34A]'
                          }`}
                        >
                          {selectedDayInfo.isClosed
                            ? 'Date Closed'
                            : isBlocked
                              ? 'Blocked'
                              : isExtra
                                ? 'Extra open'
                                : 'Open'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={savingDayControl}
                          onClick={() => handleToggleDateSlotBlock(slot, isBlocked)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium cursor-pointer disabled:opacity-50 ${
                            isBlocked
                              ? 'neu-btn-ink'
                              : 'neu-btn text-[#8E353B]'
                          }`}
                        >
                          {isBlocked ? (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>Open</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Block</span>
                            </>
                          )}
                        </button>
                        {isExtra && (
                          <button
                            type="button"
                            disabled={savingDayControl}
                            onClick={() => handleRemoveDateExtraSlot(slot)}
                            aria-label={`Remove extra slot ${slot}`}
                            className="p-1.5 neu-btn text-[#554C4B] hover:text-[#8E353B] cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                const isBusy = busyId === appt.id;
                return (
                  <div
                    key={appt.id}
                    className="neu-surface-sm p-3.5 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono tabular-nums text-xs font-semibold text-[#141212]">
                        {slot} · {appt.bookingCode}
                      </span>
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                          appt.status === 'pending' ? 'text-[#B45309]' : 'text-[#8A5A5C]'
                        }`}
                      >
                        {appt.status === 'pending'
                          ? 'Pending Approval'
                          : appt.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-semibold text-[#141212] break-words">
                        {appt.clientName}
                      </p>
                      <p className="text-[11px] text-[#554C4B] break-all">
                        {appt.clientEmail}
                        {appt.clientPhone ? ` · ${appt.clientPhone}` : ''}
                      </p>
                      <p className="text-xs text-[#554C4B]">
                        {appt.serviceName} · {appt.nailShape} · ${appt.totalPrice}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {appt.status === 'pending' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => triggerStatus(appt, 'confirmed')}
                          className="px-2.5 py-1.5 neu-btn-ink text-[11px] font-medium cursor-pointer disabled:opacity-50"
                        >
                          Confirm &amp; Email
                        </button>
                      )}
                      {(appt.status === 'pending' || appt.status === 'confirmed') && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => triggerStatus(appt, 'in_chair')}
                          className="px-2.5 py-1.5 neu-btn-rose text-[11px] font-medium cursor-pointer disabled:opacity-50"
                        >
                          In Chair
                        </button>
                      )}
                      {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => triggerStatus(appt, 'completed')}
                          className="px-2.5 py-1.5 neu-btn text-[11px] font-medium text-[#141212] cursor-pointer disabled:opacity-50"
                        >
                          Complete
                        </button>
                      )}
                      {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => triggerStatus(appt, 'cancelled')}
                          className="px-2.5 py-1.5 neu-btn text-[11px] font-medium text-[#8E353B] cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {extraAppts.map((appt) => {
                const isBusy = busyId === appt.id;
                return (
                  <div key={appt.id} className="neu-surface-sm p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono tabular-nums text-xs font-semibold text-[#141212]">
                        {appt.timeSlot} · {appt.bookingCode}
                      </span>
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                          appt.status === 'pending' ? 'text-[#B45309]' : 'text-[#8A5A5C]'
                        }`}
                      >
                        {appt.status === 'pending'
                          ? 'Pending Approval'
                          : appt.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#141212] break-words">
                      {appt.clientName}
                    </p>
                    <p className="text-[11px] text-[#554C4B] break-all">
                      {appt.clientEmail} · {appt.serviceName}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {appt.status === 'pending' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => triggerStatus(appt, 'confirmed')}
                          className="px-2.5 py-1.5 neu-btn-ink text-[11px] font-medium cursor-pointer disabled:opacity-50"
                        >
                          Confirm &amp; Email
                        </button>
                      )}
                      {(appt.status === 'pending' || appt.status === 'confirmed') && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => triggerStatus(appt, 'in_chair')}
                          className="px-2.5 py-1.5 neu-btn-rose text-[11px] font-medium cursor-pointer disabled:opacity-50"
                        >
                          In Chair
                        </button>
                      )}
                      {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => triggerStatus(appt, 'completed')}
                          className="px-2.5 py-1.5 neu-btn text-[11px] font-medium text-[#141212] cursor-pointer disabled:opacity-50"
                        >
                          Complete
                        </button>
                      )}
                      {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => triggerStatus(appt, 'cancelled')}
                          className="px-2.5 py-1.5 neu-btn text-[11px] font-medium text-[#8E353B] cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {selectedDayCancelledAppts.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#554C4B]">
                    Cancelled on this date ({selectedDayCancelledAppts.length})
                  </p>
                  {selectedDayCancelledAppts.map((appt) => (
                    <div
                      key={appt.id}
                      className="neu-surface-sm px-3 py-2 text-xs text-[#554C4B] flex items-center justify-between gap-2"
                    >
                      <span className="truncate">
                        {appt.timeSlot} · {appt.clientName}
                      </span>
                      <span className="font-mono text-[11px] shrink-0">{appt.bookingCode}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
