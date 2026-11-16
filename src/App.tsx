/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { BagDrawer } from './components/BagDrawer';
import { BookingModal, type BookingModalInitialState } from './components/BookingModal';
import { ClientPortal } from './components/ClientPortal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { GalleryPage } from './components/GalleryPage';
import { HeroSection } from './components/HeroSection';
import { LookbookSection } from './components/LookbookSection';
import { LoyaltyPage } from './components/LoyaltyPage';
import { Navbar, type ActivePage } from './components/Navbar';
import { RetailSection } from './components/RetailSection';
import { ServicesSection } from './components/ServicesSection';
import { StudioProvider, useStudio } from './context/StudioContext';

function StudioShell() {
  const { isAdmin } = useStudio();
  const [activePage, setActivePage] = useState<ActivePage>('studio');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [bookingInitial, setBookingInitial] = useState<BookingModalInitialState | undefined>(
    undefined,
  );

  const openBooking = (preset?: BookingModalInitialState) => {
    setBookingInitial(preset);
    setBookingOpen(true);
  };

  const handleNavigate = (page: ActivePage, sectionId?: string) => {
    setActivePage(page);
    if (page === 'studio' && sectionId) {
      requestAnimationFrame(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
        onOpenBooking={() => openBooking()}
        onLogoDoubleTrigger={handleLogoDoubleTrigger}
      />

      <main className="flex-1">
        {activePage === 'studio' && (
          <>
            <HeroSection
              onOpenBooking={(preset) => openBooking(preset)}
              onExploreServices={() => handleNavigate('studio', 'services')}
            />
            <ServicesSection
              onBookService={(service) => openBooking({ service })}
            />
            <LookbookSection
              onBookLook={(lookbook) => openBooking({ lookbook })}
            />
            <RetailSection />
          </>
        )}

        {activePage === 'gallery' && (
          <GalleryPage onOpenBooking={(preset) => openBooking(preset)} />
        )}

        {activePage === 'loyalty' && (
          <LoyaltyPage onOpenBooking={() => openBooking()} />
        )}

        {activePage === 'my-bookings' && (
          <ClientPortal onOpenBooking={(preset) => openBooking(preset)} />
        )}

        {activePage === 'admin' && (
          <AdminDashboard
            onBackToStudio={() => handleNavigate('studio')}
            onOpenGallery={() => handleNavigate('gallery')}
            onOpenAdminLogin={() => setAdminLoginOpen(true)}
          />
        )}
      </main>

      <Footer
        onNavigate={handleNavigate}
        onOpenBooking={() => openBooking()}
      />

      <BookingModal
        isOpen={bookingOpen}
        initial={bookingInitial}
        onClose={() => setBookingOpen(false)}
        onViewBookings={() => handleNavigate('my-bookings')}
      />

      <AdminLoginModal
        isOpen={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        onAuthenticatedAdmin={() => handleNavigate('admin')}
      />

      <BagDrawer />
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
