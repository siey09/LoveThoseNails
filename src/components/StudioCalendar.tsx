import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useStudio } from '../context/StudioContext';
import {
  formatIsoDate,
  formatOpenWeekdaysSummary,
  getDayScheduleInfo,
  getNextOpenDateIso,
  getTodayIso,
} from '../lib/schedule';

interface StudioCalendarProps {
  onSelectSlot: (date: string, timeSlot: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function StudioCalendar({ onSelectSlot }: StudioCalendarProps) {
  const {
    bookedSlots,
    appointments,
    emailLogs,
    user,
    cancelAppointment,
    scheduleConfig,
    dayOverrides,
  } = useStudio();

  const now = new Date();
  const todayIso = getTodayIso();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getNextOpenDateIso(scheduleConfig, dayOverrides, bookedSlots),
  );
  const [userPickedDate, setUserPickedDate] = useState(false);

  const [isFlipped, setIsFlipped] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (userPickedDate) return;
    const currentInfo = getDayScheduleInfo(selectedDate, scheduleConfig, dayOverrides, bookedSlots);
    if (currentInfo.isClosed || currentInfo.openCount === 0) {
      setSelectedDate(getNextOpenDateIso(scheduleConfig, dayOverrides, bookedSlots));
    }
  }, [userPickedDate, selectedDate, scheduleConfig, dayOverrides, bookedSlots]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const activeBookings = useMemo(() => {
    if (!user) return [];
    return appointments.filter(
      (a) =>
        a.clientId === user.uid &&
        (a.status === 'pending' || a.status === 'confirmed' || a.status === 'in_chair'),
    );
  }, [appointments, user]);

  const hasActiveBooking = activeBookings.length > 0;
  const hasPendingBooking = activeBookings.some((a) => a.status === 'pending');

