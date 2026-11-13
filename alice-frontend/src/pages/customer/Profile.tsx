import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../lib/api';
import { StatusPill } from '../../components/common/StatusPill';
import { RoleSwitcher } from '../../components/layout/RoleSwitcher';
import { Modal } from '../../components/common/Modal';
import {
  User,
  Phone,
  ShieldCheck,
  Award,
  MapPin,
  Globe,
  MessageSquare,
  LogOut,
  Plus,
  Upload,
  Check,
  Clock,
  Copy,
} from 'lucide-react';

export const Profile: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { user, isAuthenticated, logout, refreshProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useNotification();

  // WhatsApp Linking state (Appendix D.6 & E.7)
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [linkingExpiresIn, setLinkingExpiresIn] = useState<number>(600);
  const [isLinkingLoading, setIsLinkingLoading] = useState(false);

  // Address modal
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [newNeighbourhood, setNewNeighbourhood] = useState('Molyko');
  const [newStreet, setNewStreet] = useState('');
  const [newLandmark, setNewLandmark] = useState('');

  // ID Verification upload modal
  const [isIdUploadOpen, setIsIdUploadOpen] = useState(false);
  const [idDocType, setIdDocType] = useState('Cameroon National ID (CNI)');

  // Competence verification upload modal
  const [isCompetenceUploadOpen, setIsCompetenceUploadOpen] = useState(false);
  const [compDocType, setCompDocType] = useState('Trade Certificate / Apprenticeship');

  // Countdown timer for WhatsApp linking code
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (linkingCode && linkingExpiresIn > 0) {
      interval = setInterval(() => {
        setLinkingExpiresIn((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [linkingCode, linkingExpiresIn]);

  const handleStartWhatsAppLink = async () => {
    setIsLinkingLoading(true);
    try {
      const res = await api.whatsapp.startLink();
      setLinkingCode(res.linking_code);
      setLinkingExpiresIn(res.expires_in_seconds || 600);
      showToast('WhatsApp linking code generated!', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error starting WhatsApp link';
      showToast(message, 'error');
    } finally {
      setIsLinkingLoading(false);
    }
  };

  const copyLinkInstruction = () => {
    if (!linkingCode) return;
    navigator.clipboard.writeText(`LINK ${linkingCode}`);
    showToast('Copied "LINK ' + linkingCode + '" to clipboard!', 'success');
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreet.trim()) return;
    try {
      await api.users.addAddress({
        neighbourhood: newNeighbourhood,
        street_address: newStreet,
        landmark: newLandmark || undefined,
      });
      await refreshProfile();
      setIsAddressModalOpen(false);
      setNewStreet('');
      setNewLandmark('');
      showToast('Address added successfully!', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add address';
      showToast(message, 'error');
    }
  };

  const handleUploadId = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.verifications.submitIdentity({
        document_type: idDocType,
        document_url: 'https://placehold.co/800x500/181B2A/FDFDFE?text=National+CNI+Document',
      });
      await refreshProfile();
      setIsIdUploadOpen(false);
      showToast('National ID submitted for admin review.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      showToast(message, 'error');
    }
  };

  const handleUploadCompetence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.verifications.submitCompetence({
        service_id: 'srv-plumb-1',
        document_type: compDocType,
        document_url: 'https://placehold.co/800x500/585FB7/FDFDFE?text=Trade+Certificate+Document',
      });
      await refreshProfile();
      setIsCompetenceUploadOpen(false);
      showToast('Skill credential submitted for review.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      showToast(message, 'error');
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="space-y-4 pb-12">
        <RoleSwitcher />
        <div className="bg-pure-white rounded-3xl p-8 border border-cloud-gray text-center space-y-4 shadow-card">
          <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-royal-indigo flex items-center justify-center mx-auto">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-midnight-navy text-lg">
              Sign In to Your Account
            </h3>
            <p className="text-xs text-dark-slate/80 mt-1 max-w-xs mx-auto">
              Access your Buea service requests, job-start PINs, verified profile and power rentals.
            </p>
          </div>
          <button
            onClick={onOpenAuth}
            className="w-full py-3 rounded-2xl bg-royal-indigo text-pure-white font-bold text-xs shadow-elevated cursor-pointer"
          >
            Sign In with Cameroon Phone (+237)
          </button>
        </div>
      </div>
    );
  }

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Role Switcher Pill */}
      <RoleSwitcher />

      {/* User Header Card */}
      <div className="bg-pure-white rounded-3xl p-5 border border-cloud-gray shadow-card flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-royal-indigo text-pure-white font-extrabold text-lg flex items-center justify-center shadow-card shrink-0">
            {user.display_name.charAt(0)}
          </div>
          <div>
            <h3 className="font-extrabold text-midnight-navy text-base leading-snug">
              {user.display_name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-dark-slate/80 mt-0.5">
              <Phone className="w-3.5 h-3.5 text-royal-indigo" />
              <span className="font-semibold">{user.phone_e164}</span>
            </div>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-royal-indigo border border-royal-indigo/20">
              {user.roles.join(' • ')}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-2xl border border-cloud-gray text-dark-slate/60 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Two-Tier Trust & Verification Cards (FR-VER-001 & 004) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Tier 1: Identity Verification (CNI / Passport) */}
        <div className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-royal-indigo flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Level 1: Identity</span>
              </span>
              <StatusPill status={user.identity_status} />
            </div>
            <h4 className="font-bold text-midnight-navy text-xs mb-1">
              National ID / Passport Verification
            </h4>
            <p className="text-[11px] text-dark-slate/75 leading-relaxed mb-3">
              Verifies official legal identity in Cameroon. Applies to both customers and service providers.
            </p>
          </div>

          <div>
            {user.identity_status !== 'VERIFIED' ? (
              <button
                onClick={() => setIsIdUploadOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-royal-indigo text-pure-white font-bold text-[11px] shadow-xs hover:bg-royal-indigo/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{user.identity_status === 'PENDING_REVIEW' ? 'Re-upload CNI' : 'Upload CNI / Passport'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                <Check className="w-4 h-4" />
                <span>Identity Verified by Admin</span>
              </div>
            )}
          </div>
        </div>

        {/* Tier 2: Competence Verification (Trade Credentials) */}
        <div className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-royal-indigo flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>Level 2: Skill Competence</span>
              </span>
              <StatusPill status={user.competence_status} />
            </div>
            <h4 className="font-bold text-midnight-navy text-xs mb-1">
              Trade Credential & Skill Assessment
            </h4>
            <p className="text-[11px] text-dark-slate/75 leading-relaxed mb-3">
              Specific to technical categories (Electrical, Plumbing, Gas Refill). Evaluated per service category.
            </p>
          </div>

          <div>
            {user.competence_status !== 'VERIFIED' ? (
              <button
                onClick={() => setIsCompetenceUploadOpen(true)}
                className="w-full py-2 px-3 rounded-xl border border-royal-indigo/30 text-royal-indigo hover:bg-indigo-50/50 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Submit Trade Certificate</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                <Check className="w-4 h-4" />
                <span>Skill Assessed by Admin</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Assistant Linking Card (Appendix D.6 & E.7) */}
      <div className="bg-pure-white rounded-3xl p-4 border border-royal-indigo/30 shadow-card">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-midnight-navy text-sm">
              {t('linkWhatsAppTitle')}
            </h4>
            <p className="text-xs text-dark-slate/80 leading-relaxed">
              {t('linkWhatsAppDesc')}
            </p>
          </div>
        </div>

        {linkingCode ? (
          <div className="bg-cloud-gray/50 rounded-2xl p-3 border border-cloud-gray space-y-2 text-xs">
            <p className="text-dark-slate font-medium">
              {t('linkingInstructions')}
            </p>
            <div className="flex items-center justify-between bg-pure-white p-2.5 rounded-xl border border-royal-indigo/30">
              <span className="font-mono font-extrabold text-royal-indigo text-base tracking-wider">
                LINK {linkingCode}
              </span>
              <button
                onClick={copyLinkInstruction}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 text-royal-indigo text-xs font-bold hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('linkCodeExpires')} {formatSeconds(linkingExpiresIn)}</span>
            </div>
          </div>
        ) : (
          <button
            onClick={handleStartWhatsAppLink}
            disabled={isLinkingLoading}
            className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-pure-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{isLinkingLoading ? 'Generating Code...' : t('generateLinkCodeBtn')}</span>
          </button>
        )}
      </div>

      {/* Saved Buea Addresses */}
      <div className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-midnight-navy text-sm flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-royal-indigo" />
            <span>{t('savedAddresses')}</span>
          </h4>
          <button
            onClick={() => setIsAddressModalOpen(true)}
            className="text-xs font-bold text-royal-indigo hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('addAddressBtn')}</span>
          </button>
        </div>

        <div className="space-y-2">
          {user.addresses.map((addr) => (
            <div
              key={addr.id}
              className="p-3 rounded-2xl bg-cloud-gray/40 border border-cloud-gray flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-midnight-navy block">
                  {addr.neighbourhood} {addr.is_primary && '(Primary)'}
                </span>
                <span className="text-dark-slate/80">{addr.street_address}</span>
                {addr.landmark && (
                  <span className="text-[10px] text-dark-slate/60 block mt-0.5">
                    Landmark: {addr.landmark}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Language Toggle Setting (NFR-UX-002) */}
      <div className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-royal-indigo flex items-center justify-center font-bold">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-midnight-navy">
              {t('languageToggle')}
            </h4>
            <p className="text-[11px] text-dark-slate/70">
              English or French language preference
            </p>
          </div>
        </div>

        <div className="flex items-center bg-cloud-gray/60 p-1 rounded-2xl border border-cloud-gray gap-1">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-royal-indigo text-pure-white shadow-xs'
                : 'text-dark-slate hover:text-midnight-navy'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('fr')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              language === 'fr'
                ? 'bg-royal-indigo text-pure-white shadow-xs'
                : 'text-dark-slate hover:text-midnight-navy'
            }`}
          >
            FR
          </button>
        </div>
      </div>

      {/* Address Creation Modal */}
      <Modal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title={t('addAddressBtn')}
        maxWidth="sm"
      >
        <form onSubmit={handleAddAddress} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-midnight-navy mb-1.5">
              Buea Neighbourhood
            </label>
            <select
              value={newNeighbourhood}
              onChange={(e) => setNewNeighbourhood(e.target.value)}
              className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy font-semibold focus:outline-royal-indigo"
            >
              {[
                'Molyko',
                'Mile 16 (Bolifamba)',
                'Bonduma',
                'Great Soppo',
                'Small Soppo',
                'Bokwango',
                'Muea',
                'Sandpit',
                'Check Point',
                'Clerks Quarters',
                'Buea Town',
              ].map((nh) => (
                <option key={nh} value={nh}>
                  {nh}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-midnight-navy mb-1.5">
              Street / Location Description *
            </label>
            <input
              type="text"
              value={newStreet}
              onChange={(e) => setNewStreet(e.target.value)}
              required
              placeholder="e.g. Opposite Hall 2 Gate, Upper Molyko"
              className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy focus:outline-royal-indigo"
            />
          </div>

          <div>
            <label className="block font-bold text-midnight-navy mb-1.5">
              Nearby Landmark (Optional)
            </label>
            <input
              type="text"
              value={newLandmark}
              onChange={(e) => setNewLandmark(e.target.value)}
              placeholder="e.g. Near MTN Kiosk"
              className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy focus:outline-royal-indigo"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-2xl bg-royal-indigo text-pure-white font-bold text-xs shadow-xs hover:bg-royal-indigo/90 transition-all cursor-pointer"
          >
            Save Address
          </button>
        </form>
      </Modal>

      {/* ID Upload Modal */}
      <Modal
        isOpen={isIdUploadOpen}
        onClose={() => setIsIdUploadOpen(false)}
        title={t('uploadNationalId')}
        maxWidth="sm"
      >
        <form onSubmit={handleUploadId} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-midnight-navy mb-1.5">
              Document Type
            </label>
            <select
              value={idDocType}
              onChange={(e) => setIdDocType(e.target.value)}
              className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy font-semibold focus:outline-royal-indigo"
            >
              <option value="Cameroon National ID (CNI)">Cameroon National ID (CNI)</option>
              <option value="Passport">Cameroon / CEMAC Passport</option>
              <option value="Student ID (University of Buea)">Student ID (University of Buea)</option>
            </select>
          </div>

          <div className="p-4 border-2 border-dashed border-royal-indigo/30 rounded-2xl text-center bg-indigo-50/30">
            <Upload className="w-8 h-8 text-royal-indigo mx-auto mb-2" />
            <span className="font-bold text-royal-indigo block text-xs">
              Simulate File Upload
            </span>
            <span className="text-[10px] text-dark-slate/60 block mt-1">
              File: national_cni_cameroon.jpg (2.4 MB)
            </span>
          </div>

          <p className="text-[11px] text-dark-slate/70 leading-relaxed">
            Identity documents are stored in ALICE private encrypted storage (`AC-12`) and accessed solely by authorised human reviewers.
          </p>

          <button
            type="submit"
            className="w-full py-2.5 rounded-2xl bg-royal-indigo text-pure-white font-bold text-xs shadow-xs hover:bg-royal-indigo/90 transition-all cursor-pointer"
          >
            Submit for Review
          </button>
        </form>
      </Modal>

      {/* Competence Upload Modal */}
      <Modal
        isOpen={isCompetenceUploadOpen}
        onClose={() => setIsCompetenceUploadOpen(false)}
        title={t('uploadSkillCert')}
        maxWidth="sm"
      >
        <form onSubmit={handleUploadCompetence} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-midnight-navy mb-1.5">
              Trade Credential Type
            </label>
            <select
              value={compDocType}
              onChange={(e) => setCompDocType(e.target.value)}
              className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy font-semibold focus:outline-royal-indigo"
            >
              <option value="Trade Certificate / CAP">Trade Certificate / Vocational Diploma (CAP/BACC F4)</option>
              <option value="Master Craftsperson Apprenticeship Testimonial">Master Craftsperson Apprenticeship Testimonial</option>
              <option value="Authorised Gas Distribution License">Authorised Gas Distribution License</option>
              <option value="Portfolio of Documented Buea Jobs">Portfolio of Documented Buea Jobs</option>
            </select>
          </div>

          <div className="p-4 border-2 border-dashed border-royal-indigo/30 rounded-2xl text-center bg-indigo-50/30">
            <Upload className="w-8 h-8 text-royal-indigo mx-auto mb-2" />
            <span className="font-bold text-royal-indigo block text-xs">
              Simulate Credential Upload
            </span>
            <span className="text-[10px] text-dark-slate/60 block mt-1">
              File: vocational_trade_diploma.pdf (1.8 MB)
            </span>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-2xl bg-royal-indigo text-pure-white font-bold text-xs shadow-xs hover:bg-royal-indigo/90 transition-all cursor-pointer"
          >
            Submit Trade Credential
          </button>
        </form>
      </Modal>
    </div>
  );
};

