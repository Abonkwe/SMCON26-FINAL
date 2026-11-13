import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { RentalBooking } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../lib/api';
import { ClipboardCheck, Battery, CheckSquare, Hash } from 'lucide-react';

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: RentalBooking | null;
  inspectionType: 'HANDOVER' | 'RETURN';
  onSuccess: () => void;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({
  isOpen,
  onClose,
  booking,
  inspectionType,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [batteryLevel, setBatteryLevel] = useState(100);
  const [cosmetic, setCosmetic] = useState('Clean / No scratches');
  const [serialNumber, setSerialNumber] = useState('EF-MAX-2048-CM08');
  const [notes, setNotes] = useState('All ports tested and operational.');
  const [accessories, setAccessories] = useState<string[]>([
    'AC Power Cord',
    'Car 12V Charger',
    'Solar Adapter MC4',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!booking) return null;

  const toggleAccessory = (acc: string) => {
    setAccessories((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.rentals.createInspection(booking.id, {
        rental_id: booking.id,
        inspection_type: inspectionType,
        battery_percentage: batteryLevel,
        cosmetic_condition: cosmetic,
        accessories_included: accessories,
        serial_number: serialNumber,
        notes,
        recorded_by: 'Customer & Owner Co-Signed',
      });

      showToast(`${inspectionType} inspection logged successfully!`, 'success');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error logging inspection';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${inspectionType === 'HANDOVER' ? 'Handover' : 'Return'} ${t('inspectionLogTitle')}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-indigo-50/50 p-3 rounded-2xl border border-royal-indigo/20 flex items-center justify-between">
          <div>
            <span className="font-extrabold text-midnight-navy block text-sm">
              {booking.model_name}
            </span>
            <span className="text-[11px] text-dark-slate/80">Ref: {booking.reference}</span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-royal-indigo text-pure-white">
            {inspectionType}
          </span>
        </div>

        {/* Battery Level */}
        <div>
          <label className="block font-bold text-midnight-navy mb-1.5 flex items-center gap-1.5">
            <Battery className="w-4 h-4 text-royal-indigo" />
            <span>{t('batteryLevel')}: {batteryLevel}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={batteryLevel}
            onChange={(e) => setBatteryLevel(Number(e.target.value))}
            className="w-full accent-royal-indigo cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-dark-slate/60 mt-1 font-semibold">
            <span>0% (Empty)</span>
            <span>50%</span>
            <span>100% (Full)</span>
          </div>
        </div>

        {/* Unit Serial Number */}
        <div>
          <label className="block font-bold text-midnight-navy mb-1.5 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-royal-indigo" />
            <span>{t('serialNumber')}</span>
          </label>
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            required
            className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy font-mono focus:outline-royal-indigo"
          />
        </div>

        {/* Cosmetic Condition */}
        <div>
          <label className="block font-bold text-midnight-navy mb-1.5">
            Cosmetic & Physical Condition
          </label>
          <select
            value={cosmetic}
            onChange={(e) => setCosmetic(e.target.value)}
            className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy font-medium focus:outline-royal-indigo"
          >
            <option value="Clean / No scratches">Clean / No scratches</option>
            <option value="Minor surface scuffs (Normal wear)">Minor surface scuffs (Normal wear)</option>
            <option value="Notable casing scratch / dent">Notable casing scratch / dent</option>
            <option value="Damaged port flap / handle loose">Damaged port flap / handle loose</option>
          </select>
        </div>

        {/* Accessories Checklist */}
        <div>
          <label className="block font-bold text-midnight-navy mb-1.5 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-royal-indigo" />
            <span>Included Cables & Accessories</span>
          </label>
          <div className="space-y-1.5">
            {[
              'AC Power Cord (230V)',
              'Car 12V Charger Cable',
              'Solar Adapter Cable (MC4 to XT60)',
              'User Operation Guide & Quick Card',
            ].map((acc) => (
              <label
                key={acc}
                className="flex items-center gap-2 p-2 rounded-xl bg-cloud-gray/30 border border-cloud-gray cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={accessories.includes(acc)}
                  onChange={() => toggleAccessory(acc)}
                  className="rounded text-royal-indigo focus:ring-royal-indigo"
                />
                <span className="text-xs text-midnight-navy font-medium">{acc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-bold text-midnight-navy mb-1.5">
            {t('inspectionNotes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2 text-xs text-midnight-navy focus:outline-royal-indigo leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-2xl bg-royal-indigo hover:bg-royal-indigo/90 text-pure-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>{isSubmitting ? 'Recording Inspection...' : t('confirmInspection')}</span>
        </button>
      </form>
    </Modal>
  );
};

