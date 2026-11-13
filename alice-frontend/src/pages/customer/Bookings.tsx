import React, { useState, useEffect } from 'react';
import { Booking } from '../../types';
import { api } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { StatusPill } from '../../components/common/StatusPill';
import { QuotationCard } from '../../components/service/QuotationCard';
import { JobPinModal } from '../../components/service/JobPinModal';
import { ReviewModal } from '../../components/service/ReviewModal';
import { ReportModal } from '../../components/safety/ReportModal';
import {
  Calendar,
  MapPin,
  CheckCircle,
  KeyRound,
  Star,
  ShieldAlert,
  ChevronRight,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const Bookings: React.FC<{ onRequestNewService: () => void }> = ({
  onRequestNewService,
}) => {
  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [complaintBookingId, setComplaintBookingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const loadBookings = async () => {
    try {
      const data = await api.bookings.list();
      setBookings(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCustomerConfirmCompletion = async (bookingId: string) => {
    try {
      await api.bookings.updateStatus(bookingId, 'COMPLETED');
      showToast('Service marked as fully COMPLETED. You can now leave a review!', 'success');
      loadBookings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error confirming completion';
      showToast(message, 'error');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'ACTIVE') {
      return ['REQUESTED', 'QUOTATION_PENDING', 'QUOTATION_RECEIVED', 'ACCEPTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED_PENDING_CONFIRMATION'].includes(b.status);
    }
    if (activeTab === 'COMPLETED') {
      return b.status === 'COMPLETED';
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-midnight-navy text-xl tracking-tight">
            My Service Bookings
          </h2>
          <p className="text-xs text-dark-slate/80 mt-0.5">
            Track status, quotations, job-start PINs, and completion sign-offs.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center bg-pure-white p-1 rounded-2xl border border-cloud-gray shadow-xs gap-1 text-xs">
        {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-royal-indigo text-pure-white shadow-xs'
                : 'text-dark-slate/70 hover:text-midnight-navy hover:bg-cloud-gray/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-pure-white rounded-3xl p-8 border border-cloud-gray text-center space-y-3 shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-royal-indigo flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-midnight-navy text-sm">No bookings in this tab</h4>
          <p className="text-xs text-dark-slate/70 max-w-xs mx-auto">
            Need home repairs, water delivery, or cooking gas in Buea?
          </p>
          <button
            onClick={onRequestNewService}
            className="px-4 py-2 rounded-2xl bg-royal-indigo text-pure-white text-xs font-bold hover:bg-royal-indigo/90 transition-all cursor-pointer"
          >
            Request a Service
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card space-y-3"
            >
              {/* Header: Reference & Status */}
              <div className="flex items-center justify-between border-b border-cloud-gray/60 pb-2.5">
                <div>
                  <span className="font-mono text-[11px] font-bold text-royal-indigo block">
                    {b.reference}
                  </span>
                  <span className="text-[10px] text-dark-slate/60">
                    {new Date(b.created_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <StatusPill status={b.status} />
              </div>

              {/* Service & Provider */}
              <div>
                <h3 className="font-extrabold text-midnight-navy text-base leading-snug">
                  {b.service_name}
                </h3>
                <p className="text-xs text-dark-slate/90 mt-1 flex items-center gap-1.5">
                  <span>Provider: <strong>{b.provider_name}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-royal-indigo" />
                    {b.neighbourhood}
                  </span>
                </p>
                <p className="text-xs text-dark-slate/75 italic mt-1.5 leading-relaxed bg-cloud-gray/30 p-2 rounded-xl">
                  "{b.description}"
                </p>
              </div>

              {/* Status Timeline History */}
              <div className="bg-cloud-gray/40 rounded-2xl p-2.5 space-y-1.5 text-[11px]">
                <span className="text-[10px] uppercase font-bold text-dark-slate/60 block mb-1">
                  Lifecycle Timeline
                </span>
                {b.history.map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between text-dark-slate">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-royal-indigo" />
                      <span>{h.status.replace(/_/g, ' ')}</span>
                      {h.note && <span className="text-royal-indigo italic font-normal">({h.note})</span>}
                    </span>
                    <span className="text-[10px] text-dark-slate/60">
                      {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Conditional Lifecycle Action Blocks */}

              {/* 1. If Quotation Received: Display Itemized Breakdown Card */}
              {b.status === 'QUOTATION_RECEIVED' && b.active_quotation && (
                <div className="pt-1">
                  <QuotationCard
                    quotation={b.active_quotation}
                    onAccepted={(pin) => {
                      setSelectedPin(pin);
                      loadBookings();
                    }}
                    onDeclined={() => {
                      api.bookings.updateStatus(b.id, 'CANCELLED');
                      loadBookings();
                    }}
                  />
                </div>
              )}

              {/* 2. If Confirmed or In Progress: Display Job PIN */}
              {['CONFIRMED', 'IN_PROGRESS'].includes(b.status) && b.checkin_pin && (
                <div className="bg-indigo-50/70 rounded-2xl p-3 border border-royal-indigo/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-pure-white text-royal-indigo flex items-center justify-center font-bold shadow-xs">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-royal-indigo">
                        One-Time Job PIN
                      </span>
                      <span className="font-mono font-extrabold text-midnight-navy text-lg tracking-widest">
                        {b.checkin_pin}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPin(b.checkin_pin || '4829')}
                    className="px-3 py-1.5 rounded-xl bg-royal-indigo text-pure-white text-xs font-bold hover:bg-royal-indigo/90 transition-all cursor-pointer"
                  >
                    View PIN
                  </button>
                </div>
              )}

              {/* 3. If Provider marked done (COMPLETED_PENDING_CONFIRMATION): Customer confirms */}
              {b.status === 'COMPLETED_PENDING_CONFIRMATION' && (
                <div className="bg-amber-50 rounded-2xl p-3 border border-amber-300 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <CheckCircle className="w-4 h-4 text-amber-700" />
                    <span>Provider has marked this service completed!</span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed">
                    Please inspect the work. If satisfied, confirm to release settlement and finalize the booking.
                  </p>
                  <button
                    onClick={() => handleCustomerConfirmCompletion(b.id)}
                    className="w-full py-2.5 rounded-xl bg-royal-indigo hover:bg-royal-indigo/90 text-pure-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    {t('confirmCompletion')}
                  </button>
                </div>
              )}

              {/* Action Toolbar: Review & Report */}
              <div className="flex items-center justify-between pt-2 border-t border-cloud-gray text-xs">
                {/* Leave Review Button (AC-09: Blocked for non-completed bookings) */}
                <button
                  onClick={() => setReviewBooking(b)}
                  className={`flex items-center gap-1 font-bold cursor-pointer ${
                    b.status === 'COMPLETED'
                      ? 'text-amber-600 hover:text-amber-700'
                      : 'text-dark-slate/40 hover:text-dark-slate/60'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${b.status === 'COMPLETED' ? 'fill-amber-500 text-amber-500' : ''}`} />
                  <span>{b.reviewed ? 'Review Submitted' : t('leaveReview')}</span>
                </button>

                {/* Report Dispute Button */}
                <button
                  onClick={() => setComplaintBookingId(b.id)}
                  className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-bold text-xs cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{t('reportIssue')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Job PIN Display Modal */}
      {selectedPin && (
        <JobPinModal
          isOpen={Boolean(selectedPin)}
          onClose={() => setSelectedPin(null)}
          pin={selectedPin}
        />
      )}

      {/* Review Modal */}
      {reviewBooking && (
        <ReviewModal
          isOpen={Boolean(reviewBooking)}
          onClose={() => setReviewBooking(null)}
          booking={reviewBooking}
          onSuccess={loadBookings}
        />
      )}

      {/* Dispute / Complaint Modal */}
      {complaintBookingId && (
        <ReportModal
          isOpen={Boolean(complaintBookingId)}
          onClose={() => setComplaintBookingId(null)}
          bookingId={complaintBookingId}
          onSuccess={loadBookings}
        />
      )}
    </div>
  );
};

