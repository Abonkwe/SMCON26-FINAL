import React from 'react';
import { ShieldCheck, Award, CheckCircle2 } from 'lucide-react';

interface VerificationBadgeProps {
  badge: string;
  size?: 'sm' | 'md';
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ badge, size = 'md' }) => {
  const isSm = size === 'sm';
  const paddingClass = isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  const iconSize = isSm ? 'w-3 h-3' : 'w-3.5 h-3.5';

  if (badge === 'Identity Checked') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 ${paddingClass}`}
      >
        <ShieldCheck className={`${iconSize} text-emerald-600`} />
        <span>Identity Checked</span>
      </span>
    );
  }

  if (badge === 'Skill Assessed') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-semibold bg-indigo-50 text-indigo-900 border border-indigo-300 ${paddingClass}`}
      >
        <Award className={`${iconSize} text-royal-indigo`} />
        <span>Skill Assessed</span>
      </span>
    );
  }

  if (badge === 'Completed Jobs') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-semibold bg-purple-50 text-purple-900 border border-purple-200 ${paddingClass}`}
      >
        <CheckCircle2 className={`${iconSize} text-electric-lavender`} />
        <span>Completed Jobs</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold bg-slate-100 text-dark-slate border border-slate-200 ${paddingClass}`}
    >
      <span>{badge}</span>
    </span>
  );
};

