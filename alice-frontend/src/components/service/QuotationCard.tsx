import React, { useState } from 'react';
import { Quotation } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../lib/api';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface QuotationCardProps {
  quotation: Quotation;
  onAccepted: (pin: string) => void;
  onDeclined?: () => void;
}

export const QuotationCard: React.FC<QuotationCardProps> = ({
  quotation,
  onAccepted,
  onDeclined,
}) => {
  const { t } = useLanguage();
  const { showToast } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      const res = await api.bookings.acceptQuotation(quotation.id);
      showToast('Quotation accepted! Booking confirmed.', 'success');
      onAccepted(res.checkin_pin || '4829');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error accepting quotation';
      showToast(message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = () => {
    if (onDeclined) onDeclined();
    showToast('Quotation declined.', 'info');
  };

  // Expiry calculation
  const expiresDate = new Date(quotation.expires_at);
  const hoursLeft = Math.max(0, Math.round((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60)));

  return (
    <div className="bg-pure-white rounded-3xl p-4 border border-royal-indigo/30 shadow-card">
      {/* Header & Expiry Countdown */}
      <div className="flex items-center justify-between border-b border-cloud-gray pb-3 mb-3">
        <h4 className="font-bold text-midnight-navy text-sm">
          {t('quotationReceived')}
        </h4>
        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>{hoursLeft > 0 ? `${hoursLeft}h left` : 'Expiring soon'}</span>
        </span>
      </div>

      {/* Itemized Line Items */}
      <div className="space-y-2 text-xs text-dark-slate mb-4">
        <div className="flex justify-between items-center py-1 border-b border-cloud-gray/50">
          <span className="text-dark-slate/80">{t('labourCost')}</span>
          <span className="font-semibold text-midnight-navy">
            {quotation.labour_xaf.toLocaleString()} XAF
          </span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-cloud-gray/50">
          <span className="text-dark-slate/80">{t('materialsCost')}</span>
          <span className="font-semibold text-midnight-navy">
            {quotation.materials_xaf.toLocaleString()} XAF
          </span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-cloud-gray/50">
          <span className="text-dark-slate/80">{t('deliveryCost')}</span>
          <span className="font-semibold text-midnight-navy">
            {quotation.delivery_xaf.toLocaleString()} XAF
          </span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-cloud-gray/50">
          <span className="text-dark-slate/80">{t('feesCost')}</span>
          <span className="font-semibold text-midnight-navy">
            {quotation.fees_xaf.toLocaleString()} XAF
          </span>
        </div>

        {/* Notes from Provider */}
        {quotation.notes && (
          <p className="p-2.5 bg-cloud-gray/50 rounded-xl text-[11px] text-dark-slate italic border border-cloud-gray leading-relaxed">
            "{quotation.notes}"
          </p>
        )}

        {/* Total XAF */}
        <div className="flex justify-between items-center pt-2">
          <span className="font-bold text-midnight-navy text-sm">{t('totalXAF')}</span>
          <span className="font-extrabold text-royal-indigo text-base">
            {quotation.total_xaf.toLocaleString()} XAF
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={handleDecline}
          disabled={isProcessing}
          className="py-2.5 px-3 rounded-2xl border border-cloud-gray text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>{t('declineQuote')}</span>
        </button>

        <button
          onClick={handleAccept}
          disabled={isProcessing}
          className="py-2.5 px-3 rounded-2xl bg-royal-indigo hover:bg-royal-indigo/90 active:scale-95 text-pure-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{isProcessing ? 'Confirming...' : t('acceptQuote')}</span>
        </button>
      </div>
    </div>
  );
};

