import {
  CalendarCheck2,
  CalendarOff,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  ImageDown,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useStudio } from '../context/StudioContext';
import { STUDIO_TIME_SLOTS } from '../data/seedCatalog';
import { exportAdminCalendarImage } from '../lib/calendarExport';
import {
  COMMON_STUDIO_TIMES,
  DEFAULT_OPEN_WEEKDAYS,
  WEEKDAY_OPTIONS,
  buildDefaultWeekdaySlots,
  formatIsoDate,
  formatOpenWeekdaysSummary,
  formatTimeInputToSlot,
  getDayScheduleInfo,
  getEffectiveWeekdaySlots,
  parseTimeSlotToMinutes,
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
  const [showWeeklyDefaults, setShowWeeklyDefaults] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newDefaultTime, setNewDefaultTime] = useState('18:00');
  const [newDayExtraTime, setNewDayExtraTime] = useState('19:00');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingDayControl, setSavingDayControl] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [dayNotice, setDayNotice] = useState<string | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);
  const [exportingImage, setExportingImage] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

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
    setDayNotice(null);
    setDayError(null);
  };

  const formatActionError = (err: unknown, fallback: string): string => {
    if (!(err instanceof Error)) return fallback;
    try {
      const parsed = JSON.parse(err.message) as { error?: string };
      if (parsed?.error) return parsed.error;
    } catch {
      // plain error message
    }
    return err.message || fallback;
  };

  const getWeekdaySlots = (day: number): string[] =>
    getEffectiveWeekdaySlots(scheduleConfig, day);

  const buildWeekdaySlotsSnapshot = (
    overrideDay?: number,
    overrideSlots?: string[],
  ): Record<string, string[]> => {
    const map: Record<string, string[]> = {};
    for (let d = 0; d <= 6; d += 1) {
      map[String(d)] =
        overrideDay === d && overrideSlots
          ? sortTimeSlots(overrideSlots)
          : getWeekdaySlots(d);
    }
    return map;
  };

  const selectedWeekdayMeta =
    WEEKDAY_OPTIONS.find((w) => w.day === selectedWeekday) ?? WEEKDAY_OPTIONS[0];
  const selectedWeekdaySlots = getWeekdaySlots(selectedWeekday);

  const weeklyChipTimes = useMemo(
    () => sortTimeSlots([...COMMON_STUDIO_TIMES, ...selectedWeekdaySlots]),
    [selectedWeekdaySlots],
  );

  const saveWeekdaySlots = async (
    weekday: number,
    nextSlots: string[],
    successMessage: string,
  ) => {
    setSavingSchedule(true);
    setScheduleError(null);
    try {
      const cleaned = sortTimeSlots(nextSlots).slice(0, 24);
      const nextOpenWeekdays =
        cleaned.length > 0
          ? Array.from(new Set([...scheduleConfig.openWeekdays, weekday])).sort((a, b) => a - b)
          : scheduleConfig.openWeekdays.filter((d) => d !== weekday);
      await adminUpdateStudioSchedule({
        openWeekdays: nextOpenWeekdays,
        timeSlots: scheduleConfig.timeSlots,
        weekdaySlots: buildWeekdaySlotsSnapshot(weekday, cleaned),
      });
      flashSchedule(successMessage);
    } catch (err) {
      setScheduleError(formatActionError(err, 'Unable to update weekday hours.'));
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleToggleWeekdaySlot = async (weekday: number, slot: string) => {
    if (savingSchedule) return;
    const current = getWeekdaySlots(weekday);
    const exists = current.includes(slot);
    if (!exists && current.length >= 24) {
      setScheduleError('Maximum of 24 time slots reached for this day.');
      return;
    }
    const nextSlots = exists
      ? current.filter((s) => s !== slot)
      : sortTimeSlots([...current, slot]);
    const dayName = WEEKDAY_OPTIONS.find((w) => w.day === weekday)?.label || 'Day';
    await saveWeekdaySlots(
      weekday,
      nextSlots,
      exists
        ? nextSlots.length === 0
          ? `${dayName} cleared (now Closed by default).`
          : `Removed ${slot} from ${dayName}.`
        : `Added ${slot} to ${dayName}.`,
    );
  };

  const handleAddWeekdayCustomSlot = async (e: FormEvent) => {
    e.preventDefault();
    const formatted = formatTimeInputToSlot(newDefaultTime);
    if (!formatted) {
      setScheduleError('Please choose a valid time.');
      return;
    }
    if (selectedWeekdaySlots.includes(formatted)) {
      setScheduleError(`${formatted} is already open on ${selectedWeekdayMeta.label}.`);
      return;
    }
    if (selectedWeekdaySlots.length >= 24) {
      setScheduleError(`Maximum of 24 time slots reached for ${selectedWeekdayMeta.label}.`);
      return;
    }
    await saveWeekdaySlots(
      selectedWeekday,
      [...selectedWeekdaySlots, formatted],
      `Added ${formatted} to ${selectedWeekdayMeta.label}.`,
    );
  };

  const handleClearWeekdaySlots = async () => {
    if (savingSchedule) return;
    await saveWeekdaySlots(
      selectedWeekday,
      [],
      `${selectedWeekdayMeta.label} cleared (Closed by default).`,
    );
  };

  const handleApplyWeekdayToAllOpen = async () => {
    if (savingSchedule) return;
    if (selectedWeekdaySlots.length === 0) {
      setScheduleError(`Add at least one slot to ${selectedWeekdayMeta.label} before copying.`);
      return;
    }
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
        timeSlots: sourceSlots,
        weekdaySlots: nextWeekdayMap,
      });
      flashSchedule(
        `Applied ${selectedWeekdayMeta.label}'s hours (${sourceSlots.length} slots) to all open days.`,
      );
    } catch (err) {
      setScheduleError(formatActionError(err, 'Unable to copy schedule to open days.'));
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleResetDefaultHours = async () => {
    if (savingSchedule) return;
    setSavingSchedule(true);
    setScheduleError(null);
    try {
      const defaultMap = buildDefaultWeekdaySlots(STUDIO_TIME_SLOTS);
      defaultMap['1'] = []; // Monday closed by default
      await adminUpdateStudioSchedule({
        openWeekdays: DEFAULT_OPEN_WEEKDAYS,
        timeSlots: STUDIO_TIME_SLOTS,
        weekdaySlots: defaultMap,
      });
      flashSchedule('Reset weekly defaults to standard studio schedule.');
    } catch (err) {
      setScheduleError(formatActionError(err, 'Unable to reset schedule.'));
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
  const isSelectedPastDate = selectedDayInfo.isPastDate;

  const selectedDayActiveAppts = useMemo(() => {
    return (activeAppointmentsByDate.get(selectedDate) || [])
      .slice()
      .sort((a, b) => parseTimeSlotToMinutes(a.timeSlot) - parseTimeSlotToMinutes(b.timeSlot));
  }, [activeAppointmentsByDate, selectedDate]);

  const selectedDayCancelledAppts = useMemo(() => {
    return appointments
      .filter((a) => a.date === selectedDate && a.status === 'cancelled')
      .slice()
      .sort((a, b) => parseTimeSlotToMinutes(a.timeSlot) - parseTimeSlotToMinutes(b.timeSlot));
  }, [appointments, selectedDate]);

  // Unified chronological slot list for Selected Date: standard hours + weekday defaults + extra overrides + booked slots
  const dateChipTimes = useMemo(() => {
    return sortTimeSlots([
      ...COMMON_STUDIO_TIMES,
      ...selectedDayInfo.allSlots,
      ...selectedDayActiveAppts.map((a) => a.timeSlot),
    ]);
  }, [selectedDayInfo.allSlots, selectedDayActiveAppts]);

  const handleSetDayStatus = async (nextStatus: DayOverrideStatus) => {
    if (savingDayControl || isSelectedPastDate) return;
    setSavingDayControl(true);
    setDayError(null);
    try {
      await adminUpdateDaySchedule(selectedDate, { dayStatus: nextStatus });
      if (nextStatus === 'closed') {
        flashDayNotice(
          selectedDayActiveAppts.length > 0
            ? `${selectedDate} closed to new bookings (${selectedDayActiveAppts.length} existing booking(s) still scheduled below).`
            : `${selectedDate} marked Closed to clients.`,
        );
      } else if (nextStatus === 'open') {
        flashDayNotice(`${selectedDate} opened for bookings.`);
      } else {
        flashDayNotice(`${selectedDate} reset to weekly default.`);
      }
    } catch (err) {
      setDayError(formatActionError(err, 'Could not update date status.'));
    } finally {
      setSavingDayControl(false);
    }
  };

  const handleClearDateOverrides = async () => {
    if (savingDayControl || isSelectedPastDate) return;
    setSavingDayControl(true);
    setDayError(null);
    try {
      await adminUpdateDaySchedule(selectedDate, {
        dayStatus: 'default',
        blockedSlots: [],
        extraSlots: [],
      });
      flashDayNotice(`Restored weekly default schedule for ${selectedDate}.`);
    } catch (err) {
      setDayError(formatActionError(err, 'Could not reset date overrides.'));
    } finally {
      setSavingDayControl(false);
    }
  };

  const handleToggleDateSlot = async (slot: string) => {
    if (savingDayControl || isSelectedPastDate) return;

    const slotState = selectedDayInfo.adminSlots.find((s) => s.slot === slot);
    const hasActiveAppt =
      Boolean(slotState?.isBooked) ||
      selectedDayActiveAppts.some((a) => a.timeSlot === slot);
    if (hasActiveAppt) {
      setDayError(`${slot} already has an active client booking on ${selectedDate}.`);
      return;
    }

    setSavingDayControl(true);
    setDayError(null);
    try {
      const weekdayBaseSlots = getWeekdaySlots(selectedDayObj.getDay());
      const currentBlocked = selectedOverride?.blockedSlots ?? [];
      const currentExtra = selectedOverride?.extraSlots ?? [];

      // If whole day was closed, toggling one time opens ONLY that chosen time
      if (selectedDayInfo.isClosed) {
        const nextBlocked = weekdayBaseSlots.filter((s) => s !== slot);
        const nextExtra = weekdayBaseSlots.includes(slot)
          ? currentExtra
          : sortTimeSlots([...currentExtra, slot]);
        if (nextExtra.length > 24) {
          setDayError('Maximum of 24 custom slots reached for this date.');
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
        const nextExtra = currentExtra.filter((s) => s !== slot);
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
          setDayError('Maximum of 24 custom slots reached for this date.');
          return;
        }
        await adminUpdateDaySchedule(selectedDate, {
          blockedSlots: nextBlocked,
          extraSlots: nextExtra,
        });
        flashDayNotice(`Opened ${slot} on ${selectedDate}.`);
      }
    } catch (err) {
      setDayError(formatActionError(err, 'Could not update time slot.'));
    } finally {
      setSavingDayControl(false);
    }
  };

  const handleAddDateCustomSlot = async (e: FormEvent) => {
    e.preventDefault();
    if (savingDayControl || isSelectedPastDate) return;

    const formatted = formatTimeInputToSlot(newDayExtraTime);
    if (!formatted) {
      setDayError('Please choose a valid time.');
      return;
    }

    const slotState = selectedDayInfo.adminSlots.find((s) => s.slot === formatted);
    if (
      !selectedDayInfo.isClosed &&
      slotState &&
      !slotState.isBlocked &&
      selectedDayInfo.allSlots.includes(formatted)
    ) {
      setDayError(`${formatted} is already open on ${selectedDate}.`);
      return;
    }

    setSavingDayControl(true);
    setDayError(null);
    try {
      const weekdayBaseSlots = getWeekdaySlots(selectedDayObj.getDay());
      const currentBlocked = selectedOverride?.blockedSlots ?? [];
      const currentExtra = selectedOverride?.extraSlots ?? [];
      const nextBlocked = selectedDayInfo.isClosed
        ? weekdayBaseSlots.filter((s) => s !== formatted)
        : currentBlocked.filter((s) => s !== formatted);
      const nextExtra = weekdayBaseSlots.includes(formatted)
        ? currentExtra
        : sortTimeSlots([...currentExtra, formatted]);
      if (nextExtra.length > 24) {
        setDayError('Maximum of 24 custom slots reached for this date.');
        return;
      }
      await adminUpdateDaySchedule(selectedDate, {
        dayStatus: selectedDayInfo.isClosed ? 'open' : selectedOverride?.dayStatus,
        blockedSlots: nextBlocked,
        extraSlots: nextExtra,
      });
      flashDayNotice(`Opened ${formatted} for ${selectedDate}.`);
    } catch (err) {
      setDayError(formatActionError(err, 'Could not add time slot.'));
    } finally {
      setSavingDayControl(false);
    }
  };

  const handleClearOpenSlotsForDate = async () => {
    if (savingDayControl || isSelectedPastDate) return;
    setSavingDayControl(true);
    setDayError(null);
    try {
      const bookedSet = new Set(selectedDayActiveAppts.map((a) => a.timeSlot));
      const weekdayBaseSlots = getWeekdaySlots(selectedDayObj.getDay());
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
      setDayError(formatActionError(err, 'Could not clear slots for this date.'));
    } finally {
      setSavingDayControl(false);
    }
  };

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

  const handleSaveCalendarImage = async () => {
    if (exportingImage) return;
    setExportingImage(true);
    setExportError(null);
    setExportNotice(null);
    try {
      const result = await exportAdminCalendarImage({
        viewYear,
        viewMonth,
        todayIso,
        scheduleConfig,
        dayOverrides,
        bookedSlots,
        activeAppointmentsByDate,
      });
      const msg = `Saved ${result.filename} (${result.bookedCount} booked, ${result.openCount} open slots) — ready to post!`;
      setExportNotice(msg);
      window.setTimeout(() => {
        setExportNotice((prev) => (prev === msg ? null : prev));
      }, 6000);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Unable to save calendar image.',
      );
    } finally {
      setExportingImage(false);
    }
  };

  return (
    <div className="neu-surface p-4 sm:p-8 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-[#554C4B]">
            Studio Schedule &amp; Availability
          </p>
          <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-semibold text-[#141212]">
            Admin Calendar
          </h2>
          <p className="text-xs text-[#554C4B]">
            Pick any date to set Eshin&apos;s exact available hours and manage bookings.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          <button
            type="button"
            disabled={exportingImage}
            onClick={handleSaveCalendarImage}
            title="Download high-res calendar PNG showing booked client names & open slots for posting"
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 neu-btn-ink text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            <ImageDown className="w-3.5 h-3.5" />
            <span>{exportingImage ? 'Saving PNG...' : 'Save Image'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWeeklyDefaults((prev) => !prev)}
            className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium cursor-pointer ${
              showWeeklyDefaults ? 'neu-btn-rose text-[#141212]' : 'neu-btn text-[#554C4B]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Weekly Defaults</span>
            {showWeeklyDefaults ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

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
          <span className="font-['Playfair_Display'] text-sm sm:text-base font-semibold text-[#141212] sm:min-w-[140px] text-center">
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

      {exportNotice && (
        <p className="neu-surface-sm px-3.5 py-2 text-xs font-medium text-[#16A34A]">
          {exportNotice}
        </p>
      )}
      {exportError && (
        <p className="neu-surface-sm px-3.5 py-2 text-xs font-medium text-[#8E353B]">
          {exportError}
        </p>
      )}

      {/* Collapsible Weekly Defaults Template */}
      {showWeeklyDefaults && (
        <div id="weekly-schedule-panel" className="neu-inset p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-[#141212]">
                Default Weekly Hours (Optional Template)
              </p>
              <p className="text-[11px] text-[#554C4B]">
                Set repeating hours per weekday (0 slots = Closed). Specific date edits below always
                override these defaults.
              </p>
            </div>
            <button
              type="button"
              disabled={savingSchedule}
              onClick={handleResetDefaultHours}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 neu-btn text-[11px] font-medium text-[#554C4B] hover:text-[#141212] cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Standard</span>
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
            {WEEKDAY_OPTIONS.map(({ day, short }) => {
              const slots = getWeekdaySlots(day);
              const isOpen = slots.length > 0;
              const isActiveTab = selectedWeekday === day;
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
                    {isOpen ? `${slots.length} slots` : 'Closed'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="neu-surface-sm p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#141212]">
                  {selectedWeekdayMeta.label} Default Hours
                </p>
                <span
                  className={`text-[11px] font-semibold ${
                    selectedWeekdaySlots.length > 0 ? 'text-[#16A34A]' : 'text-[#8E353B]'
                  }`}
                >
                  {selectedWeekdaySlots.length > 0
                    ? `${selectedWeekdaySlots.length} open`
                    : 'Closed by Default'}
                </span>
              </div>

              {selectedWeekdaySlots.length > 0 && (
                <button
                  type="button"
                  disabled={savingSchedule}
                  onClick={handleClearWeekdaySlots}
                  className="px-2.5 py-1 neu-btn text-[11px] font-medium text-[#8E353B] cursor-pointer disabled:opacity-50"
                >
                  Clear {selectedWeekdayMeta.short}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {weeklyChipTimes.map((time) => {
                const active = selectedWeekdaySlots.includes(time);
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={savingSchedule}
                    onClick={() => handleToggleWeekdaySlot(selectedWeekday, time)}
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

              {selectedWeekdaySlots.length > 0 && scheduleConfig.openWeekdays.length > 1 && (
                <button
                  type="button"
                  disabled={savingSchedule}
                  onClick={handleApplyWeekdayToAllOpen}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 neu-btn text-[11px] font-medium text-[#554C4B] hover:text-[#141212] cursor-pointer disabled:opacity-50"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy {selectedWeekdayMeta.short} to all open days</span>
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
      )}

      <div className="neu-divider" />

      {/* Main Calendar Grid + Selected Date Control Panel */}
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
                        : info.isClosed || info.isPastDate
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
                        title="Custom date hours"
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
                      : info.isPastDate
                        ? 'Past'
                        : info.isClosed
                          ? 'Closed'
                          : info.openCount === 0
                            ? 'No slots'
                            : `${info.openCount} open`}
                  </span>

                  <span
                    className={`sm:hidden text-[9px] font-mono tabular-nums leading-none mt-1 ${
                      isSelected ? 'text-white/85' : 'text-[#554C4B]'
                    }`}
                  >
                    {bookingCount > 0
                      ? `${bookingCount}`
                      : info.isPastDate
                        ? '—'
                        : info.isClosed || info.openCount === 0
                          ? 'Off'
                          : `${info.openCount}`}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-[#554C4B]">
            <span>{formatOpenWeekdaysSummary(scheduleConfig.openWeekdays)}</span>
            <span>·</span>
            <span className="text-[#141212] font-medium">Rose = bookings</span>
            <span>·</span>
            <span>Dot = custom date hours</span>
          </div>
        </div>

        {/* Selected Date Unified Control Panel */}
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
                {isSelectedPastDate
                  ? 'Past Date'
                  : selectedDayInfo.isClosed
                    ? 'Closed to Clients'
                    : `${selectedDayInfo.openCount} open · ${selectedDayActiveAppts.length} booked`}
              </p>
            </div>
          </div>

          {/* Date Open / Close Status Bar */}
          {!isSelectedPastDate && (
            <div className="neu-surface-sm p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs">
                <span className="text-[#554C4B]">Status: </span>
                <span
                  className={`font-semibold ${
                    selectedDayInfo.isClosed ? 'text-[#8E353B]' : 'text-[#16A34A]'
                  }`}
                >
                  {selectedDayInfo.isClosed ? 'Closed' : 'Open'}
                </span>
                {selectedOverride && (
                  <span className="text-[11px] text-[#8A5A5C] ml-1.5">(Custom)</span>
                )}
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
                    <span>{savingDayControl ? 'Saving...' : 'Close Whole Day'}</span>
                  </button>
                )}
                {selectedOverride && (
                  <button
                    type="button"
                    disabled={savingDayControl}
                    onClick={handleClearDateOverrides}
                    className="px-2.5 py-1.5 neu-btn text-[11px] text-[#554C4B] hover:text-[#141212] cursor-pointer disabled:opacity-50"
                  >
                    Use Default
                  </button>
                )}
              </div>
            </div>
          )}

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

          {/* Single Unified Available Hours Selector for Selected Date */}
          {isSelectedPastDate ? (
            <p className="neu-surface-sm px-3.5 py-2.5 text-xs text-[#554C4B]">
              This date is in the past, so open slot editing is locked. You can still update any
              scheduled bookings below.
            </p>
          ) : (
            <div className="neu-surface-sm p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-[#141212]">
                    Hours for {selectedDate}
                  </p>
                  <p className="text-[11px] text-[#554C4B]">
                    {selectedDayInfo.isClosed
                      ? 'Closed right now — tap any time below to open just that hour.'
                      : 'Tap any hour to toggle it open or closed for this date only.'}
                  </p>
                </div>

                {!selectedDayInfo.isClosed &&
                  selectedDayInfo.adminSlots.some((s) => !s.isBlocked && !s.isBooked) && (
                    <button
                      type="button"
                      disabled={savingDayControl}
                      onClick={handleClearOpenSlotsForDate}
                      className="px-2.5 py-1 neu-btn text-[11px] font-medium text-[#8E353B] cursor-pointer disabled:opacity-50"
                    >
                      Clear All
                    </button>
                  )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {dateChipTimes.map((time) => {
                  const slotState = selectedDayInfo.adminSlots.find((s) => s.slot === time);
                  const isBooked =
                    Boolean(slotState?.isBooked) ||
                    selectedDayActiveAppts.some((a) => a.timeSlot === time);
                  const isOpenOnDate = Boolean(
                    !selectedDayInfo.isClosed && slotState && !slotState.isBlocked,
                  );
                  const isPastTodaySlot = Boolean(
                    isOpenOnDate && slotState?.isPastTime && !isBooked,
                  );

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={savingDayControl || isBooked}
                      onClick={() => handleToggleDateSlot(time)}
                      aria-pressed={isOpenOnDate}
                      title={
                        isBooked
                          ? 'Booked by client'
                          : isPastTodaySlot
                            ? 'Open (already passed today for clients) — click to remove'
                            : isOpenOnDate
                              ? 'Open — click to remove for this date'
                              : 'Closed — click to open for this date'
                      }
                      className={`px-2.5 py-1.5 text-[11px] font-mono tabular-nums cursor-pointer disabled:cursor-not-allowed ${
                        isBooked
                          ? 'neu-inset text-[#8A5A5C] font-semibold opacity-90'
                          : isOpenOnDate
                            ? isPastTodaySlot
                              ? 'neu-btn-rose font-medium text-[#554C4B] opacity-75 disabled:opacity-55'
                              : 'neu-btn-rose font-semibold text-[#141212] disabled:opacity-55'
                            : 'neu-btn text-[#554C4B] disabled:opacity-55'
                      }`}
                    >
                      {isBooked ? `• ${time}` : isOpenOnDate ? `✓ ${time}` : `+ ${time}`}
                    </button>
                  );
                })}
              </div>

              <form
                onSubmit={handleAddDateCustomSlot}
                className="flex flex-wrap items-center justify-between gap-2 pt-1"
              >
                <span className="text-[11px] text-[#554C4B]">Custom time:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    required
                    value={newDayExtraTime}
                    onChange={(e) => setNewDayExtraTime(e.target.value)}
                    aria-label="Add custom time slot for selected date"
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
          )}

          <div className="neu-divider" />

          {/* Bookings Scheduled on Selected Date */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-[#141212]">
              Bookings on {selectedDate} ({selectedDayActiveAppts.length})
            </p>

            {selectedDayActiveAppts.length === 0 ? (
              <p className="text-xs text-[#554C4B] py-2">
                No active bookings on this date yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {selectedDayActiveAppts.map((appt) => {
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
              </div>
            )}

            {selectedDayCancelledAppts.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#554C4B]">
                  Cancelled ({selectedDayCancelledAppts.length})
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
        </div>
      </div>
    </div>
  );
}
