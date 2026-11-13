import React from 'react';
import { WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const OfflineBanner: React.FC = () => {
  const { isOffline } = useAuth();
  const { t } = useLanguage();

  if (!isOffline) return null;

  return (
    <div className="bg-dark-slate text-pure-white px-4 py-2 text-xs font-medium flex items-center justify-center space-x-2 border-b border-royal-indigo/30 animate-pulse">
      <WifiOff className="w-4 h-4 text-periwinkle-blue shrink-0" />
      <span>{t('offlineState')}</span>
    </div>
  );
};

