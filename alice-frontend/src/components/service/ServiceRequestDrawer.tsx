import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ProviderSearchResult, ServiceArea, ServiceCategory, ServiceItem } from '../../types';
import { api } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { Wrench, MapPin, Calendar, FileText, Camera, Check, ArrowRight } from 'lucide-react';

interface ServiceRequestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProvider?: ProviderSearchResult | null;
  onSuccess: () => void;
}

export const ServiceRequestDrawer: React.FC<ServiceRequestDrawerProps> = ({
  isOpen,
  onClose,
  preselectedProvider,
  onSuccess,
}) => {
  const { t, language } = useLanguage();
  const { showToast } = useNotification();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [areas, setAreas] = useState<ServiceArea[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [description, setDescription] = useState('');
  const [selectedArea, setSelectedArea] = useState('Molyko');
  const [addressDetails, setAddressDetails] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [photoMock, setPhotoMock] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.catalogue.getCategories().then((cats) => {
        setCategories(cats);
        if (cats.length > 0 && !selectedCategory) {
          setSelectedCategory(cats[0].id);
        }
      });
      api.catalogue.getAreas().then(setAreas);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCategory) {
      api.catalogue.getServices(selectedCategory).then((srvs) => {
        setServices(srvs);
        if (srvs.length > 0) {
          setSelectedService(srvs[0].id);
        }
      });
    }
  }, [selectedCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('Please provide a brief description of the issue or requirement.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const providerId = preselectedProvider ? preselectedProvider.id : 'prov-1';
      const idemKey = `book-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      await api.bookings.create(
        {
          provider_id: providerId,
          service_id: selectedService || 'srv-plumb-1',
          neighbourhood: `${selectedArea}${addressDetails ? ` - ${addressDetails}` : ''}`,
          description,
          scheduled_at: scheduledAt || new Date(Date.now() + 3600000 * 2).toISOString(),
        },
        idemKey
      );

      showToast('Service request submitted successfully!', 'success');
      onSuccess();
      onClose();
      // Reset form
      setDescription('');
      setAddressDetails('');
      setPhotoMock(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit request';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('requestServiceTitle')} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Preselected Provider Notice */}
        {preselectedProvider && (
          <div className="p-3 bg-indigo-50/60 rounded-2xl border border-royal-indigo/20 flex items-center justify-between">
            <div>
              <span className="block text-[10px] uppercase font-bold text-royal-indigo">
                Targeted Provider
              </span>
              <span className="font-bold text-midnight-navy text-sm">
                {preselectedProvider.display_name}
              </span>
            </div>
            <div className="text-right text-[11px] text-dark-slate/80">
              {preselectedProvider.area_names[0] || 'Buea'}
            </div>
          </div>
        )}

        {/* 1. Category & Service Selection */}
        <div>
          <label className="block font-bold text-midnight-navy mb-1.5 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-royal-indigo" />
            <span>{t('selectCategory')}</span>
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy font-medium focus:outline-royal-indigo"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {language === 'fr' ? c.name_fr : c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-midnight-navy mb-1.5">
            {t('selectService')}
          </label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy font-medium focus:outline-royal-indigo"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {language === 'fr' ? s.name_fr : s.name} (
                {s.pricing_type === 'FIXED' ? `${s.indicative_price_xaf?.toLocaleString()} XAF` : 'Quote basis'}
                )
              </option>
            ))}
          </select>
        </div>

        {/* 2. Issue Description */}
        <div>
          <label className="block font-bold text-midnight-navy mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-royal-indigo" />
            <span>{t('describeIssue')} *</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            required
            placeholder="e.g., Leaking pipe in the bathroom upstairs, need urgent repair before evening."
            className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy placeholder:text-dark-slate/40 focus:outline-royal-indigo leading-relaxed"
          />
        </div>

        {/* 3. Buea Neighbourhood & Street Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block font-bold text-midnight-navy mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-royal-indigo" />
              <span>{t('chooseNeighbourhood')}</span>
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy font-medium focus:outline-royal-indigo"
            >
              {areas.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-midnight-navy mb-1.5">
              Street / Landmark
            </label>
            <input
              type="text"
              value={addressDetails}
              onChange={(e) => setAddressDetails(e.target.value)}
              placeholder="e.g. Near UB Junction, Gate 2"
              className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy focus:outline-royal-indigo"
            />
          </div>
        </div>

        {/* 4. Preferred Time Window */}
        <div>
          <label className="block font-bold text-midnight-navy mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-royal-indigo" />
            <span>{t('preferredTime')}</span>
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy focus:outline-royal-indigo"
          />
        </div>

        {/* 5. Optional Photo Reference Uploader */}
        <div>
          <label className="block font-bold text-midnight-navy mb-1.5 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-royal-indigo" />
            <span>{t('attachPhoto')}</span>
          </label>
          {photoMock ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-300">
              <span className="text-emerald-800 text-xs font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Photo Attached (site_reference.jpg)
              </span>
              <button
                type="button"
                onClick={() => setPhotoMock(null)}
                className="text-xs text-rose-600 font-bold hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPhotoMock('data:image/mock')}
              className="w-full border border-dashed border-royal-indigo/40 hover:border-royal-indigo rounded-xl p-3 text-center text-xs text-royal-indigo font-bold hover:bg-indigo-50/30 transition-all cursor-pointer"
            >
              + Click to attach photo of the issue
            </button>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-2xl bg-royal-indigo hover:bg-royal-indigo/90 active:scale-98 text-pure-white text-sm font-bold shadow-elevated flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Submitting...</span>
            ) : (
              <>
                <span>{t('submitRequestBtn')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

