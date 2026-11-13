import React from 'react';
import { ProviderSearchResult } from '../../types';
import { VerificationBadge } from '../common/VerificationBadge';
import { Star, MapPin, Briefcase, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ProviderCardProps {
  provider: ProviderSearchResult;
  onBook: (provider: ProviderSearchResult) => void;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({ provider, onBook }) => {
  const { t } = useLanguage();

  return (
    <div className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card hover:shadow-elevated transition-all flex flex-col justify-between">
      <div>
        {/* Provider Header: Avatar, Name, Rating */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-royal-indigo/20 text-royal-indigo font-bold text-base flex items-center justify-center shrink-0">
              {provider.display_name.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-midnight-navy text-sm tracking-tight leading-snug">
                {provider.display_name}
              </h4>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-dark-slate">
                {provider.rating ? (
                  <span className="flex items-center gap-0.5 font-bold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{provider.rating.toFixed(1)}</span>
                    <span className="text-dark-slate/60 text-[11px] font-normal">
                      ({provider.review_count})
                    </span>
                  </span>
                ) : (
                  <span className="text-dark-slate/60 text-[11px] italic">Unrated</span>
                )}
                <span>•</span>
                <span className="flex items-center gap-1 text-[11px] text-dark-slate/80">
                  <Briefcase className="w-3 h-3 text-royal-indigo" />
                  <span>{provider.completed_jobs} jobs</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-xs text-dark-slate/90 line-clamp-2 mb-3 leading-relaxed">
          {provider.bio}
        </p>

        {/* Verification Badges (Exact & Non-Fabricated) */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {provider.verification_badges.map((b) => (
            <VerificationBadge key={b} badge={b} size="sm" />
          ))}
        </div>

        {/* Service Coverage Areas in Buea */}
        <div className="flex items-center gap-1 text-xs text-dark-slate/80 mb-3">
          <MapPin className="w-3.5 h-3.5 text-royal-indigo shrink-0" />
          <span className="truncate">{provider.area_names.join(', ')}</span>
        </div>
      </div>

      {/* Footer: Price Basis & Action Button */}
      <div className="pt-3 border-t border-cloud-gray flex items-center justify-between mt-auto">
        <div>
          <span className="block text-[10px] text-dark-slate/60 uppercase font-bold tracking-wider">
            {t('indicativePriceLabel')}
          </span>
          {provider.indicative_rate_xaf ? (
            <span className="font-extrabold text-midnight-navy text-sm">
              {provider.indicative_rate_xaf.toLocaleString()} XAF
            </span>
          ) : (
            <span className="text-xs font-semibold text-royal-indigo">
              {t('quotationRequired')}
            </span>
          )}
        </div>

        <button
          onClick={() => onBook(provider)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-royal-indigo hover:bg-royal-indigo/90 text-pure-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
        >
          <span>Request</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

