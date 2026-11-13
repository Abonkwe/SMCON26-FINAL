import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ServiceCategory, ProviderSearchResult, Booking } from '../../types';
import { api } from '../../lib/api';
import { ServiceCard } from '../../components/service/ServiceCard';
import { ProviderCard } from '../../components/service/ProviderCard';
import { StatusPill } from '../../components/common/StatusPill';
import { RoleSwitcher } from '../../components/layout/RoleSwitcher';
import {
  Search,
  MapPin,
  ShieldAlert,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

interface HomeProps {
  onSelectCategory: (categorySlug: string) => void;
  onSelectTab: (tab: string) => void;
  onRequestService: (provider?: ProviderSearchResult) => void;
  onOpenReport: () => void;
}

export const Home: React.FC<HomeProps> = ({
  onSelectCategory,
  onSelectTab,
  onRequestService,
  onOpenReport,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [providers, setProviders] = useState<ProviderSearchResult[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.catalogue.getCategories().then(setCategories).catch(console.error);
    api.providers.search({ verified_only: true }).then((res) => setProviders(res.slice(0, 3))).catch(console.error);
    api.bookings.list().then((bks) => {
      const active = bks.find((b) => ['CONFIRMED', 'IN_PROGRESS', 'QUOTATION_RECEIVED'].includes(b.status));
      if (active) setActiveBooking(active);
    }).catch(console.error);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSelectTab('explore');
  };

  // Safe personalized greeting without revealing sensitive data (Section 11.3)
  const firstName = user?.display_name ? user.display_name.split(' ')[0] : 'there';

  return (
    <div className="space-y-5 pb-8">
      {/* Role Switcher Pill */}
      <RoleSwitcher />

      {/* Greeting Banner */}
      <div className="bg-pure-white rounded-3xl p-5 border border-cloud-gray shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-extrabold text-midnight-navy text-xl tracking-tight">
              {t('greeting')}, {firstName} 👋
            </h2>
            <p className="text-xs text-dark-slate/80 mt-0.5">
              {t('greetingSub')}
            </p>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-royal-indigo/20 text-royal-indigo text-[11px] font-bold">
            <MapPin className="w-3 h-3 text-royal-indigo shrink-0" />
            <span>Buea, Cameroon</span>
          </div>
        </div>

        {/* Prominent Search Input: "What service do you need?" */}
        <form onSubmit={handleSearchSubmit} className="relative mt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cloud-gray/60 border border-cloud-gray text-xs text-midnight-navy placeholder:text-dark-slate/50 font-medium focus:outline-royal-indigo transition-all"
          />
          <Search className="w-4 h-4 text-dark-slate/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </form>
      </div>

      {/* Active Booking Tracker Card (Section 11.3) */}
      {activeBooking && (
        <div className="bg-pure-white rounded-3xl p-4 border-2 border-royal-indigo/30 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-royal-indigo flex items-center gap-1">
              <Clock className="w-3 h-3 text-royal-indigo" />
              <span>{t('activeBookingBanner')}</span>
            </span>
            <StatusPill status={activeBooking.status} />
          </div>

          <h3 className="font-extrabold text-midnight-navy text-sm mb-1">
            {activeBooking.service_name}
          </h3>
          <p className="text-xs text-dark-slate/80 mb-3 flex items-center gap-2">
            <span>By <strong>{activeBooking.provider_name}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[11px]">
              <MapPin className="w-3 h-3 text-royal-indigo" />
              {activeBooking.neighbourhood}
            </span>
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-cloud-gray">
            {activeBooking.checkin_pin ? (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-dark-slate/60 text-[11px]">Job PIN:</span>
                <span className="font-mono font-extrabold text-royal-indigo text-sm bg-indigo-50 px-2 py-0.5 rounded-lg border border-royal-indigo/20">
                  {activeBooking.checkin_pin}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-dark-slate/60">
                {activeBooking.status === 'QUOTATION_RECEIVED' ? 'Quotation awaiting review' : 'Awaiting confirmation'}
              </span>
            )}

            <button
              onClick={() => onSelectTab('bookings')}
              className="text-xs font-bold text-royal-indigo flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>{t('viewDetails')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Category Grid (Repairs, Cleaning, Water, Gas, Laundry, Deliveries, Power Rental) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-extrabold text-midnight-navy text-base tracking-tight">
            {t('quickCategories')}
          </h3>
          <button
            onClick={() => onSelectTab('explore')}
            className="text-xs font-bold text-royal-indigo hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>See all</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {categories.map((c) => (
            <ServiceCard
              key={c.id}
              category={c}
              onClick={() => {
                if (c.slug === 'power-rental') {
                  onSelectTab('rentals');
                } else {
                  onSelectCategory(c.slug);
                  onSelectTab('explore');
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Feature Banner: 2kWh Power Station Rentals for Buea Outages */}
      <div
        onClick={() => onSelectTab('rentals')}
        className="bg-alice-header-gradient rounded-3xl p-4 text-pure-white shadow-elevated flex items-center justify-between cursor-pointer active:scale-98 transition-all"
      >
        <div className="pr-2">
          <span className="inline-block px-2 py-0.5 rounded-full bg-pure-white/20 text-[10px] font-bold uppercase tracking-wider mb-1">
            Load Shedding Solution
          </span>
          <h4 className="font-extrabold text-base leading-tight">
            2 kWh Portable Power Stations
          </h4>
          <p className="text-xs text-pure-white/90 mt-1">
            Clean battery electricity for Buea homes & offices. Instant compatibility calculator.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-pure-white/20 flex items-center justify-center shrink-0">
          <Zap className="w-6 h-6 text-amber-300 fill-amber-300" />
        </div>
      </div>

      {/* Nearby Verified Buea Providers (Section 11.3) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-extrabold text-midnight-navy text-base tracking-tight flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-royal-indigo" />
            <span>{t('nearbyProviders')}</span>
          </h3>
          <button
            onClick={() => onSelectTab('explore')}
            className="text-xs font-bold text-royal-indigo hover:underline cursor-pointer"
          >
            Filter by Area
          </button>
        </div>

        <div className="space-y-3">
          {providers.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              onBook={() => onRequestService(p)}
            />
          ))}
        </div>
      </div>

      {/* Visible Safety & Incident Reporting Trigger */}
      <div className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-midnight-navy text-xs">
              Trust & Safety Assurance
            </h4>
            <p className="text-[11px] text-dark-slate/70">
              Identity checked providers & transparent dispute review.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenReport}
          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all shrink-0 cursor-pointer"
        >
          SOS / Report
        </button>
      </div>
    </div>
  );
};

