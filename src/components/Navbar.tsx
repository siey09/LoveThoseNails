import { Menu, ShoppingBag, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useStudio } from '../context/StudioContext';
import { BrandCrestImage } from './NailArtVisuals';

export type ActivePage = 'studio' | 'gallery' | 'blogs' | 'loyalty' | 'my-bookings' | 'admin';

interface NavbarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage, sectionId?: string) => void;
  onLogoDoubleTrigger: () => void;
}

export function Navbar({
  activePage,
  onNavigate,
  onLogoDoubleTrigger,
}: NavbarProps) {
  const { cart, setIsBagOpen, loyaltyEnabled, careShopEnabled } = useStudio();
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastLogoTapRef = useRef<number>(0);
  const logoTapCountRef = useRef<number>(0);

  const bagCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSectionLink = (sectionId: string) => {
    setMobileOpen(false);
    onNavigate('studio', sectionId);
  };

  const handlePageLink = (page: ActivePage) => {
    setMobileOpen(false);
    onNavigate(page);
  };

  const handleLogoPress = () => {
    const now = Date.now();
    if (now - lastLogoTapRef.current < 650) {
      logoTapCountRef.current += 1;
    } else {
      logoTapCountRef.current = 1;
    }
    lastLogoTapRef.current = now;

    if (logoTapCountRef.current >= 3) {
      logoTapCountRef.current = 0;
      lastLogoTapRef.current = 0;
      setMobileOpen(false);
      onLogoDoubleTrigger();
      return;
    }

    onNavigate('studio');
  };

  const navLinkClass = (isActive: boolean) =>
    `py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
      isActive
        ? 'border-[#8A5A5C] text-[#141212] font-semibold'
        : 'border-transparent text-[#554C4B] hover:text-[#141212] hover:border-[#D2AAAB]'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[#F2ECEB]/92 backdrop-blur-md border-b border-[#E2D8D7]/80 shadow-[0_6px_18px_rgba(176,152,152,0.16)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 h-16 sm:h-[74px] flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
        {/* Zone 1: Brand logo crest (triple-click/tap opens Admin login) + single-line wordmark */}
        <button
          type="button"
          onClick={handleLogoPress}
          aria-label="Love Those Nails by Eshin — Home"
          className="inline-flex items-center gap-2.5 sm:gap-3 text-left min-w-0 shrink cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141212]"
        >
          <span className="w-9 h-9 sm:w-11 sm:h-11 bg-[#D2AAAB] shadow-[3px_3px_8px_rgba(176,152,152,0.34),-2px_-2px_6px_rgba(255,255,255,0.85)] rounded-xl p-1 flex items-center justify-center overflow-hidden shrink-0 transition-transform duration-200 group-hover:scale-[1.03]">
            <BrandCrestImage className="w-full h-full rounded-lg shadow-none" />
          </span>
          <span className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-bold tracking-[0.05em] sm:tracking-[0.07em] text-xs sm:text-[15px] text-[#141212] truncate">
              LOVE THOSE NAILS
            </span>
            <span className="hidden xl:inline font-['Playfair_Display'] italic font-medium text-xs text-[#8A5A5C] whitespace-nowrap">
              by Eshin
            </span>
          </span>
        </button>

        {/* Zone 2: Concise single-line nav links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-5 lg:gap-7 text-sm font-medium text-[#554C4B]"
        >
          <button
            type="button"
            onClick={() => handleSectionLink('services')}
            className={navLinkClass(false)}
          >
            Services
          </button>
          <button
            type="button"
            onClick={() => handlePageLink('gallery')}
            className={navLinkClass(activePage === 'gallery')}
          >
            Gallery
          </button>
          <button
            type="button"
            onClick={() => handlePageLink('blogs')}
            className={navLinkClass(activePage === 'blogs')}
          >
            Blogs
          </button>
          {loyaltyEnabled && (
            <button
              type="button"
              onClick={() => handlePageLink('loyalty')}
              className={navLinkClass(activePage === 'loyalty')}
            >
              Loyalty Card
            </button>
          )}
          {careShopEnabled && (
            <button
              type="button"
              onClick={() => handleSectionLink('care-shop')}
              className={navLinkClass(false)}
            >
              Care Shop{bagCount > 0 ? ` (${bagCount})` : ''}
            </button>
          )}
          <button
            type="button"
            onClick={() => handlePageLink('my-bookings')}
            className={navLinkClass(activePage === 'my-bookings')}
          >
            Calendar
          </button>
        </nav>

        {/* Zone 3: 1 primary CTA button + mobile menu trigger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {careShopEnabled && bagCount > 0 && (
            <button
              type="button"
              onClick={() => setIsBagOpen(true)}
              aria-label={`Open studio care bag with ${bagCount} items`}
              className="md:hidden inline-flex items-center justify-center gap-1 px-2.5 min-h-[40px] neu-btn text-xs font-medium text-[#141212] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="tabular-nums">{bagCount}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handlePageLink('my-bookings')}
            className="px-3.5 sm:px-5 min-h-[40px] py-2 sm:py-2.5 neu-btn-ink text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141212]"
          >
            <span className="sm:hidden">Book</span>
            <span className="hidden sm:inline">Book Appointment</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden min-h-[40px] min-w-[40px] p-2 flex items-center justify-center neu-btn text-[#141212] cursor-pointer"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#F2ECEB] px-4 py-3 flex flex-col gap-1 text-sm font-medium text-[#141212] shadow-[inset_0_3px_8px_rgba(176,152,152,0.28)] border-t border-[#E2D8D7]">
          <button
            type="button"
            onClick={() => handleSectionLink('services')}
            className="text-left px-3 min-h-[44px] flex items-center rounded-xl hover:bg-[#EBE3E2]"
          >
            Services
          </button>
          <button
            type="button"
            onClick={() => handlePageLink('gallery')}
            className={`text-left px-3 min-h-[44px] flex items-center rounded-xl ${
              activePage === 'gallery' ? 'neu-inset font-semibold text-[#8A5A5C]' : 'hover:bg-[#EBE3E2]'
            }`}
          >
            Gallery
          </button>
          <button
            type="button"
            onClick={() => handlePageLink('blogs')}
            className={`text-left px-3 min-h-[44px] flex items-center rounded-xl ${
              activePage === 'blogs' ? 'neu-inset font-semibold text-[#8A5A5C]' : 'hover:bg-[#EBE3E2]'
            }`}
          >
            Blogs
          </button>
          {loyaltyEnabled && (
            <button
              type="button"
              onClick={() => handlePageLink('loyalty')}
              className={`text-left px-3 min-h-[44px] flex items-center rounded-xl ${
                activePage === 'loyalty' ? 'neu-inset font-semibold text-[#8A5A5C]' : 'hover:bg-[#EBE3E2]'
              }`}
            >
              Loyalty Card
            </button>
          )}
          {careShopEnabled && (
            <button
              type="button"
              onClick={() => handleSectionLink('care-shop')}
              className="text-left px-3 min-h-[44px] flex items-center rounded-xl hover:bg-[#EBE3E2]"
            >
              Care Shop{bagCount > 0 ? ` (${bagCount})` : ''}
            </button>
          )}
          <button
            type="button"
            onClick={() => handlePageLink('my-bookings')}
            className={`text-left px-3 min-h-[44px] flex items-center rounded-xl ${
              activePage === 'my-bookings' ? 'neu-inset font-semibold text-[#8A5A5C]' : 'hover:bg-[#EBE3E2]'
            }`}
          >
            Calendar
          </button>
        </div>
      )}
    </header>
  );
}
