import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Complaint } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../lib/api';
import { ShieldAlert, AlertTriangle, Send } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  onSuccess?: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [category, setCategory] = useState<Complaint['category']>('SAFETY');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCaseRef, setSubmittedCaseRef] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('Please describe the incident or concern.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.disputes.lodge({
        booking_id: bookingId,
        category,
        description,
      });

      setSubmittedCaseRef(res.case_reference);
      showToast(`Complaint filed: ${res.case_reference}`, 'success');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error filing complaint';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmittedCaseRef(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('safetyTrigger')} maxWidth="md">
      {submittedCaseRef ? (
        <div className="text-center py-4 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-midnight-navy text-sm">Report Logged Under Priority Review</h4>
          <p className="text-xs text-dark-slate/80 leading-relaxed px-2">
            Your case reference has been created and assigned to ALICE Trust & Safety staff:
          </p>
          <div className="py-2">
            <span className="font-mono font-extrabold text-sm px-4 py-1.5 rounded-full bg-indigo-50 text-royal-indigo border border-royal-indigo/20">
              {submittedCaseRef}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-2xl bg-royal-indigo text-pure-white text-xs font-bold transition-all shadow-xs"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Emergency Services Disclaimer (Section 4.5 & 12.1) */}
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-2.5 text-rose-900 leading-snug">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-[11px]">
              <strong>Immediate Danger Notice:</strong> ALICE in-app reporting is not a substitute for local emergency services. In case of immediate physical danger, contact Buea Police (117) or Emergency Medical Services immediately.
            </p>
          </div>

          <div>
            <label className="block font-bold text-midnight-navy mb-1.5">
              Incident or Complaint Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Complaint['category'])}
              className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy font-medium focus:outline-royal-indigo"
            >
              <option value="SAFETY">Safety Hazard / Immediate Threat / Harassment</option>
              <option value="POOR_SERVICE">Unsatisfactory Service / Incomplete Job</option>
              <option value="NO_SHOW">Provider Did Not Show Up</option>
              <option value="OVERCHARGING">Overcharging / Pricing Dispute</option>
              <option value="EQUIPMENT_DAMAGE">Equipment Damage / Mishandling</option>
              <option value="OTHER">Other Policy Issue</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-midnight-navy mb-1.5">
              Incident Details & Statement *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
              placeholder="Provide a factual summary of what happened, dates/times, and any witnesses."
              className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy focus:outline-royal-indigo leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-pure-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Filing Report...' : 'Submit Incident Report to Admin'}</span>
          </button>
        </form>
      )}
    </Modal>
  );
};

