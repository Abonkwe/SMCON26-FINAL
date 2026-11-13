import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { KeyRound, CheckCircle2, Copy } from 'lucide-react';

interface JobPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  pin: string;
  isProviderMode?: boolean;
  onVerifyPin?: (enteredPin: string) => Promise<void>;
}

export const JobPinModal: React.FC<JobPinModalProps> = ({
  isOpen,
  onClose,
  pin,
  isProviderMode = false,
  onVerifyPin,
}) => {
  const { t } = useLanguage();
  const { showToast } = useNotification();
  const [enteredPin, setEnteredPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const copyPin = () => {
    navigator.clipboard.writeText(pin);
    showToast('PIN copied to clipboard!', 'success');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onVerifyPin) return;
    setIsVerifying(true);
    try {
      await onVerifyPin(enteredPin);
      showToast('PIN verified! Job marked as IN_PROGRESS.', 'success');
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid PIN';
      showToast(message, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isProviderMode ? t('enterPinToStart') : t('oneTimeJobPin')}
      maxWidth="sm"
    >
      <div className="text-center py-2">
        <div className="w-14 h-14 rounded-3xl bg-indigo-50 border border-royal-indigo/20 text-royal-indigo mx-auto flex items-center justify-center mb-4">
          <KeyRound className="w-7 h-7" />
        </div>

        {!isProviderMode ? (
          <div>
            <p className="text-xs text-dark-slate/80 mb-4 px-2 leading-relaxed">
              {t('sharePinNotice')}
            </p>

            {/* Prominent PIN Display */}
            <div className="inline-flex items-center gap-3 bg-cloud-gray/60 border border-cloud-gray rounded-3xl px-6 py-3 my-2">
              <span className="font-extrabold text-midnight-navy text-3xl tracking-widest font-mono">
                {pin || '4829'}
              </span>
              <button
                onClick={copyPin}
                className="p-1.5 rounded-full hover:bg-pure-white transition-colors text-royal-indigo cursor-pointer"
                title="Copy PIN"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-dark-slate/60 mt-3">
              Only valid for this specific booking. Cannot be reused.
            </p>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-xs text-dark-slate/80 leading-relaxed">
              Ask the customer for their 4-digit check-in PIN to start the service.
            </p>

            <div>
              <input
                type="text"
                maxLength={4}
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                placeholder="4829"
                required
                className="w-36 mx-auto text-center font-extrabold text-2xl tracking-widest font-mono p-2.5 rounded-2xl bg-cloud-gray/50 border border-cloud-gray focus:outline-royal-indigo"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying || enteredPin.length !== 4}
              className="w-full py-2.5 rounded-2xl bg-royal-indigo hover:bg-royal-indigo/90 text-pure-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying...' : 'Verify & Start Job'}</span>
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};

