import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { STUDIO_TIME_SLOTS } from '../data/seedCatalog';
import type { Appointment, AppointmentStatus, BookedSlot } from '../types/studio';

interface AdminCalendarProps {
  appointments: Appointment[];
  bookedSlots: BookedSlot[];
  onUpdateStatus: (appt: Appointment, nextStatus: AppointmentStatus) => Promise<void>;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatIso(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function AdminCalendar({
  appointments,
  bookedSlots,
  onUpdateStatus,
}: AdminCalendarProps) {
  const now = new Date();
  const todayIso = formatIso(now.getFullYear(), now.getMonth(), now.getDate());

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [busyId, setBusyId] = useState<string | null>(null);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

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
    setSelectedDate(formatIso(t.getFullYear(), t.getMonth(), t.getDate()));
  };

  const selectedDayObj = new Date(`${selectedDate}T12:00:00`);
  const selectedIsMonday = selectedDayObj.getDay() === 1;

  const selectedDayActiveAppts = useMemo(() => {
    return (activeAppointmentsByDate.get(selectedDate) || []).slice().sort((a, b) =>
      a.timeSlot.localeCompare(b.timeSlot),
    );
  }, [activeAppointmentsByDate, selectedDate]);

  const selectedDayCancelledAppts = useMemo(() => {
    return appointments.filter((a) => a.date === selectedDate && a.status === 'cancelled');
  }, [appointments, selectedDate]);

  const slotRows = useMemo(() => {
    return STUDIO_TIME_SLOTS.map((slot) => {
      const matchedAppt = selectedDayActiveAppts.find((a) => a.timeSlot === slot) || null;
      const slotLocked = bookedSlots.some(
        (b) => b.date === selectedDate && b.timeSlot === slot && b.status === 'active',
      );
      return { slot, appt: matchedAppt, slotLocked };
    });
  }, [selectedDayActiveAppts, bookedSlots, selectedDate]);

  const extraAppts = useMemo(() => {
    const standardSet = new Set(STUDIO_TIME_SLOTS);
    return selectedDayActiveAppts.filter((a) => !standardSet.has(a.timeSlot));
  }, [selectedDayActiveAppts]);

  const triggerStatus = async (appt: Appointment, nextStatus: AppointmentStatus) => {
    setBusyId(appt.id);
    try {
      await onUpdateStatus(appt, nextStatus);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="neu-surface p-4 sm:p-8 space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-[#554C4B]">
            Studio Schedule
          </p>
          <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-semibold text-[#141212]">
            Admin Calendar
          </h2>
          <p className="text-xs text-[#554C4B]">
            Tap any date to inspect booked clients, open time slots, and update appointment status.
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
              const iso = formatIso(viewYear, viewMonth, day);
              const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();
              const isMonday = dayOfWeek === 1;
              const isToday = iso === todayIso;
              const isSelected = selectedDate === iso;
              const dayAppts = activeAppointmentsByDate.get(iso) || [];
              const activeSlotCount = new Set(
                bookedSlots
                  .filter((b) => b.date === iso && b.status === 'active')
                  .map((b) => b.timeSlot),
              ).size;
              const bookingCount = Math.max(dayAppts.length, activeSlotCount);

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(iso)}
                  className={`h-11 sm:h-16 p-1 sm:p-2 !rounded-xl sm:!rounded-[14px] flex flex-col items-center sm:items-stretch justify-center sm:justify-between text-center sm:text-left cursor-pointer ${
                    isSelected
                      ? 'neu-btn-ink'
                      : bookingCount > 0
                        ? 'neu-btn-rose font-medium'
                        : isMonday
                          ? 'neu-inset text-[#554C4B]/55'
                          : 'neu-btn text-[#141212]'
                  }`}
                >
                  <div className="flex items-center justify-center sm:justify-between w-full">
                    <span className="font-mono tabular-nums text-[11px] sm:text-xs font-medium leading-none">
                      {day}
                    </span>
                    {isToday && (
                      <span
                        className={`hidden sm:inline text-[9px] uppercase tracking-wider font-semibold ${
                          isSelected ? 'text-white/80' : 'text-[#8A5A5C]'
                        }`}
                      >
                        Today
                      </span>
                    )}
                  </div>

                  <span
                    className={`hidden sm:inline text-[10px] font-mono tabular-nums truncate ${
                      isSelected ? 'text-white/85' : 'text-[#554C4B]'
                    }`}
                  >
                    {bookingCount > 0
                      ? `${bookingCount} ${bookingCount === 1 ? 'appt' : 'appts'}`
                      : isMonday
                        ? 'Closed'
                        : 'Open'}
                  </span>

                  <span
                    className={`sm:hidden text-[9px] font-mono tabular-nums leading-none mt-1 ${
                      isSelected ? 'text-white/85' : 'text-[#554C4B]'
                    }`}
                  >
                    {bookingCount > 0 ? `${bookingCount}` : isMonday ? 'Off' : '0'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#554C4B]">
            <span>Tue – Sun · 10:00 AM – 7:00 PM</span>
            <span>·</span>
            <span>Mondays Closed</span>
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
                {selectedDayActiveAppts.length}{' '}
                {selectedDayActiveAppts.length === 1 ? 'booking' : 'bookings'}
              </p>
            </div>
          </div>

          <div className="neu-divider" />

          {selectedIsMonday && selectedDayActiveAppts.length === 0 ? (
            <div className="py-8 text-center space-y-1.5">
              <p className="text-sm font-medium text-[#141212]">Studio Closed on Mondays</p>
              <p className="text-xs text-[#554C4B]">
                No appointments scheduled for this Monday.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {slotRows.map(({ slot, appt, slotLocked }) => {
                if (!appt) {
                  return (
                    <div
                      key={slot}
                      className="neu-surface-sm px-3.5 py-2.5 flex items-center justify-between gap-3"
                    >
                      <span className="font-mono tabular-nums text-xs font-semibold text-[#141212]">
                        {slot}
                      </span>
                      <span className="text-xs text-[#554C4B]">
                        {slotLocked ? 'Reserved slot' : 'Open slot'}
                      </span>
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
                  <div key={appt.id} className="neu-surface-sm p-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono tabular-nums text-xs font-semibold text-[#141212]">
                        {appt.timeSlot} · {appt.bookingCode}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A5A5C]">
                        {appt.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#141212] break-words">
                      {appt.clientName}
                    </p>
                    <p className="text-[11px] text-[#554C4B] break-all">
                      {appt.clientEmail} · {appt.serviceName}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
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
