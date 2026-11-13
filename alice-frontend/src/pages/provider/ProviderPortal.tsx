import React, { useState, useEffect } from 'react';
import { Booking, RentalListing, ServiceArea, ServiceItem } from '../../types';
import { api } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { StatusPill } from '../../components/common/StatusPill';
import { JobPinModal } from '../../components/service/JobPinModal';
import { Modal } from '../../components/common/Modal';
import { RoleSwitcher } from '../../components/layout/RoleSwitcher';
import {
  Briefcase,
  ToggleLeft,
  ToggleRight,
  FileSpreadsheet,
  CheckCircle,
  KeyRound,
  Plus,
  Zap,
  MapPin,
  Clock,
  ArrowRight,
  Send,
} from 'lucide-react';

export const ProviderPortal: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [isPaused, setIsPaused] = useState(false);
  const [incomingBookings, setIncomingBookings] = useState<Booking[]>([]);
  const [myEquipmentListings, setMyEquipmentListings] = useState<RentalListing[]>([]);
  const [bueaAreas, setBueaAreas] = useState<ServiceArea[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['Molyko', 'Bonduma', 'Mile 16 (Bolifamba)']);

  // Active quotation builder modal
  const [quotingBooking, setQuotingBooking] = useState<Booking | null>(null);
  const [labourXaf, setLabourXaf] = useState(6000);
  const [materialsXaf, setMaterialsXaf] = useState(3000);
  const [deliveryXaf, setDeliveryXaf] = useState(1000);
  const [feesXaf, setFeesXaf] = useState(500);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [isSendingQuote, setIsSendingQuote] = useState(false);

  // Job PIN verification modal
  const [verifyingBooking, setVerifyingBooking] = useState<Booking | null>(null);

  // New Equipment Listing modal
  const [isNewListingOpen, setIsNewListingOpen] = useState(false);
  const [modelName, setModelName] = useState('Bluetti EB70S (LiFePO4)');
  const [capacityWh, setCapacityWh] = useState(716);
  const [continuousW, setContinuousW] = useState(800);
  const [peakW, setPeakW] = useState(1400);
  const [dailyRate, setDailyRate] = useState(12000);
  const [deposit, setDeposit] = useState(25000);

  const loadData = async () => {
    try {
      const [bks, rts, ars] = await Promise.all([
        api.bookings.list(),
        api.rentals.getListings(),
        api.catalogue.getAreas(),
      ]);
      setIncomingBookings(bks);
      setMyEquipmentListings(rts);
      setBueaAreas(ars);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePause = () => {
    setIsPaused((prev) => {
      const next = !prev;
      showToast(next ? 'Account paused. You will not appear in new searches.' : 'Account active and accepting requests.', 'info');
      return next;
    });
  };

  const toggleCoverageArea = (name: string) => {
    setSelectedAreas((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
    showToast('Coverage areas updated', 'info');
  };

  const handleSendQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotingBooking) return;
    setIsSendingQuote(true);
    try {
      await api.bookings.submitQuotation(quotingBooking.id, {
        labour_xaf: labourXaf,
        materials_xaf: materialsXaf,
        delivery_xaf: deliveryXaf,
        fees_xaf: feesXaf,
        notes: quoteNotes,
      });
      showToast('Quotation sent to customer!', 'success');
      setQuotingBooking(null);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error sending quote';
      showToast(message, 'error');
    } finally {
      setIsSendingQuote(false);
    }
  };

  const handleVerifyJobPin = async (enteredPin: string) => {
    if (!verifyingBooking) return;
    await api.bookings.updateStatus(verifyingBooking.id, 'IN_PROGRESS', enteredPin);
    setVerifyingBooking(null);
    loadData();
  };

  const handleMarkJobCompleted = async (bookingId: string) => {
    try {
      await api.bookings.updateStatus(bookingId, 'COMPLETED_PENDING_CONFIRMATION');
      showToast('Work marked completed. Waiting for customer confirmation.', 'success');
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error updating status';
      showToast(message, 'error');
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.rentals.createListing({
        provider_id: 'prov-user-me',
        provider_name: 'My Power Business (Buea)',
        model_name: modelName,
        capacity_wh: capacityWh,
        continuous_output_w: continuousW,
        peak_output_w: peakW,
        daily_rate_xaf: dailyRate,
        deposit_xaf: deposit,
        condition: 'EXCELLENT',
        connectors: ['AC 230V UK/EU', 'USB-C 100W PD', '12V DC'],
        image_url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80',
        is_available: true,
        owner_attestation: true,
        location_area: 'Molyko, Buea',
      });
      showToast('Power Station listed successfully!', 'success');
      setIsNewListingOpen(false);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error listing equipment';
      showToast(message, 'error');
    }
  };

  return (
    <div className="space-y-4 pb-12">
      <RoleSwitcher />

      {/* Provider Desk Header & Pause Toggle (FR-CAT-005) */}
      <div className="bg-pure-white rounded-3xl p-5 border border-cloud-gray shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-royal-indigo tracking-wider block">
              Provider Desk
            </span>
            <h2 className="font-extrabold text-midnight-navy text-lg">
              Fru Plumbing & Engineering
            </h2>
          </div>
          <button
            onClick={handleTogglePause}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              !isPaused
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-rose-50 text-rose-800 border border-rose-300'
            }`}
          >
            {!isPaused ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-600" />
                <span>{t('providerStatusActive')}</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-rose-600" />
                <span>{t('providerStatusPaused')}</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-dark-slate/80 leading-relaxed">
          Manage your incoming requests from Buea residents, generate itemized quotations, verify customer Job PINs, and post portable power station rentals.
        </p>
      </div>

      {/* Coverage Areas Selection (FR-CAT-003) */}
      <div className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card space-y-2.5">
        <h4 className="font-bold text-midnight-navy text-xs flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-royal-indigo" />
          <span>Buea Service Areas Covered ({selectedAreas.length})</span>
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {bueaAreas.map((a) => {
            const isSelected = selectedAreas.includes(a.name);
            return (
              <button
                key={a.id}
                onClick={() => toggleCoverageArea(a.name)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-royal-indigo text-pure-white border-royal-indigo shadow-xs'
                    : 'bg-cloud-gray/40 text-dark-slate border-cloud-gray hover:bg-cloud-gray/80'
                }`}
              >
                {a.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Incoming Requests & Active Work Queue */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-midnight-navy text-base tracking-tight px-1 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-royal-indigo" />
          <span>{t('incomingRequests')} ({incomingBookings.length})</span>
        </h3>

        {incomingBookings.map((b) => (
          <div
            key={b.id}
            className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card space-y-3"
          >
            <div className="flex items-center justify-between border-b border-cloud-gray pb-2">
              <div>
                <span className="font-mono text-[11px] font-bold text-royal-indigo">
                  {b.reference}
                </span>
                <span className="text-[10px] text-dark-slate/60 block">
                  Customer Request in {b.neighbourhood}
                </span>
              </div>
              <StatusPill status={b.status} />
            </div>

            <div>
              <h4 className="font-bold text-midnight-navy text-sm">
                {b.service_name}
              </h4>
              <p className="text-xs text-dark-slate italic mt-1 bg-cloud-gray/30 p-2.5 rounded-xl border border-cloud-gray/50">
                "{b.description}"
              </p>
            </div>

            {/* Provider Action Buttons Based on Lifecycle */}
            <div className="pt-1 flex items-center gap-2">
              {/* If REQUESTED or QUOTATION_PENDING: Build Quote */}
              {['REQUESTED', 'QUOTATION_PENDING'].includes(b.status) && (
                <button
                  onClick={() => setQuotingBooking(b)}
                  className="flex-1 py-2 px-3 rounded-xl bg-royal-indigo hover:bg-royal-indigo/90 text-pure-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Build Itemized Quotation</span>
                </button>
              )}

              {/* If CONFIRMED: Enter Customer PIN to start work */}
              {b.status === 'CONFIRMED' && (
                <button
                  onClick={() => setVerifyingBooking(b)}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-pure-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Enter Customer PIN to Start</span>
                </button>
              )}

              {/* If IN_PROGRESS: Mark Completed */}
              {b.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => handleMarkJobCompleted(b.id)}
                  className="flex-1 py-2 px-3 rounded-xl bg-royal-indigo hover:bg-royal-indigo/90 text-pure-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark Work Completed</span>
                </button>
              )}

              {b.status === 'COMPLETED_PENDING_CONFIRMATION' && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  Waiting for customer to confirm completion
                </span>
              )}

              {b.status === 'COMPLETED' && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Job Completed & Settled</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Equipment Rental Manager (Power Stations) */}
      <div className="space-y-3 pt-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-extrabold text-midnight-navy text-base tracking-tight flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>{t('myEquipmentListings')}</span>
          </h3>
          <button
            onClick={() => setIsNewListingOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-royal-indigo text-pure-white text-xs font-bold hover:bg-royal-indigo/90 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>List Unit</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {myEquipmentListings.map((eq) => (
            <div
              key={eq.id}
              className="bg-pure-white rounded-2xl p-3.5 border border-cloud-gray shadow-card flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-midnight-navy block text-sm">
                  {eq.model_name}
                </span>
                <span className="text-[11px] text-dark-slate/80">
                  {eq.capacity_wh} Wh • {eq.continuous_output_w} W Continuous
                </span>
                <span className="text-[11px] font-bold text-royal-indigo block mt-0.5">
                  {eq.daily_rate_xaf.toLocaleString()} XAF/day • Caution: {eq.deposit_xaf.toLocaleString()} XAF
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-300">
                Active
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quotation Builder Modal */}
      {quotingBooking && (
        <Modal
          isOpen={Boolean(quotingBooking)}
          onClose={() => setQuotingBooking(null)}
          title="Create Itemized Quotation"
          maxWidth="md"
        >
          <form onSubmit={handleSendQuotation} className="space-y-4 text-xs">
            <div className="bg-indigo-50/50 p-3 rounded-2xl border border-royal-indigo/20">
              <span className="text-[10px] font-bold uppercase text-royal-indigo block">
                Booking Request
              </span>
              <span className="font-extrabold text-midnight-navy text-sm block">
                {quotingBooking.service_name}
              </span>
              <span className="text-[11px] text-dark-slate/80">
                {quotingBooking.neighbourhood}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-midnight-navy mb-1">
                  Labour (XAF) *
                </label>
                <input
                  type="number"
                  value={labourXaf}
                  onChange={(e) => setLabourXaf(Number(e.target.value))}
                  required
                  className="w-full p-2.5 rounded-xl bg-cloud-gray/40 border border-cloud-gray font-bold text-midnight-navy focus:outline-royal-indigo"
                />
              </div>

              <div>
                <label className="block font-bold text-midnight-navy mb-1">
                  Materials / Parts (XAF)
                </label>
                <input
                  type="number"
                  value={materialsXaf}
                  onChange={(e) => setMaterialsXaf(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-cloud-gray/40 border border-cloud-gray font-bold text-midnight-navy focus:outline-royal-indigo"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-midnight-navy mb-1">
                  Delivery / Travel (XAF)
                </label>
                <input
                  type="number"
                  value={deliveryXaf}
                  onChange={(e) => setDeliveryXaf(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-cloud-gray/40 border border-cloud-gray font-bold text-midnight-navy focus:outline-royal-indigo"
                />
              </div>

              <div>
                <label className="block font-bold text-midnight-navy mb-1">
                  Platform / Diagnostic Fee (XAF)
                </label>
                <input
                  type="number"
                  value={feesXaf}
                  onChange={(e) => setFeesXaf(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-cloud-gray/40 border border-cloud-gray font-bold text-midnight-navy focus:outline-royal-indigo"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-midnight-navy mb-1">
                Quotation Notes / Scope of Work
              </label>
              <textarea
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Price includes replacement brass ball valve and 1-month work warranty."
                className="w-full p-2 rounded-xl bg-cloud-gray/40 border border-cloud-gray text-xs text-midnight-navy focus:outline-royal-indigo"
              />
            </div>

            <div className="p-3 bg-cloud-gray/50 rounded-2xl flex items-center justify-between">
              <span className="font-bold text-midnight-navy">Computed Total (XAF):</span>
              <span className="font-extrabold text-royal-indigo text-base">
                {(labourXaf + materialsXaf + deliveryXaf + feesXaf).toLocaleString()} XAF
              </span>
            </div>

            <button
              type="submit"
              disabled={isSendingQuote}
              className="w-full py-2.5 rounded-2xl bg-royal-indigo hover:bg-royal-indigo/90 text-pure-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSendingQuote ? 'Submitting...' : 'Send Quotation (24h Validity)'}</span>
            </button>
          </form>
        </Modal>
      )}

      {/* PIN Verification Modal */}
      {verifyingBooking && (
        <JobPinModal
          isOpen={Boolean(verifyingBooking)}
          onClose={() => setVerifyingBooking(null)}
          pin={verifyingBooking.checkin_pin || '4829'}
          isProviderMode={true}
          onVerifyPin={handleVerifyJobPin}
        />
      )}

      {/* New Equipment Listing Modal */}
      <Modal
        isOpen={isNewListingOpen}
        onClose={() => setIsNewListingOpen(false)}
        title={t('addNewListing')}
        maxWidth="md"
      >
        <form onSubmit={handleCreateListing} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-midnight-navy mb-1">
              Station Brand & Model Name *
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              required
              className="w-full p-2.5 rounded-xl bg-cloud-gray/40 border border-cloud-gray font-bold text-midnight-navy focus:outline-royal-indigo"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-midnight-navy mb-1">
                Capacity in Wh (Watt-Hours) *
              </label>
              <input
                type="number"
                value={capacityWh}
                onChange={(e) => setCapacityWh(Number(e.target.value))}
                required
                className="w-full p-2.5 rounded-xl bg-cloud-gray/40 border border-cloud-gray font-bold text-midnight-navy focus:outline-royal-indigo"
              />
            </div>

            <div>
              <label className="block font-bold text-midnight-navy mb-1">
                Continuous Output in W *
              </label>
              <input
                type="number"
                value={continuousW}
                onChange={(e) => setContinuousW(Number(e.target.value))}
                required
                className="w-full p-2.5 rounded-xl bg-cloud-gray/40 border border-cloud-gray font-bold text-midnight-navy focus:outline-royal-indigo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-midnight-navy mb-1">
                Daily Rate (XAF) *
              </label>
              <input
                type="number"
                value={dailyRate}
                onChange={(e) => setDailyRate(Number(e.target.value))}
                required
                className="w-full p-2.5 rounded-xl bg-cloud-gray/40 border border-cloud-gray font-bold text-midnight-navy focus:outline-royal-indigo"
              />
            </div>

            <div>
              <label className="block font-bold text-midnight-navy mb-1">
                Caution Deposit (XAF) *
              </label>
              <input
                type="number"
                value={deposit}
                onChange={(e) => setDeposit(Number(e.target.value))}
                required
                className="w-full p-2.5 rounded-xl bg-cloud-gray/40 border border-cloud-gray font-bold text-midnight-navy focus:outline-royal-indigo"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-2xl bg-royal-indigo text-pure-white font-bold text-xs shadow-xs hover:bg-royal-indigo/90 transition-all cursor-pointer"
          >
            Publish Power Listing
          </button>
        </form>
      </Modal>
    </div>
  );
};

