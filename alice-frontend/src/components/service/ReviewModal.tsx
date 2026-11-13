import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Booking } from '../../types';
import { api } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { Star, ShieldAlert } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { showToast } = useNotification();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!booking) return null;

  // Strict AC-09 Enforcement: Only COMPLETED bookings can be reviewed
  const isEligible = booking.status === 'COMPLETED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEligible) {
      showToast('Reviews can only be submitted for completed bookings (AC-09).', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.reviews.submit({
        booking_id: booking.id,
        rating,
        comment,
      });
      showToast('Thank you! Your review has been submitted.', 'success');
      onSuccess();
      onClose();
      setComment('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error submitting review';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('leaveReview')} maxWidth="sm">
      {!isEligible ? (
        <div className="text-center py-4 space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-midnight-navy text-sm">Review Unavailable</h4>
          <p className="text-xs text-dark-slate/80 leading-relaxed px-2">
            According to ALICE trust rules (`AC-09`), reviews can only be submitted once the service has been fully marked complete and confirmed by both parties.
          </p>
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-rose-600 uppercase bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
              Current Status: {booking.status}
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <span className="block text-[11px] text-dark-slate/60 font-semibold mb-1">
              Provider
            </span>
            <span className="font-bold text-midnight-navy text-sm">
              {booking.provider_name}
            </span>
          </div>

          {/* Star Rating Selector */}
          <div>
            <label className="block font-bold text-midnight-navy mb-2">
              Rating (1 to 5 Stars)
            </label>
            <div className="flex items-center gap-2 justify-center py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 cursor-pointer transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-cloud-gray hover:text-amber-200'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block font-bold text-midnight-navy mb-1.5">
              Review & Experience
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              required
              placeholder="How was the work quality, punctuality, and professionalism?"
              className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy focus:outline-royal-indigo leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-2xl bg-royal-indigo hover:bg-royal-indigo/90 text-pure-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}
    </Modal>
  );
};

