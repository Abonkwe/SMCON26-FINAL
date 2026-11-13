import React, { useState, useEffect } from 'react';
import { RentalBooking, RentalListing } from '../../types';
import { api } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { RentalCard } from '../../components/rental/RentalCard';
import { PowerEstimator } from '../../components/rental/PowerEstimator';
import { RentalBookingModal } from '../../components/rental/RentalBookingModal';
import { InspectionModal } from '../../components/rental/InspectionModal';
import { StatusPill } from '../../components/common/StatusPill';
import { Zap, Gauge, BatteryCharging, ShieldCheck, ClipboardList, CheckCircle } from 'lucide-react';

export const Rentals: React.FC = () => {
  const { t } = useLanguage();

  const [listings, setListings] = useState<RentalListing[]>([]);
  const [myRentals, setMyRentals] = useState<RentalBooking[]>([]);
  const [selectedListing, setSelectedListing] = useState<RentalListing | null>(null);
  const [estimatingListing, setEstimatingListing] = useState<RentalListing | null>(null);
  const [inspectingBooking, setInspectingBooking] = useState<{
    booking: RentalBooking;
    type: 'HANDOVER' | 'RETURN';
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'CATALOGUE' | 'ESTIMATOR' | 'MY_RENTALS'>('CATALOGUE');

  const loadData = async () => {
    try {
      const [listRes, bookRes] = await Promise.all([
        api.rentals.getListings(),
        api.rentals.listMyBookings(),
      ]);
      setListings(listRes);
      setMyRentals(bookRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-4 pb-12">
      {/* Title & Buea Outages Context */}
      <div>
        <h2 className="font-extrabold text-midnight-navy text-xl tracking-tight">
          {t('rentalTitle')}
        </h2>
        <p className="text-xs text-dark-slate/80 mt-0.5 leading-relaxed">
          {t('rentalSubtitle')}
        </p>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center bg-pure-white p-1 rounded-2xl border border-cloud-gray shadow-xs gap-1 text-xs">
        <button
          onClick={() => setActiveTab('CATALOGUE')}
          className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'CATALOGUE'
              ? 'bg-royal-indigo text-pure-white shadow-xs'
              : 'text-dark-slate/70 hover:text-midnight-navy hover:bg-cloud-gray/50'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Stations Catalogue</span>
        </button>

        <button
          onClick={() => setActiveTab('ESTIMATOR')}
          className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'ESTIMATOR'
              ? 'bg-royal-indigo text-pure-white shadow-xs'
              : 'text-dark-slate/70 hover:text-midnight-navy hover:bg-cloud-gray/50'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>Wattage Estimator</span>
        </button>

        <button
          onClick={() => setActiveTab('MY_RENTALS')}
          className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'MY_RENTALS'
              ? 'bg-royal-indigo text-pure-white shadow-xs'
              : 'text-dark-slate/70 hover:text-midnight-navy hover:bg-cloud-gray/50'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>My Rentals ({myRentals.length})</span>
        </button>
      </div>

      {/* Tab 1: Catalogue of Power Stations */}
      {activeTab === 'CATALOGUE' && (
        <div className="space-y-4">
          {/* Technical Guidance Banner: Wh vs W (FR-RENT-003) */}
          <div className="bg-indigo-50/60 p-3.5 rounded-3xl border border-royal-indigo/20 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-royal-indigo text-pure-white flex items-center justify-center shrink-0 mt-0.5">
              <BatteryCharging className="w-4 h-4" />
            </div>
            <div className="text-xs text-dark-slate leading-relaxed">
              <strong className="text-midnight-navy block text-xs">
                Important Technical Rule (FR-RENT-003):
              </strong>
              <strong>Battery Capacity (Wh)</strong> determines how long your devices can run, while{' '}
              <strong>Continuous Output (W)</strong> determines which heavy appliances can be plugged in simultaneously without tripping the inverter.
            </div>
          </div>

          <div className="space-y-4">
            {listings.map((l) => (
              <RentalCard
                key={l.id}
                listing={l}
                onSelect={(item) => setSelectedListing(item)}
                onEstimate={(item) => {
                  setEstimatingListing(item);
                  setActiveTab('ESTIMATOR');
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Appliance Runtime & Compatibility Estimator */}
      {activeTab === 'ESTIMATOR' && (
        <div>
          <PowerEstimator
            unitCapacityWh={estimatingListing?.capacity_wh || 2048}
            unitContinuousW={estimatingListing?.continuous_output_w || 2400}
          />
        </div>
      )}

      {/* Tab 3: My Rentals & Handover Inspections */}
      {activeTab === 'MY_RENTALS' && (
        <div className="space-y-4">
          {myRentals.length === 0 ? (
            <div className="bg-pure-white rounded-3xl p-8 border border-cloud-gray text-center space-y-3 shadow-card">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-royal-indigo flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-midnight-navy text-sm">No rental bookings yet</h4>
              <p className="text-xs text-dark-slate/70 max-w-xs mx-auto">
                Reserve a 2kWh EcoFlow or Bluetti unit for clean backup power in Buea.
              </p>
              <button
                onClick={() => setActiveTab('CATALOGUE')}
                className="px-4 py-2 rounded-2xl bg-royal-indigo text-pure-white text-xs font-bold hover:bg-royal-indigo/90 transition-all cursor-pointer"
              >
                Browse Stations
              </button>
            </div>
          ) : (
            myRentals.map((r) => (
              <div
                key={r.id}
                className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card space-y-3"
              >
                <div className="flex items-center justify-between border-b border-cloud-gray/60 pb-2.5">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-royal-indigo block">
                      {r.reference}
                    </span>
                    <span className="text-[10px] text-dark-slate/60">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <StatusPill status={r.status} />
                </div>

                <div>
                  <h4 className="font-extrabold text-midnight-navy text-base leading-snug">
                    {r.model_name}
                  </h4>
                  <p className="text-xs text-dark-slate/80 mt-1">
                    Owner: <strong>{r.provider_name}</strong>
                  </p>
                  <p className="text-xs text-dark-slate/80 mt-0.5">
                    Rental Dates:{' '}
                    <strong>
                      {new Date(r.start_at).toLocaleDateString()} — {new Date(r.end_at).toLocaleDateString()}
                    </strong>{' '}
                    ({r.days} {r.days === 1 ? 'day' : 'days'})
                  </p>
                </div>

                <div className="bg-cloud-gray/40 p-2.5 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="block text-[10px] text-dark-slate/60 font-semibold">
                      Caution Deposit
                    </span>
                    <span className="font-bold text-dark-slate">
                      {r.deposit_xaf.toLocaleString()} XAF
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-dark-slate/60 font-semibold">
                      Total Rental
                    </span>
                    <span className="font-extrabold text-royal-indigo">
                      {r.total_xaf.toLocaleString()} XAF
                    </span>
                  </div>
                </div>

                {/* Inspection Status & Actions (FR-RENT-007) */}
                <div className="pt-2 border-t border-cloud-gray space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-midnight-navy flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-royal-indigo" />
                      <span>Handover & Return Inspections</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setInspectingBooking({ booking: r, type: 'HANDOVER' })}
                      className="py-2 px-2 rounded-xl border border-royal-indigo/30 text-royal-indigo hover:bg-indigo-50/50 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ClipboardList className="w-3 h-3" />
                      <span>{r.handover_inspection ? 'View Handover' : 'Log Handover'}</span>
                    </button>

                    <button
                      onClick={() => setInspectingBooking({ booking: r, type: 'RETURN' })}
                      className="py-2 px-2 rounded-xl border border-cloud-gray text-dark-slate hover:bg-cloud-gray/60 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>{r.return_inspection ? 'View Return' : 'Log Return'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rental Booking Modal */}
      {selectedListing && (
        <RentalBookingModal
          isOpen={Boolean(selectedListing)}
          onClose={() => setSelectedListing(null)}
          listing={selectedListing}
          onSuccess={loadData}
        />
      )}

      {/* Handover / Return Inspection Modal */}
      {inspectingBooking && (
        <InspectionModal
          isOpen={Boolean(inspectingBooking)}
          onClose={() => setInspectingBooking(null)}
          booking={inspectingBooking.booking}
          inspectionType={inspectingBooking.type}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

