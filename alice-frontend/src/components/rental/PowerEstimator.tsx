import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { PowerCompatibilityResult } from '../../types';
import { api } from '../../lib/api';
import { Zap, AlertTriangle, CheckCircle, Plus, Trash2, Gauge, BatteryCharging } from 'lucide-react';

interface ApplianceItem {
  id: string;
  name: string;
  watts: number;
  hours: number;
}

const COMMON_APPLIANCES: { name: string; watts: number; hours: number }[] = [
  { name: 'Laptop & External Monitor', watts: 85, hours: 8 },
  { name: 'WiFi Router & Fibre Modem', watts: 15, hours: 12 },
  { name: 'Standing Fan (Speed 2)', watts: 50, hours: 6 },
  { name: 'LED Room Lighting (x4)', watts: 36, hours: 5 },
  { name: 'Inverter Refrigerator (Cycling)', watts: 120, hours: 10 },
  { name: 'Smart TV (43-inch)', watts: 75, hours: 4 },
  { name: 'Blender / Kitchen Processor', watts: 600, hours: 0.2 },
  { name: 'Desktop Workstation / PC', watts: 250, hours: 6 },
];

interface PowerEstimatorProps {
  unitCapacityWh?: number;
  unitContinuousW?: number;
}

export const PowerEstimator: React.FC<PowerEstimatorProps> = ({
  unitCapacityWh = 2048,
  unitContinuousW = 2400,
}) => {
  const { t } = useLanguage();

  const [appliances, setAppliances] = useState<ApplianceItem[]>([
    { id: '1', name: 'Laptop & External Monitor', watts: 85, hours: 8 },
    { id: '2', name: 'WiFi Router & Fibre Modem', watts: 15, hours: 12 },
    { id: '3', name: 'Standing Fan', watts: 50, hours: 6 },
    { id: '4', name: 'LED Room Lighting', watts: 36, hours: 5 },
  ]);

  const [result, setResult] = useState<PowerCompatibilityResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const addAppliance = (template?: { name: string; watts: number; hours: number }) => {
    const item = template || { name: 'Custom Device', watts: 60, hours: 4 };
    setAppliances((prev) => [
      ...prev,
      { id: `app-${Date.now()}-${Math.random()}`, ...item },
    ]);
  };

  const removeAppliance = (id: string) => {
    setAppliances((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAppliance = (id: string, field: 'watts' | 'hours', val: number) => {
    setAppliances((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: Math.max(0, val) } : a))
    );
  };

  const runCalculation = async () => {
    setIsCalculating(true);
    try {
      const res = await api.rentals.estimateCompatibility({
        appliances: appliances.map((a) => ({
          name: a.name,
          watts: a.watts,
          hours_per_day: a.hours,
        })),
        listing_capacity_wh: unitCapacityWh,
        listing_continuous_w: unitContinuousW,
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="bg-pure-white rounded-3xl p-5 border border-cloud-gray shadow-card">
      {/* Title & Explanation */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 fill-amber-500" />
        </div>
        <div>
          <h3 className="font-bold text-midnight-navy text-sm">
            {t('powerEstimatorTitle')}
          </h3>
          <p className="text-xs text-dark-slate/70 leading-relaxed">
            {t('powerEstimatorSubtitle')} (Evaluation for {unitCapacityWh} Wh / {unitContinuousW} W)
          </p>
        </div>
      </div>

      {/* Appliance Load List */}
      <div className="space-y-2 mb-4">
        {appliances.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between p-2.5 rounded-2xl bg-cloud-gray/40 border border-cloud-gray text-xs gap-2"
          >
            <div className="flex-1 min-w-0">
              <span className="font-bold text-midnight-navy block truncate">{a.name}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center bg-pure-white px-2 py-1 rounded-xl border border-cloud-gray">
                <input
                  type="number"
                  value={a.watts}
                  onChange={(e) => updateAppliance(a.id, 'watts', Number(e.target.value))}
                  className="w-12 text-center font-bold text-midnight-navy focus:outline-none"
                />
                <span className="text-[10px] text-dark-slate/60 font-medium">W</span>
              </div>
              <div className="flex items-center bg-pure-white px-2 py-1 rounded-xl border border-cloud-gray">
                <input
                  type="number"
                  step="0.5"
                  value={a.hours}
                  onChange={(e) => updateAppliance(a.id, 'hours', Number(e.target.value))}
                  className="w-10 text-center font-bold text-midnight-navy focus:outline-none"
                />
                <span className="text-[10px] text-dark-slate/60 font-medium">h</span>
              </div>
              <button
                onClick={() => removeAppliance(a.id)}
                className="text-dark-slate/40 hover:text-rose-500 p-1 cursor-pointer"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Add Presets */}
      <div className="mb-4">
        <span className="block text-[11px] font-bold text-dark-slate/60 uppercase mb-1.5">
          Quick Preset Appliances:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_APPLIANCES.slice(0, 5).map((preset) => (
            <button
              key={preset.name}
              onClick={() => addAppliance(preset)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-cloud-gray/60 hover:bg-indigo-50 hover:text-royal-indigo border border-cloud-gray transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>{preset.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action: Compute */}
      <button
        onClick={runCalculation}
        disabled={isCalculating || appliances.length === 0}
        className="w-full py-2.5 rounded-2xl bg-royal-indigo hover:bg-royal-indigo/90 active:scale-98 text-pure-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        <Gauge className="w-4 h-4" />
        <span>{isCalculating ? 'Computing Energy...' : 'Verify Load & Estimate Runtime'}</span>
      </button>

      {/* Result Card */}
      {result && (
        <div
          className={`mt-4 p-4 rounded-2xl border transition-all ${
            result.is_compatible
              ? 'bg-emerald-50/60 border-emerald-300'
              : 'bg-amber-50/70 border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-xs flex items-center gap-1 text-midnight-navy">
              {result.is_compatible ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Compatible & Safe to Operate</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Inverter / Capacity Limit Exceeded</span>
                </>
              )}
            </span>
            <span className="font-extrabold text-xs text-royal-indigo bg-pure-white px-2 py-0.5 rounded-lg border border-royal-indigo/20">
              ~{result.estimated_runtime_hours} hrs runtime
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-pure-white/80 p-2 rounded-xl border border-cloud-gray">
              <span className="block text-[10px] text-dark-slate/60 font-medium">Energy Required</span>
              <span className="font-bold text-midnight-navy">{result.total_wh_needed} Wh</span>
              <span className="text-[10px] text-dark-slate/60 block">Usable: {result.usable_wh_capacity} Wh</span>
            </div>
            <div className="bg-pure-white/80 p-2 rounded-xl border border-cloud-gray">
              <span className="block text-[10px] text-dark-slate/60 font-medium">Continuous Power</span>
              <span className="font-bold text-midnight-navy">{result.peak_continuous_w_needed} W</span>
              <span className="text-[10px] text-dark-slate/60 block">Inverter limit: {result.continuous_w_capacity} W</span>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="space-y-1">
              {result.warnings.map((w, idx) => (
                <p key={idx} className="text-[11px] font-semibold text-rose-700 leading-snug">
                  • {w}
                </p>
              ))}
            </div>
          )}

          <p className="text-[10px] text-dark-slate/60 mt-2 italic flex items-center gap-1">
            <BatteryCharging className="w-3 h-3 text-royal-indigo" />
            <span>{t('usableCapacityNote')}</span>
          </p>
        </div>
      )}
    </div>
  );
};

