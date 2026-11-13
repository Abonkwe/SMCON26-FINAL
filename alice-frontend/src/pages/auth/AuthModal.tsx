import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { Phone, ShieldCheck, ArrowRight, Lock } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { sendOtp, verifyOtp } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState('671234567');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [normalizedPhone, setNormalizedPhone] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const cleanDigits = phone.replace(/\D/g, '');
      const fullPhone = cleanDigits.startsWith('237')
        ? `+${cleanDigits}`
        : `+237${cleanDigits.replace(/^0+/, '')}`;

      const res = await sendOtp(fullPhone);
      setNormalizedPhone(res.phone_e164);
      setStep('OTP');
      showToast('OTP sent! Use demo code: 123456', 'info');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error sending OTP';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await verifyOtp(normalizedPhone || `+237${phone}`, otp);
      showToast('Signed in successfully!', 'success');
      onClose();
      setStep('PHONE');
      setOtp('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid OTP code';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('PHONE');
    setOtp('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'PHONE' ? 'Sign In to ALICE' : 'Enter Verification Code'}
      maxWidth="sm"
    >
      {step === 'PHONE' ? (
        <form onSubmit={handleSendOtp} className="space-y-4 text-xs py-1">
          <div className="text-center pb-1">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-royal-indigo/20 text-royal-indigo flex items-center justify-center mx-auto mb-2">
              <Phone className="w-6 h-6" />
            </div>
            <p className="text-dark-slate/80 leading-relaxed">
              Enter your Cameroon mobile phone number to receive a secure SMS OTP.
            </p>
          </div>

          <div>
            <label className="block font-bold text-midnight-navy mb-1.5">
              Cameroon Phone Number
            </label>
            <div className="flex items-center rounded-2xl bg-cloud-gray/40 border border-cloud-gray overflow-hidden focus-within:border-royal-indigo">
              <span className="px-3 py-2.5 bg-cloud-gray/80 font-bold text-midnight-navy border-r border-cloud-gray text-xs">
                🇨🇲 +237
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="6XX XX XX XX"
                required
                className="w-full p-2.5 bg-transparent text-xs text-midnight-navy font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-2xl border border-royal-indigo/20 text-[11px] text-royal-indigo leading-relaxed">
            <strong>Hackathon Demo Note:</strong> Any Cameroon number is accepted. Demo OTP code is <code>123456</code>.
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl bg-royal-indigo hover:bg-royal-indigo/90 active:scale-98 text-pure-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>{isLoading ? 'Sending SMS...' : 'Continue with Phone'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs py-1">
          <div className="text-center pb-1">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-royal-indigo/20 text-royal-indigo flex items-center justify-center mx-auto mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <p className="text-dark-slate/80 leading-relaxed">
              Enter the 6-digit verification code sent to <strong>{normalizedPhone}</strong>
            </p>
          </div>

          <div>
            <label className="block font-bold text-midnight-navy mb-1.5 text-center">
              6-Digit SMS Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              required
              className="w-40 mx-auto text-center font-extrabold text-2xl tracking-widest font-mono p-2.5 rounded-2xl bg-cloud-gray/50 border border-cloud-gray focus:outline-royal-indigo block"
            />
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setOtp('123456')}
              className="text-[11px] font-bold text-royal-indigo hover:underline cursor-pointer"
            >
              Fill Demo Code: 123456
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full py-3 rounded-2xl bg-royal-indigo hover:bg-royal-indigo/90 active:scale-98 text-pure-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isLoading ? 'Verifying...' : 'Verify & Continue'}</span>
          </button>

          <button
            type="button"
            onClick={() => setStep('PHONE')}
            className="w-full text-center text-xs text-dark-slate/60 hover:text-dark-slate font-medium cursor-pointer"
          >
            Change Phone Number
          </button>
        </form>
      )}
    </Modal>
  );
};

