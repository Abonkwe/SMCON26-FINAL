import React from 'react';
import { RentalListing } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { Battery, Zap, ShieldCheck, MapPin, ArrowRight, Gauge } from 'lucide-react';

interface RentalCardProps {
  listing: RentalListing;
  onSelect: (listing: RentalListing) => void;
  onEstimate: (listing: RentalListing) => void;
}

export const RentalCard: React.FC<RentalCardProps> = ({
  listing,
  onSelect,
  onEstimate,
}) => {
  const { t } = useLanguage();

  return (
    <div className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card hover:shadow-elevated transition-all flex flex-col justify-between">
      <div>
        {/* Model & Owner Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 mb-1">
              LiFePO4 Power Station
            </span>
            <h4 className="font-extrabold text-midnight-navy text-base tracking-tight leading-snug">
              {listing.model_name}
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
            {listing.condition}
          </span>
        </div>

        {/* Third-Party Owner Disclosure (FR-RENT-009) */}
        <div className="bg-cloud-gray/40 rounded-2xl p-2.5 mb-3 text-[11px] text-dark-slate/90 border border-cloud-gray/80 leading-relaxed">
          <span className="text-dark-slate/60 block text-[10px] uppercase font-bold">
            Equipment Owner (Third-Party)
          </span>
          <span className="font-semibold text-royal-indigo flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-royal-indigo" />
            {listing.provider_name}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-dark-slate/70 mt-0.5">
            <MapPin className="w-3 h-3 text-dark-slate/50" />
            <span>{listing.location_area}</span>
          </div>
        </div>

        {/* Technical Specs: Distinction between Wh and W (FR-RENT-003) */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-indigo-50/50 p-2.5 rounded-2xl border border-royal-indigo/20">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-royal-indigo mb-0.5">
              <Battery className="w-3.5 h-3.5" />
              <span>{t('nominalCapacity')}</span>
            </div>
            <span className="font-extrabold text-midnight-navy text-sm">
              {listing.capacity_wh} Wh
            </span>
            <span className="text-[10px] text-dark-slate/60 block">
              ({(listing.capacity_wh / 1000).toFixed(2)} kWh)
            </span>
          </div>

          <div className="bg-amber-50/50 p-2.5 rounded-2xl border border-amber-300/40">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-amber-700 mb-0.5">
              <Zap className="w-3.5 h-3.5" />
              <span>{t('continuousOutput')}</span>
            </div>
            <span className="font-extrabold text-midnight-navy text-sm">
              {listing.continuous_output_w} W
            </span>
            <span className="text-[10px] text-dark-slate/60 block">
              Peak: {listing.peak_output_w} W
            </span>
          </div>
        </div>

        {/* Connectors & Outlets */}
        <div className="mb-4">
          <span className="block text-[10px] text-dark-slate/60 uppercase font-bold mb-1">
            Available Outlets
          </span>
          <div className="flex flex-wrap gap-1">
            {listing.connectors.map((c) => (
              <span
                key={c}
                className="text-[10px] font-medium bg-cloud-gray/60 text-dark-slate px-2 py-0.5 rounded-lg border border-cloud-gray"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing & Booking CTA */}
      <div className="pt-3 border-t border-cloud-gray">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div>
            <span className="text-[10px] text-dark-slate/60 uppercase font-bold block">
              {t('dailyRate')}
            </span>
            <span className="font-extrabold text-midnight-navy text-sm">
              {listing.daily_rate_xaf.toLocaleString()} XAF
              <span className="text-[10px] font-normal text-dark-slate/60">/day</span>
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-dark-slate/60 uppercase font-bold block">
              {t('securityDeposit')}
            </span>
            <span className="font-semibold text-dark-slate text-xs">
              {listing.deposit_xaf.toLocaleString()} XAF
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onEstimate(listing)}
            className="py-2.5 px-2 rounded-2xl border border-royal-indigo/30 text-royal-indigo hover:bg-indigo-50/50 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Check Load</span>
          </button>

          <button
            onClick={() => onSelect(listing)}
            className="py-2.5 px-3 rounded-2xl bg-royal-indigo hover:bg-royal-indigo/90 active:scale-95 text-pure-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>{t('bookRentalBtn')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

