import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { RentalListing } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../lib/api';
import { Calendar, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react';

interface RentalBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: RentalListing | null;
  onSuccess: () => void;
}

export const RentalBookingModal: React.FC<RentalBookingModalProps> = ({
  isOpen,
  onClose,
  listing,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
  );
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!listing) return null;

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const rentalTotal = listing.daily_rate_xaf * days;
  const grandTotal = rentalTotal + listing.deposit_xaf;

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      showToast('You must acknowledge the deposit and inspection terms to proceed.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const idemKey = `rent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await api.rentals.book(
        {
          listing_id: listing.id,
          start_at: `${startDate}T08:00:00+01:00`,
          end_at: `${endDate}T08:00:00+01:00`,
          terms_accepted: true,
        },
        idemKey
      );

      showToast('Power Station booked successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to book rental';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('bookRentalBtn')} maxWidth="md">
      <form onSubmit={handleBooking} className="space-y-4 text-xs">
        {/* Listing Summary */}
        <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-royal-indigo/20">
          <span className="text-[10px] uppercase font-bold text-royal-indigo block">
            Selected Power Station
          </span>
          <h4 className="font-extrabold text-midnight-navy text-sm">
            {listing.model_name}
          </h4>
          <p className="text-[11px] text-dark-slate/80 mt-0.5">
            {listing.capacity_wh} Wh Battery • {listing.continuous_output_w} W Continuous Inverter
          </p>
        </div>

        {/* Third-Party Intermediary Notice (FR-RENT-009) */}
        <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-300/60 text-[11px] text-amber-950 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Third-Party Intermediary Disclosure</span>
          </div>
          <p>
            {t('ownerDisclosure')} <strong>{listing.provider_name}</strong> ({listing.location_area}). ALICE acts strictly as an intermediary platform facilitating discovery and verified handovers.
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block font-bold text-midnight-navy mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-royal-indigo" />
              <span>Rental Start Date</span>
            </label>
            <input
              type="date"
              value={startDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy font-semibold focus:outline-royal-indigo"
            />
          </div>

          <div>
            <label className="block font-bold text-midnight-navy mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-royal-indigo" />
              <span>Return Due Date</span>
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy font-semibold focus:outline-royal-indigo"
            />
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-cloud-gray/30 p-3 rounded-2xl border border-cloud-gray space-y-1.5 text-xs">
          <div className="flex justify-between text-dark-slate">
            <span>Duration:</span>
            <span className="font-bold text-midnight-navy">{days} {days === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="flex justify-between text-dark-slate">
            <span>Rental Fee ({listing.daily_rate_xaf.toLocaleString()} XAF x {days}):</span>
            <span className="font-bold text-midnight-navy">{rentalTotal.toLocaleString()} XAF</span>
          </div>
          <div className="flex justify-between text-dark-slate">
            <span>Refundable Caution / Deposit:</span>
            <span className="font-bold text-amber-700">{listing.deposit_xaf.toLocaleString()} XAF</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-cloud-gray font-extrabold text-midnight-navy text-sm">
            <span>Total Payable:</span>
            <span className="text-royal-indigo">{grandTotal.toLocaleString()} XAF</span>
          </div>
        </div>

        {/* Mandatory Deposit Terms Checkbox (FR-RENT-006) */}
        <div className="p-3 bg-pure-white rounded-2xl border border-cloud-gray flex items-start gap-2.5">
          <input
            type="checkbox"
            id="depositTerms"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 rounded text-royal-indigo focus:ring-royal-indigo cursor-pointer w-4 h-4"
          />
          <label htmlFor="depositTerms" className="text-[11px] text-dark-slate leading-relaxed cursor-pointer select-none">
            {t('acceptDepositTerms')} I understand that battery condition, cables, and cosmetic status are recorded at handover and return.
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !termsAccepted}
          className="w-full py-3 rounded-2xl bg-royal-indigo hover:bg-royal-indigo/90 active:scale-98 text-pure-white text-xs font-bold transition-all shadow-elevated flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          <span>{isSubmitting ? 'Confirming Rental...' : 'Confirm & Reserve Unit'}</span>
        </button>
      </form>
    </Modal>
  );
};

