import { BrandCrestImage } from './NailArtVisuals';
import type { ActivePage } from './Navbar';

interface FooterProps {
  onNavigate: (page: ActivePage, sectionId?: string) => void;
  onOpenBooking: () => void;
}

export function Footer({ onNavigate, onOpenBooking }: FooterProps) {
  return (
    <footer className="bg-[#F2ECEB] text-[#141212]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-12">
        <div className="neu-divider mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10">
          <div className="md:col-span-5 space-y-4">
            <div className="w-36 neu-rose-panel !rounded-2xl overflow-hidden p-2">
              <BrandCrestImage className="w-full h-24 rounded-xl" />
            </div>
            <p className="text-xs text-[#554C4B] max-w-sm leading-relaxed">
              Love Those Nails by Eshin is a private nail artistry studio dedicated to nail bed
              health, sculpted soft gel extensions, and editorial finishes.
            </p>
          </div>

          <div className="md:col-span-3 space-y-2 text-xs">
            <p className="font-semibold text-[#141212]">Studio Hours &amp; Location</p>
            <p className="text-[#554C4B]">842 Rosemont Terrace, Suite 2B</p>
            <p className="text-[#554C4B]">Tuesday – Sunday · 10:00 AM – 7:00 PM</p>
            <p className="text-[#554C4B]">Closed Mondays · By Appointment</p>
          </div>

          <div className="md:col-span-4 space-y-2 text-xs">
            <p className="font-semibold text-[#141212]">Quick Navigation</p>
            <div className="flex flex-col items-start gap-1.5 text-[#554C4B]">
              <button
                type="button"
                onClick={() => onNavigate('studio', 'services')}
                className="hover:text-[#141212] cursor-pointer"
              >
                Service Menu
              </button>
              <button
                type="button"
                onClick={() => onNavigate('studio', 'lookbook')}
                className="hover:text-[#141212] cursor-pointer"
              >
                Shape &amp; Pigment Lookbook
              </button>
              <button
                type="button"
                onClick={() => onNavigate('gallery')}
                className="hover:text-[#141212] cursor-pointer"
              >
                Recent Work Gallery
              </button>
              <button
                type="button"
                onClick={() => onNavigate('loyalty')}
                className="hover:text-[#141212] cursor-pointer"
              >
                VIP Loyalty Card
              </button>
              <button
                type="button"
                onClick={() => onNavigate('studio', 'care-shop')}
                className="hover:text-[#141212] cursor-pointer"
              >
                Care Apothecary
              </button>
              <button
                type="button"
                onClick={() => onNavigate('my-bookings')}
                className="hover:text-[#141212] cursor-pointer"
              >
                Calendar
              </button>
              <button
                type="button"
                onClick={onOpenBooking}
                className="hover:text-[#141212] font-medium text-[#141212] cursor-pointer"
              >
                Reserve Appointment
              </button>
            </div>
          </div>
        </div>

        <div className="neu-divider mb-6" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#554C4B]">
          <p>© {new Date().getFullYear()} Love Those Nails by Eshin. All rights reserved.</p>
          <p>By Appointment · 842 Rosemont Terrace, Suite 2B</p>
        </div>
      </div>
    </footer>
  );
}
