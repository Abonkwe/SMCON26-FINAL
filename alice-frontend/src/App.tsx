import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { OfflineBanner } from './components/common/OfflineBanner';
import { Home } from './pages/customer/Home';
import { Explore } from './pages/customer/Explore';
import { Bookings } from './pages/customer/Bookings';
import { Rentals } from './pages/customer/Rentals';
import { Profile } from './pages/customer/Profile';
import { ProviderPortal } from './pages/provider/ProviderPortal';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AuthModal } from './pages/auth/AuthModal';
import { ServiceRequestDrawer } from './components/service/ServiceRequestDrawer';
import { ReportModal } from './components/safety/ReportModal';
import { ProviderSearchResult } from './types';

export const App: React.FC = () => {
  const { activeRole, isAuthModalOpen, setIsAuthModalOpen } = useAuth();

  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | undefined>();
  const [isRequestDrawerOpen, setIsRequestDrawerOpen] = useState(false);
  const [targetProvider, setTargetProvider] = useState<ProviderSearchResult | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleOpenRequestService = (provider?: ProviderSearchResult) => {
    setTargetProvider(provider || null);
    setIsRequestDrawerOpen(true);
  };

  const renderActiveScreen = () => {
    // If role is Provider or Admin, render their dedicated portal
    if (activeRole === 'PROVIDER') {
      return <ProviderPortal />;
    }
    if (activeRole === 'ADMIN') {
      return <AdminDashboard />;
    }

    // Customer View tabs
    switch (currentTab) {
      case 'home':
        return (
          <Home
            onSelectCategory={(slug) => {
              setSelectedCategorySlug(slug);
              setCurrentTab('explore');
            }}
            onSelectTab={setCurrentTab}
            onRequestService={handleOpenRequestService}
            onOpenReport={() => setIsReportModalOpen(true)}
          />
        );
      case 'explore':
        return (
          <Explore
            initialCategorySlug={selectedCategorySlug}
            onRequestService={handleOpenRequestService}
          />
        );
      case 'bookings':
        return (
          <Bookings
            onRequestNewService={() => handleOpenRequestService()}
          />
        );
      case 'rentals':
        return <Rentals />;
      case 'profile':
        return <Profile onOpenAuth={() => setIsAuthModalOpen(true)} />;
      default:
        return (
          <Home
            onSelectCategory={(slug) => {
              setSelectedCategorySlug(slug);
              setCurrentTab('explore');
            }}
            onSelectTab={setCurrentTab}
            onRequestService={handleOpenRequestService}
            onOpenReport={() => setIsReportModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-cloud-gray flex flex-col antialiased selection:bg-royal-indigo/20">
      {/* Offline Banner (NFR-LOW-001) */}
      <OfflineBanner />

      {/* Signature Header with Gradient and Wordmark */}
      <Header
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenReport={() => setIsReportModalOpen(true)}
        onSelectTab={setCurrentTab}
      />

      {/* Main Content Viewport (Mobile-First 360px safe) */}
      <main className="flex-1 w-full max-w-md mx-auto px-3.5 pt-3.5 pb-safe">
        {renderActiveScreen()}
      </main>

      {/* Persistent Bottom Navigation with Central Circular + Action Button */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onRequestService={() => handleOpenRequestService()}
      />

      {/* Global Modals & Drawers */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ServiceRequestDrawer
        isOpen={isRequestDrawerOpen}
        onClose={() => {
          setIsRequestDrawerOpen(false);
          setTargetProvider(null);
        }}
        preselectedProvider={targetProvider}
        onSuccess={() => {
          setCurrentTab('bookings');
        }}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
};

