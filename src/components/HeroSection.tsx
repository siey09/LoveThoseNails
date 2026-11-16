import { ArrowRight, Calendar } from 'lucide-react';
import { useStudio } from '../context/StudioContext';
import { STUDIO_TIME_SLOTS } from '../data/seedCatalog';

interface HeroSectionProps {
  onOpenBooking: (preset?: { timeSlot?: string; date?: string }) => void;
  onExploreServices: () => void;
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function HeroSection({ onOpenBooking, onExploreServices }: HeroSectionProps) {
  const { bookedSlots } = useStudio();
  const today = getTodayIso();

  const openSlotsToday = STUDIO_TIME_SLOTS.filter((slot) => {
    const isTaken = bookedSlots.some(
      (b) => b.date === today && b.timeSlot === slot && b.status === 'active',
    );
    return !isTaken;
  });

  return (
    <section className="bg-[#F2ECEB]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12 lg:py-16">
        {/* Balanced 12-Column Editorial Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Editorial Intro */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#554C4B]">
              By Eshin · Private Nail Atelier
            </p>

            <h1 className="font-['Playfair_Display'] text-3xl sm:text-5xl lg:text-[3.85rem] leading-[1.1] sm:leading-[1.08] font-semibold text-[#141212] max-w-2xl">
              Bespoke nail artistry, sculpted with care
            </h1>

            <p className="text-sm sm:text-base text-[#554C4B] leading-relaxed max-w-[52ch]">
              Soft Gel-X extensions, translucent Korean syrup BIAB, and meticulous cuticle care
              in a calm, appointment-only studio.
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-5 pt-2">
              <button
                type="button"
                onClick={() => onOpenBooking()}
                className="inline-flex items-center justify-center gap-2.5 px-5 sm:px-7 py-3 sm:py-3.5 neu-btn-ink text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141212]"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Your Set</span>
              </button>
              <button
                type="button"
                onClick={onExploreServices}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 neu-btn text-sm font-medium text-[#141212] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Explore Menu</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Tactile Same-Day Chair Availability Panel */}
          <div className="lg:col-span-5 neu-surface p-5 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#554C4B]">
                  Today at the Studio
                </p>
                <h2 className="font-['Playfair_Display'] text-xl sm:text-2xl font-semibold text-[#141212] mt-1">
                  Same-Day Open Slots
                </h2>
              </div>
              <span className="font-mono text-xs text-[#554C4B] tabular-nums pt-1">
                {today}
              </span>
            </div>

            <div className="neu-inset p-3.5 sm:p-4 rounded-2xl">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {STUDIO_TIME_SLOTS.slice(0, 6).map((slot) => {
                  const isAvailable = openSlotsToday.includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => onOpenBooking({ date: today, timeSlot: slot })}
                      className={`px-2.5 py-2.5 text-xs font-mono tabular-nums whitespace-nowrap text-center ${
                        isAvailable
                          ? 'neu-btn text-[#141212] hover:text-[#141212] cursor-pointer'
                          : 'neu-inset text-[#554C4B]/45 line-through cursor-not-allowed'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="neu-divider" />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#554C4B]">
              <span>
                {openSlotsToday.length} of {STUDIO_TIME_SLOTS.length} slots available today
              </span>
              <button
                type="button"
                onClick={() => onOpenBooking()}
                className="font-medium text-[#141212] underline underline-offset-4 decoration-[#D2AAAB] hover:opacity-80 cursor-pointer whitespace-nowrap"
              >
                Pick another date
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
