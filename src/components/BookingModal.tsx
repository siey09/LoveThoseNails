import { CheckCircle2, Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useStudio } from '../context/StudioContext';
import { NAIL_SHAPES } from '../data/seedCatalog';
import { getDayScheduleInfo, getNextOpenDateIso, getTodayIso } from '../lib/schedule';
import { BOOTSTRAP_ADMIN_EMAIL } from '../lib/firebase';
import type {
  Appointment,
  ArtistItem,
  LookbookPreset,
  NailShape,
  ServiceItem,
} from '../types/studio';

export interface BookingModalInitialState {
  service?: ServiceItem;
  artist?: ArtistItem;
  lookbook?: LookbookPreset;
  date?: string;
  timeSlot?: string;
}

interface BookingModalProps {
  isOpen: boolean;
  initial?: BookingModalInitialState;
  onClose: () => void;
  onViewBookings: () => void;
}

export function BookingModal({
  isOpen,
  initial,
  onClose,
  onViewBookings,
}: BookingModalProps) {
  const {
    user,
    profile,
    services,
    artists,
    bookedSlots,
    scheduleConfig,
    dayOverrides,
    catalogSynced,
    isAdmin,
    signInWithGoogle,
    createAppointment,
  } = useStudio();

  const activeServices = useMemo(() => services.filter((s) => s.active), [services]);
  const activeArtists = useMemo(() => artists.filter((a) => a.active), [artists]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedArtistId, setSelectedArtistId] = useState<string>('');
  const [nailShape, setNailShape] = useState<NailShape>('Almond');
  const [shadePreference, setShadePreference] = useState<string>('Dusty Rose');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [editingDateTime, setEditingDateTime] = useState(false);
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedAppt, setConfirmedAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setConfirmedAppt(null);
    setSelectedServiceId(initial?.service?.id || activeServices[0]?.id || '');
    setSelectedArtistId(initial?.artist?.id || activeArtists[0]?.id || '');
    setNailShape(initial?.lookbook?.shape || profile?.preferredShape || 'Almond');
    setShadePreference(
      initial?.lookbook
        ? `${initial.lookbook.shadeName} (${initial.lookbook.finish})`
        : profile?.preferredShade || 'Dusty Rose',
    );
    setSelectedDate(
      initial?.date || getNextOpenDateIso(scheduleConfig, dayOverrides, bookedSlots),
    );
    setSelectedTimeSlot(initial?.timeSlot || '');
    setEditingDateTime(!(initial?.date && initial?.timeSlot));
    setClientName(profile?.displayName || user?.displayName || '');
    setClientPhone(profile?.phone || '');
    setNotes(profile?.allergiesOrNotes || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const selectedService =
    activeServices.find((s) => s.id === selectedServiceId) || activeServices[0];
  const selectedArtist =
    activeArtists.find((a) => a.id === selectedArtistId) || activeArtists[0];

  const dateScheduleInfo = selectedDate
    ? getDayScheduleInfo(selectedDate, scheduleConfig, dayOverrides, bookedSlots)
    : null;

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedArtist || !selectedDate || !selectedTimeSlot) {
      setErrorMsg('Please select a treatment, date, and time slot.');
      return;
    }
    if (selectedDate < getTodayIso() || dateScheduleInfo?.isPastDate) {
      setErrorMsg('Please choose today or an upcoming date.');
      return;
    }
    if (dateScheduleInfo?.isClosed) {
      setErrorMsg('The studio is closed on this date. Please select another open date.');
      return;
    }
    const matchingSlot = dateScheduleInfo?.adminSlots.find((s) => s.slot === selectedTimeSlot);
    if (!matchingSlot || !matchingSlot.isAvailable) {
      setErrorMsg(
        matchingSlot?.isBooked
          ? 'That time slot was just booked. Please pick another available time.'
          : matchingSlot?.isPastTime
            ? 'That time slot has already passed today. Please pick an upcoming time.'
            : 'That time slot is no longer available. Please choose another time.',
      );
      return;
    }
    setErrorMsg('');
    setSubmitting(true);

    try {
      let currentUser = user;
      if (!currentUser) {
        currentUser = await signInWithGoogle();
      }
      if (!currentUser) {
        setErrorMsg('Google sign-in is required to confirm your reservation.');
        setSubmitting(false);
        return;
      }

      const currentIsAdmin = Boolean(
        currentUser.emailVerified &&
          (currentUser.email === BOOTSTRAP_ADMIN_EMAIL || isAdmin),
      );

      if (!catalogSynced && !currentIsAdmin) {
        setErrorMsg(
          'The studio catalog is awaiting initial publication by the studio owner. Please ask the studio admin to sign in once to publish live slots.',
        );
        setSubmitting(false);
        return;
      }

      const appt = await createAppointment({
        service: selectedService,
        artist: selectedArtist,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        nailShape,
        shadePreference: shadePreference.trim() || 'Dusty Rose',
        addons: [],
        clientName: clientName || currentUser.displayName || 'Studio Guest',
        clientPhone: clientPhone || '000-000-0000',
        notes,
      });

      setConfirmedAppt(appt);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not complete booking. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141212]/40 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Reserve Studio Appointment"
    >
      <div className="neu-surface w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#554C4B]">
              Love Those Nails by Eshin
            </p>
            <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-[#141212]">
              {confirmedAppt
                ? confirmedAppt.status === 'pending'
                  ? 'Pending Admin Confirmation'
                  : 'Appointment Confirmed'
                : 'Reserve Appointment'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking dialog"
            className="p-2.5 neu-btn text-[#141212] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6">
          <div className="neu-divider" />
        </div>

        {/* Modal Body */}
        {confirmedAppt ? (
          <div className="p-5 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto">
            <div className="neu-inset p-5 sm:p-6 space-y-4">
              {confirmedAppt.status === 'pending' ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-[#B45309]">
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <span className="text-sm font-semibold">
                      Pending Studio Admin Confirmation
                    </span>
                  </div>
                  <div className="pending-bar-track" aria-hidden="true">
                    <div className="pending-bar-fill" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-[#16A34A]">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-semibold">Studio Appointment Confirmed</span>
                </div>
              )}

              <div className="pb-2">
                <p className="text-xs text-[#554C4B]">Booking Reference</p>
                <p className="font-mono text-2xl font-semibold text-[#141212] mt-0.5">
                  {confirmedAppt.bookingCode}
                </p>
              </div>

              <div className="neu-divider" />

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[#554C4B]">Date</p>
                  <p className="font-mono tabular-nums font-medium text-[#141212] mt-0.5">
                    {confirmedAppt.date}
                  </p>
                </div>
                <div>
                  <p className="text-[#554C4B]">Time</p>
                  <p className="font-mono tabular-nums font-medium text-[#141212] mt-0.5">
                    {confirmedAppt.timeSlot}
                  </p>
                </div>
                <div>
                  <p className="text-[#554C4B]">Treatment</p>
                  <p className="font-medium text-[#141212] mt-0.5">
                    {confirmedAppt.serviceName}
                  </p>
                </div>
                <div>
                  <p className="text-[#554C4B]">Shape &amp; Shade</p>
                  <p className="font-medium text-[#141212] mt-0.5">
                    {confirmedAppt.nailShape} · {confirmedAppt.shadePreference}
                  </p>
                </div>
              </div>

              <div className="neu-divider" />

              <div className="text-xs text-[#554C4B] leading-relaxed">
                {confirmedAppt.status === 'pending' ? (
                  <>
                    Your request is held while our studio admin reviews it. Once confirmed, a
                    booking confirmation email will be sent to{' '}
                    <span className="text-[#141212] font-medium break-all">
                      {confirmedAppt.clientEmail}
                    </span>
                    , followed by day-before and 1-hour reminders.
                  </>
                ) : (
                  <>
                    A booking confirmation email is being sent to{' '}
                    <span className="text-[#141212] font-medium break-all">
                      {confirmedAppt.clientEmail}
                    </span>
                    , with automatic reminders scheduled for the day before and 1 hour prior to
                    your appointment.
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 neu-btn text-xs font-medium text-[#141212] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewBookings();
                }}
                className="px-5 py-2.5 neu-btn-ink text-xs font-medium cursor-pointer"
              >
                View Booking Status
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmBooking} className="flex flex-col flex-1 overflow-y-auto">
            <div className="p-5 sm:p-6 space-y-5 flex-1">
              {/* Treatment, Shape & Shade Selection */}
              <div className="neu-surface-sm p-4 sm:p-5 space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#141212] mb-1.5">
                    Treatment
                  </label>
                  <select
                    value={selectedService?.id || ''}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full px-3.5 py-2.5 neu-input text-xs sm:text-sm text-[#141212]"
                  >
                    {activeServices.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} — ${srv.price} ({srv.durationMin} min)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#141212] mb-1.5">
                      Nail Shape
                    </label>
                    <select
                      value={nailShape}
                      onChange={(e) => setNailShape(e.target.value as NailShape)}
                      className="w-full px-3.5 py-2.5 neu-input text-xs sm:text-sm text-[#141212]"
                    >
                      {NAIL_SHAPES.map((shape) => (
                        <option key={shape} value={shape}>
                          {shape}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141212] mb-1.5">
                      Shade / Finish
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={shadePreference}
                      onChange={(e) => setShadePreference(e.target.value)}
                      placeholder="e.g., Dusty Rose"
                      className="w-full px-3.5 py-2.5 neu-input text-xs sm:text-sm text-[#141212]"
                    />
                  </div>
                </div>

                {activeArtists.length > 1 && (
                  <div>
                    <label className="block text-xs font-medium text-[#141212] mb-1.5">
                      Nail Artist
                    </label>
                    <select
                      value={selectedArtist?.id || ''}
                      onChange={(e) => setSelectedArtistId(e.target.value)}
                      className="w-full px-3.5 py-2.5 neu-input text-xs sm:text-sm text-[#141212]"
                    >
                      {activeArtists.map((art) => (
                        <option key={art.id} value={art.id}>
                          {art.name} — {art.role}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Selected Date & Time Display (or picker) */}
              {!editingDateTime && selectedDate && selectedTimeSlot ? (
                <div className="neu-inset p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#554C4B]">
                        Selected Date
                      </p>
                      <p className="font-mono tabular-nums text-sm sm:text-base font-semibold text-[#141212] mt-0.5">
                        {selectedDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#554C4B]">
                        Selected Time
                      </p>
                      <p className="font-mono tabular-nums text-sm sm:text-base font-semibold text-[#141212] mt-0.5">
                        {selectedTimeSlot}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingDateTime(true)}
                    className="px-3 py-1.5 neu-btn text-xs font-medium text-[#141212] shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="neu-surface-sm p-4 sm:p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#141212] mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      min={getTodayIso()}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedTimeSlot('');
                      }}
                      className="w-full px-3.5 py-2.5 neu-input text-sm font-mono text-[#141212]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#141212] mb-1.5">
                      Time Slot
                    </label>
                    {dateScheduleInfo?.isPastDate ? (
                      <p className="neu-inset p-3.5 text-xs text-[#8E353B]">
                        That date has already passed. Please choose today or an upcoming date.
                      </p>
                    ) : dateScheduleInfo?.isClosed ? (
                      <p className="neu-inset p-3.5 text-xs text-[#8E353B]">
                        Studio is closed on this date. Please choose an open day.
                      </p>
                    ) : !dateScheduleInfo || dateScheduleInfo.clientVisibleSlots.length === 0 ? (
                      <p className="neu-inset p-3.5 text-xs text-[#554C4B]">
                        No open time slots available for this date.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2.5">
                        {dateScheduleInfo.clientVisibleSlots.map(({ slot, isBooked, isPastTime }) => {
                          const unavailable = isBooked || isPastTime;
                          const active = selectedTimeSlot === slot && !unavailable;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={unavailable}
                              onClick={() => setSelectedTimeSlot(slot)}
                              className={`py-2 px-2 text-xs font-mono tabular-nums ${
                                unavailable
                                  ? 'neu-inset text-[#554C4B]/45 line-through cursor-not-allowed'
                                  : active
                                    ? 'neu-btn-ink cursor-pointer'
                                    : 'neu-btn text-[#141212] cursor-pointer'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Guest Contact Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#141212] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3.5 py-2.5 neu-input text-sm text-[#141212]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#141212] mb-1.5">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    required
                    minLength={4}
                    maxLength={32}
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(555) 234-5678"
                    className="w-full px-3.5 py-2.5 neu-input text-sm font-mono text-[#141212]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#141212] mb-1.5">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Design request or notes..."
                    className="w-full px-3.5 py-2.5 neu-input text-sm text-[#141212]"
                  />
                </div>
              </div>

              {!user && (
                <p className="text-xs text-[#554C4B] neu-inset p-3.5">
                  You will sign in with Google when confirming so your reservation is saved.
                </p>
              )}

              {errorMsg && (
                <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3">
                  {errorMsg}
                </p>
              )}
            </div>

            <div className="px-5 sm:px-6 py-4 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 neu-btn text-xs font-medium text-[#141212] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  !selectedService ||
                  !selectedDate ||
                  !selectedTimeSlot ||
                  !clientName.trim() ||
                  clientPhone.trim().length < 4
                }
                className="px-5 py-2.5 neu-btn-ink text-xs font-medium disabled:opacity-45 cursor-pointer"
              >
                {submitting
                  ? 'Confirming...'
                  : user
                    ? 'Confirm Appointment'
                    : 'Sign in with Google & Confirm'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
