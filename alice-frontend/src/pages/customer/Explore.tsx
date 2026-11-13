import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ProviderSearchResult, ServiceArea, ServiceCategory } from '../../types';
import { api } from '../../lib/api';
import { ProviderCard } from '../../components/service/ProviderCard';
import { Search, MapPin, Filter, ShieldCheck, Star, RefreshCw } from 'lucide-react';

interface ExploreProps {
  initialCategorySlug?: string;
  onRequestService: (provider?: ProviderSearchResult) => void;
}

export const Explore: React.FC<ExploreProps> = ({
  initialCategorySlug,
  onRequestService,
}) => {
  const { t, language } = useLanguage();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [providers, setProviders] = useState<ProviderSearchResult[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<ProviderSearchResult[]>([]);

  const [keyword, setKeyword] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategorySlug || 'all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    api.catalogue.getCategories().then(setCategories).catch(console.error);
    api.catalogue.getAreas().then(setAreas).catch(console.error);
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setIsLoading(true);
    try {
      const res = await api.providers.search({
        keyword: keyword.trim() || undefined,
        verified_only: verifiedOnly,
      });
      setProviders(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = [...providers];

    // Filter by Buea neighbourhood
    if (selectedArea !== 'all') {
      result = result.filter((p) => p.area_names.includes(selectedArea));
    }

    // Filter by Top Rated (>= 4.8)
    if (topRatedOnly) {
      result = result.filter((p) => (p.rating || 0) >= 4.8);
    }

    // Filter by Keyword
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (p) =>
          p.display_name.toLowerCase().includes(kw) ||
          p.service_names.some((s) => s.toLowerCase().includes(kw)) ||
          p.bio.toLowerCase().includes(kw)
      );
    }

    setFilteredProviders(result);
  }, [providers, selectedArea, topRatedOnly, keyword]);

  const resetFilters = () => {
    setKeyword('');
    setSelectedArea('all');
    setSelectedCategory('all');
    setVerifiedOnly(false);
    setTopRatedOnly(false);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header & Title */}
      <div>
        <h2 className="font-extrabold text-midnight-navy text-xl tracking-tight">
          {t('exploreTitle')}
        </h2>
        <p className="text-xs text-dark-slate/80 mt-0.5">
          Find verified plumbers, electricians, drinking water deliveries & cleaners across Buea.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={t('searchProvidersInput')}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-pure-white border border-cloud-gray text-xs text-midnight-navy placeholder:text-dark-slate/50 font-medium focus:outline-royal-indigo shadow-card"
        />
        <Search className="w-4 h-4 text-dark-slate/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
      </div>

      {/* Buea Neighbourhood Selector (Dropdown Chip) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center bg-pure-white px-3 py-1.5 rounded-2xl border border-cloud-gray shadow-xs shrink-0">
          <MapPin className="w-3.5 h-3.5 text-royal-indigo mr-1.5 shrink-0" />
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="text-xs font-bold text-midnight-navy bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="all">{t('allNeighbourhoods')}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Chip: Verified Only */}
        <button
          onClick={() => setVerifiedOnly(!verifiedOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
            verifiedOnly
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-pure-white text-dark-slate/80 border-cloud-gray hover:bg-cloud-gray/50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t('filterVerification')}</span>
        </button>

        {/* Filter Chip: Top Rated */}
        <button
          onClick={() => setTopRatedOnly(!topRatedOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
            topRatedOnly
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-pure-white text-dark-slate/80 border-cloud-gray hover:bg-cloud-gray/50'
          }`}
        >
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span>{t('filterRating')}</span>
        </button>

        {/* Reset Filter Button */}
        {(selectedArea !== 'all' || verifiedOnly || topRatedOnly || keyword) && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-2xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Results Count & Status */}
      <div className="flex items-center justify-between text-xs text-dark-slate/70 px-1 pt-1">
        <span>
          Showing <strong>{filteredProviders.length}</strong> providers in Buea
        </span>
        {selectedArea !== 'all' && (
          <span className="font-semibold text-royal-indigo">
            Area: {selectedArea}
          </span>
        )}
      </div>

      {/* Provider List Cards */}
      {filteredProviders.length === 0 ? (
        <div className="bg-pure-white rounded-3xl p-8 border border-cloud-gray text-center space-y-3 shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-royal-indigo flex items-center justify-center mx-auto">
            <Filter className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-midnight-navy text-sm">
            {t('noProvidersFound')}
          </h4>
          <p className="text-xs text-dark-slate/70 max-w-xs mx-auto">
            Try choosing a different Buea neighbourhood or clearing the verified filter.
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-2xl bg-royal-indigo text-pure-white text-xs font-bold hover:bg-royal-indigo/90 transition-all cursor-pointer"
          >
            {t('resetFilters')}
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onBook={() => onRequestService(provider)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

