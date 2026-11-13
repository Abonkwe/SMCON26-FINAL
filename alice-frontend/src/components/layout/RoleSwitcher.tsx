import React from 'react';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { User, Briefcase, Shield } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { activeRole, setActiveRole } = useAuth();
  const { t } = useLanguage();

  const roles: { role: UserRole; label: string; icon: React.ReactNode }[] = [
    { role: 'CUSTOMER', label: t('roleCustomer'), icon: <User className="w-3.5 h-3.5" /> },
    { role: 'PROVIDER', label: t('roleProvider'), icon: <Briefcase className="w-3.5 h-3.5" /> },
    { role: 'ADMIN', label: t('roleAdmin'), icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-pure-white p-1 rounded-2xl border border-cloud-gray shadow-xs flex items-center justify-between gap-1 mb-4">
      {roles.map(({ role, label, icon }) => {
        const isActive = activeRole === role;
        return (
          <button
            key={role}
            onClick={() => setActiveRole(role)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate ${
              isActive
                ? 'bg-royal-indigo text-pure-white shadow-xs'
                : 'text-dark-slate/70 hover:text-midnight-navy hover:bg-cloud-gray/50'
            }`}
          >
            {icon}
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