  // Auto-flip whenever the client has a pending or accepted/confirmed booking;
  // stays flipped even after admin approval, and only returns to calendar if completed/cancelled.
  useEffect(() => {
    if (!hasActiveBooking) {
      setIsFlipped(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIsFlipped(true);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [hasActiveBooking]);

  const myBookedDates = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(activeBookings.map((a) => a.date));
  }, [activeBookings, user]);

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

  const selectedDayObj = new Date(`${selectedDate}T12:00:00`);
  const selectedIsPast = selectedDate < todayIso;

  const selectedDayInfo = useMemo(
    () => getDayScheduleInfo(selectedDate, scheduleConfig, dayOverrides, bookedSlots),
    [selectedDate, scheduleConfig, dayOverrides, bookedSlots],
  );

  return (
    <div className="flip-perspective w-full">
      <div className={`flip-card-inner ${isFlipped ? 'is-flipped' : ''}`}>
        {/* FRONT FACE: Appointment Calendar */}
        <div
          aria-hidden={isFlipped}
          className={`flip-card-face neu-surface p-4 sm:p-8 space-y-5 sm:space-y-6 ${
            isFlipped ? 'pointer-events-none' : ''
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-[#554C4B]">
                Studio Schedule
              </p>
              <h1 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-semibold text-[#141212]">
                Appointment Calendar
              </h1>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="min-h-[40px] min-w-[40px] p-2.5 flex items-center justify-center neu-btn text-[#141212] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-['Playfair_Display'] text-sm sm:text-base font-semibold text-[#141212] sm:min-w-[150px] text-center">
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
              const iso = formatIsoDate(viewYear, viewMonth, day);
              const dayInfo = getDayScheduleInfo(iso, scheduleConfig, dayOverrides, bookedSlots);
              const isClosed = dayInfo.isClosed;
              const isPast = iso < todayIso;
              const isSelected = selectedDate === iso;
              const hasMyBooking = myBookedDates.has(iso);
              const remaining = dayInfo.openCount;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    setUserPickedDate(true);
                    setSelectedDate(iso);
                  }}
                  className={`h-11 sm:h-16 p-1 sm:p-2 !rounded-xl sm:!rounded-[14px] flex flex-col items-center sm:items-stretch justify-center sm:justify-between text-center sm:text-left cursor-pointer ${
                    isSelected
                      ? 'neu-btn-ink'
                      : isClosed || isPast
                        ? 'neu-inset text-[#554C4B]/55'
                        : hasMyBooking
                          ? 'neu-btn-rose font-medium'
                          : 'neu-btn text-[#141212]'
                  }`}
                >
                  <span className="font-mono tabular-nums text-[11px] sm:text-xs font-medium leading-none">
                    {day}
                  </span>
                  <span
                    className={`hidden sm:inline text-[10px] font-mono tabular-nums truncate ${
                      isSelected ? 'text-white/80' : 'text-[#554C4B]'
                    }`}
                  >
                    {isClosed
                      ? 'Closed'
                      : isPast
                        ? 'Past'
                        : hasMyBooking
                          ? 'Booked'
                          : remaining === 0
                            ? 'Full'
                            : `${remaining} open`}
                  </span>
                  <span
                    className={`sm:hidden text-[9px] font-mono tabular-nums leading-none mt-1 ${
                      isSelected ? 'text-white/85' : 'text-[#554C4B]'
                    }`}
                  >
                    {isClosed
                      ? 'Off'
                      : isPast
                        ? '—'
                        : hasMyBooking
                          ? 'You'
                          : remaining === 0
                            ? 'Full'
                            : `${remaining}`}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#554C4B]">
            <span>{formatOpenWeekdaysSummary(scheduleConfig.openWeekdays)}</span>
            {user && (
              <>
                <span>·</span>
                <span className="text-[#141212] font-medium">
                  Rose-tinted dates indicate your scheduled visits
                </span>
              </>
            )}
          </div>
        </div>

        {/* Selected Day Slot Selector */}
        <div className="lg:col-span-5 neu-inset p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div>
              <p className="text-xs text-[#554C4B]">Selected Date</p>
              <p className="font-mono text-base font-semibold text-[#141212] mt-0.5">
                {selectedDate}
              </p>
            </div>
            <span className="text-xs text-[#554C4B]">
              {selectedDayObj.toLocaleDateString('en-US', { weekday: 'long' })}
            </span>
          </div>

          <div className="neu-divider" />

          {selectedDayInfo.isClosed ? (
            <div className="py-8 text-center space-y-1.5">
              <p className="text-sm font-medium text-[#141212]">Studio Closed on This Date</p>
              <p className="text-xs text-[#554C4B]">
                Please select an open date on the calendar to reserve a time slot.
              </p>
            </div>
          ) : selectedIsPast ? (
            <div className="py-8 text-center space-y-1.5">
              <p className="text-sm font-medium text-[#141212]">Past Date</p>
              <p className="text-xs text-[#554C4B]">
                Please choose today or an upcoming date to view open slots.
              </p>
            </div>
          ) : selectedDayInfo.clientVisibleSlots.length === 0 ? (
            <div className="py-8 text-center space-y-1.5">
              <p className="text-sm font-medium text-[#141212]">No Open Slots Available</p>
              <p className="text-xs text-[#554C4B]">
                All slots on this date are currently unavailable. Please choose another date.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayInfo.clientVisibleSlots.map(({ slot, isBooked }) => (
                <div
                  key={slot}
                  className="neu-surface-sm px-4 py-3 flex items-center justify-between gap-3"
                >
                  <p className="font-mono tabular-nums text-sm font-semibold text-[#141212]">
                    {slot}
                  </p>
                  <button
                    type="button"
                    disabled={isBooked}
                    onClick={() => onSelectSlot(selectedDate, slot)}
                    className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 ${
                      isBooked
                        ? 'neu-inset text-[#554C4B]/60 cursor-not-allowed'
                        : 'neu-btn-ink cursor-pointer'
                    }`}
                  >
                    {isBooked ? 'Booked' : 'Reserve'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

        {/* BACK FACE: Auto-Flipped Live Pending Loading & Accepted Reservation View */}
        <div
          aria-hidden={!isFlipped}
          className={`flip-card-face flip-card-back neu-surface p-4 sm:p-8 space-y-5 sm:space-y-6 ${
            !isFlipped ? 'pointer-events-none' : ''
          }`}
        >
          <div className="space-y-1 pb-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[#554C4B]">
              Love Those Nails by Eshin
            </p>
            <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-semibold text-[#141212]">
              {hasPendingBooking ? 'Booking Confirmation Status' : 'Your Booking Is Accepted'}
            </h2>
          </div>

          <div className="neu-divider" />

          <div className="space-y-5">
            {activeBookings.map((appt) => {
              const emailLog = emailLogs.find((l) => l.appointmentId === appt.id);
              const isPending = appt.status === 'pending';
              const formattedDate = new Date(`${appt.date}T12:00:00`).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div key={appt.id} className="neu-inset p-4 sm:p-6 space-y-5">
                  {/* Top Meta Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xs font-semibold text-[#141212]">
                        {appt.bookingCode}
                      </span>
                      {isPending ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          <span>Pending Approval</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border text-[#16A34A] bg-[#ECFDF5] border-[#A7F3D0]">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Accepted &amp; Confirmed</span>
                        </span>
                      )}
                    </div>

                    <span className="font-mono tabular-nums text-xs sm:text-sm font-semibold text-[#141212]">
                      {appt.date} · {appt.timeSlot}
                    </span>
                  </div>

                  {isPending ? (
                    /* PENDING LOADING STATE */
                    <div className="neu-surface-sm p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-3 text-[#B45309]">
                        <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                        <p className="text-sm sm:text-base font-semibold">
                          Pending Studio Admin Confirmation...
                        </p>
                      </div>

                      <div className="pending-bar-track" aria-hidden="true">
                        <div className="pending-bar-fill" />
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                        <div className="flex items-center gap-1.5 text-[#16A34A] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Requested</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#B45309] font-medium">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Admin Review</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#554C4B]/70">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Email Confirm</span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-[#554C4B] leading-relaxed break-words">
                        We&apos;re waiting for Eshin / Studio Admin to confirm your requested slot on{' '}
                        <span className="font-medium text-[#141212]">{formattedDate}</span> at{' '}
                        <span className="font-mono font-medium text-[#141212]">{appt.timeSlot}</span>.
                        Once approved, this card will automatically update and send a confirmation
                        email to{' '}
                        <span className="font-medium text-[#141212] break-all">
                          {appt.clientEmail}
                        </span>
                        .
                      </p>
                    </div>
                  ) : (
                    /* ACCEPTED / CONFIRMED STATE — STAYS ON THIS VIEW WITH SEE YOU THERE MESSAGE */
                    <div className="neu-rose-panel p-5 sm:p-7 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#FFFFFF]/80 flex items-center justify-center text-[#16A34A] shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#141212]/75 font-medium">
                            {appt.status === 'in_chair' ? 'Now In Chair' : 'Booking Accepted'}
                          </p>
                          <h3 className="font-['Playfair_Display'] text-xl sm:text-2xl font-semibold text-[#141212]">
                            Your booking is accepted on {formattedDate} at {appt.timeSlot}!
                          </h3>
                        </div>
                      </div>

                      <div className="bg-[#FFFFFF]/65 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-[#554C4B]">Confirmed Date</p>
                          <p className="font-mono tabular-nums text-sm font-semibold text-[#141212] mt-0.5">
                            {appt.date}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#554C4B]">Confirmed Time</p>
                          <p className="font-mono tabular-nums text-sm font-semibold text-[#141212] mt-0.5">
                            {appt.timeSlot}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#554C4B]">Service &amp; Artist</p>
                          <p className="text-sm font-semibold text-[#141212] mt-0.5 truncate">
                            {appt.serviceName} · {appt.artistName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 text-sm font-medium text-[#141212] pt-1">
                        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          See you there! We can&apos;t wait to welcome you to Love Those Nails by
                          Eshin (842 Rosemont Terrace, Suite 2B). Please arrive 5 minutes early.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#141212]/80 pt-1 break-words">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {emailLog?.confirmationSentAt ||
                          emailLog?.lastStatusNotified === 'confirmed'
                            ? `Confirmation email sent to ${appt.clientEmail}`
                            : `Confirmation email sent/triggered for ${appt.clientEmail}`}
                        </span>
                        {appt.status === 'confirmed' && (
                          <>
                            <span>·</span>
                            <span>
                              {emailLog?.dayBeforeReminderSentAt
                                ? 'Day-before reminder sent'
                                : 'Day-before reminder scheduled'}
                            </span>
                            <span>·</span>
                            <span>
                              {emailLog?.oneHourReminderSentAt
                                ? '1-hr reminder sent'
                                : '1-hr reminder scheduled'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Service summary + Cancel option */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="space-y-0.5 text-xs text-[#554C4B] min-w-0">
                      <p className="text-sm font-semibold text-[#141212]">{appt.serviceName}</p>
                      <p>
                        Artist: <span className="text-[#141212]">{appt.artistName}</span> · Shape:{' '}
                        <span className="text-[#141212]">{appt.nailShape}</span> · Shade:{' '}
                        <span className="text-[#141212]">{appt.shadePreference}</span> · $
                        <span className="font-mono tabular-nums">{appt.totalPrice}</span> (
                        {appt.durationMin} min)
                      </p>
                    </div>

                    <div className="shrink-0 space-y-1.5 text-right">
                      {confirmCancelId === appt.id ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={cancellingId === appt.id}
                            onClick={async () => {
                              setCancellingId(appt.id);
                              setCancelError(null);
                              try {
                                await cancelAppointment(appt.id);
                                setConfirmCancelId(null);
                              } catch (err) {
                                setCancelError(
                                  err instanceof Error
                                    ? err.message
                                    : 'Unable to cancel appointment right now.',
                                );
                              } finally {
                                setCancellingId(null);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#DC2626] text-white text-xs font-medium cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            {cancellingId === appt.id ? 'Cancelling...' : 'Confirm Cancel'}
                          </button>
                          <button
                            type="button"
                            disabled={cancellingId === appt.id}
                            onClick={() => {
                              setConfirmCancelId(null);
                              setCancelError(null);
                            }}
                            className="px-3 py-1.5 neu-btn text-xs text-[#554C4B] cursor-pointer disabled:opacity-50"
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelError(null);
                            setConfirmCancelId(appt.id);
                          }}
                          className="text-xs text-[#DC2626] underline underline-offset-4 cursor-pointer"
                        >
                          Cancel Appointment
                        </button>
                      )}
                      {cancelError && confirmCancelId === appt.id && (
                        <p className="text-[11px] text-[#DC2626]">{cancelError}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
