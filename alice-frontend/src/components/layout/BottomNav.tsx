import React from 'react';
import { Home, Compass, CalendarCheck2, Zap, User, Plus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onRequestService: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onRequestService,
}) => {
  const { t } = useLanguage();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-pure-white/95 backdrop-blur-md border-t border-cloud-gray shadow-elevated"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="max-w-md mx-auto px-2 h-16 flex items-center justify-between relative">
        {/* Destination 1: Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-w-[50px] min-h-[44px] cursor-pointer transition-colors ${
            currentTab === 'home' ? 'text-royal-indigo font-bold' : 'text-dark-slate/60 hover:text-dark-slate'
          }`}
          aria-label={t('navHome')}
        >
          <Home className={`w-5 h-5 ${currentTab === 'home' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">{t('navHome')}</span>
        </button>

        {/* Destination 2: Explore */}
        <button
          onClick={() => onSelectTab('explore')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-w-[50px] min-h-[44px] cursor-pointer transition-colors ${
            currentTab === 'explore' ? 'text-royal-indigo font-bold' : 'text-dark-slate/60 hover:text-dark-slate'
          }`}
          aria-label={t('navExplore')}
        >
          <Compass className={`w-5 h-5 ${currentTab === 'explore' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">{t('navExplore')}</span>
        </button>

        {/* Central Circular Action: Request a Service */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={onRequestService}
            className="w-13 h-13 rounded-full bg-royal-indigo hover:bg-royal-indigo/90 active:scale-95 text-pure-white shadow-elevated flex flex-col items-center justify-center border-4 border-pure-white transition-all cursor-pointer min-h-[48px] min-w-[48px]"
            aria-label="Request a Service in Buea"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Destination 3: Bookings */}
        <button
          onClick={() => onSelectTab('bookings')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-w-[50px] min-h-[44px] cursor-pointer transition-colors ${
            currentTab === 'bookings' ? 'text-royal-indigo font-bold' : 'text-dark-slate/60 hover:text-dark-slate'
          }`}
          aria-label={t('navBookings')}
        >
          <CalendarCheck2 className={`w-5 h-5 ${currentTab === 'bookings' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">{t('navBookings')}</span>
        </button>

        {/* Destination 4: Rentals */}
        <button
          onClick={() => onSelectTab('rentals')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-w-[50px] min-h-[44px] cursor-pointer transition-colors ${
            currentTab === 'rentals' ? 'text-royal-indigo font-bold' : 'text-dark-slate/60 hover:text-dark-slate'
          }`}
          aria-label={t('navRentals')}
        >
          <Zap className={`w-5 h-5 ${currentTab === 'rentals' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">{t('navRentals')}</span>
        </button>

        {/* Destination 5: Profile */}
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center flex-1 h-full min-w-[50px] min-h-[44px] cursor-pointer transition-colors ${
            currentTab === 'profile' ? 'text-royal-indigo font-bold' : 'text-dark-slate/60 hover:text-dark-slate'
          }`}
          aria-label={t('navProfile')}
        >
          <User className={`w-5 h-5 ${currentTab === 'profile' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">{t('navProfile')}</span>
        </button>
      </div>
    </nav>
  );
};

