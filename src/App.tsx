/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { BagDrawer } from './components/BagDrawer';
import { BlogsPage } from './components/BlogsPage';
import { BookingModal, type BookingModalInitialState } from './components/BookingModal';
import { ClientPortal } from './components/ClientPortal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { GalleryPage } from './components/GalleryPage';
import { HeroSection } from './components/HeroSection';
import { LoyaltyPage } from './components/LoyaltyPage';
import { Navbar, type ActivePage } from './components/Navbar';
import { RetailSection } from './components/RetailSection';
import { ServicesSection } from './components/ServicesSection';
import { StudioProvider, useStudio } from './context/StudioContext';

function StudioShell() {
  const { isAdmin, careShopEnabled } = useStudio();
  const [activePage, setActivePage] = useState<ActivePage>('studio');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [pendingBookingPreset, setPendingBookingPreset] = useState<
    BookingModalInitialState | undefined
  >(undefined);
  const [bookingInitial, setBookingInitial] = useState<BookingModalInitialState | undefined>(
    undefined,
  );

  const openBooking = (preset?: BookingModalInitialState) => {
    const merged: BookingModalInitialState | undefined =
      pendingBookingPreset || preset ? { ...pendingBookingPreset, ...preset } : undefined;
    setBookingInitial(merged);
    setBookingOpen(true);
  };

  const handleNavigate = (page: ActivePage, sectionId?: string) => {
    setActivePage(page);
    if (page === 'studio' && sectionId) {
      window.setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBookRoute = (preset?: BookingModalInitialState) => {
    if (preset?.date && preset?.timeSlot) {
      openBooking(preset);
      return;
    }
    setPendingBookingPreset(preset);
    handleNavigate('my-bookings');
  };

  const handleLogoDoubleTrigger = () => {
    if (isAdmin) {
      handleNavigate('admin');
    } else {
      setAdminLoginOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F2ECEB] text-[#141212] overflow-x-hidden">
      <Navbar
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogoDoubleTrigger={handleLogoDoubleTrigger}
      />

      <main className="flex-1">
        {activePage === 'studio' && (
          <>
            <HeroSection
              onOpenBooking={(preset) => handleBookRoute(preset)}
              onExploreServices={() => handleNavigate('studio', 'services')}
            />
            <ServicesSection
              onBookService={(service) => handleBookRoute({ service })}
            />
            {careShopEnabled && <RetailSection />}
          </>
        )}

        {activePage === 'gallery' && (
          <GalleryPage onOpenBooking={(preset) => handleBookRoute(preset)} />
        )}

        {activePage === 'blogs' && (
          <BlogsPage onOpenBooking={(preset) => handleBookRoute(preset)} />
        )}

        {activePage === 'loyalty' && (
          <LoyaltyPage onOpenBooking={() => handleBookRoute()} />
        )}

        {activePage === 'my-bookings' && (
          <ClientPortal
            onOpenBooking={(preset) => openBooking(preset)}
            pendingPreset={pendingBookingPreset}
            onClearPreset={() => setPendingBookingPreset(undefined)}
          />
        )}

        {activePage === 'admin' && (
          <AdminDashboard
            onBackToStudio={() => handleNavigate('studio')}
            onOpenGallery={() => handleNavigate('gallery')}
            onOpenBlogs={() => handleNavigate('blogs')}
            onOpenAdminLogin={() => setAdminLoginOpen(true)}
          />
        )}
      </main>

      <Footer
        onNavigate={handleNavigate}
        onOpenBooking={() => handleBookRoute()}
      />

      <BookingModal
        isOpen={bookingOpen}
        initial={bookingInitial}
        onClose={() => {
          setBookingOpen(false);
          setPendingBookingPreset(undefined);
        }}
        onViewBookings={() => handleNavigate('my-bookings')}
      />

      <AdminLoginModal
        isOpen={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        onAuthenticatedAdmin={() => handleNavigate('admin')}
      />

      {careShopEnabled && <BagDrawer />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StudioProvider>
        <StudioShell />
      </StudioProvider>
    </ErrorBoundary>
  );
}
