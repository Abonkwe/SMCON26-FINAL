import React from 'react';
import { BookingStatus, RentalStatus, VerificationStatus } from '../../types';

interface StatusPillProps {
  status: BookingStatus | RentalStatus | VerificationStatus | string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-300';

  switch (status) {
    case 'CONFIRMED':
    case 'VERIFIED':
    case 'COMPLETED':
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
      break;
    case 'IN_PROGRESS':
    case 'ACTIVE':
    case 'ACCEPTED':
      colorClasses = 'bg-blue-50 text-royal-indigo border-royal-indigo/40 font-semibold';
      break;
    case 'QUOTATION_RECEIVED':
    case 'COMPLETED_PENDING_CONFIRMATION':
    case 'RETURN_DUE':
    case 'PENDING_REVIEW':
    case 'UNDER_REVIEW':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-300 font-medium';
      break;
    case 'REQUESTED':
    case 'QUOTATION_PENDING':
    case 'PENDING_PROVIDER':
    case 'READY_FOR_HANDOVER':
      colorClasses = 'bg-purple-50 text-midnight-navy border-electric-lavender/40 font-medium';
      break;
    case 'CANCELLED':
    case 'REJECTED':
    case 'SUSPENDED':
      colorClasses = 'bg-rose-50 text-rose-800 border-rose-300 font-medium';
      break;
    case 'DISPUTED':
      colorClasses = 'bg-red-100 text-red-900 border-red-400 font-bold';
      break;
  }

  const formattedLabel = status.replace(/_/g, ' ');

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wide border ${colorClasses}`}>
      {formattedLabel}
    </span>
  );
};

