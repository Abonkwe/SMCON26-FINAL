import React, { useState } from 'react';
import { Bell, ShieldAlert, Globe, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { Modal } from '../common/Modal';

interface HeaderProps {
  onOpenAuth: () => void;
  onOpenReport: () => void;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuth, onOpenReport, onSelectTab }) => {
  const { user, isAuthenticated } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { notifications, unreadCount, markAsRead } = useNotification();
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fr' : 'en');
  };

  return (
    <>
      <header className="bg-alice-header-gradient text-pure-white px-4 pt-4 pb-4 shadow-card sticky top-0 z-40">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Brand & Wordmark */}
          <div
            className="flex items-center space-x-2 cursor-pointer select-none"
            onClick={() => onSelectTab('home')}
          >
            <div className="w-8 h-8 rounded-xl bg-pure-white flex items-center justify-center shadow-xs">
              <span className="font-extrabold text-royal-indigo text-lg tracking-tighter">A</span>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-pure-white drop-shadow-xs">
                ALICE
              </span>
              <span className="block text-[10px] font-semibold tracking-wider text-pure-white/90 uppercase -mt-1">
                Buea Services
              </span>
            </div>
          </div>

          {/* Quick Actions Header Toolbar */}
          <div className="flex items-center space-x-1.5">
            {/* Language Toggle EN / FR */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-pure-white/20 hover:bg-pure-white/30 text-pure-white text-xs font-bold transition-all backdrop-blur-xs cursor-pointer"
              title="Toggle Language EN / FR"
              aria-label="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language.toUpperCase()}</span>
            </button>

            {/* Safety SOS Quick Trigger */}
            <button
              onClick={onOpenReport}
              className="p-1.5 rounded-full bg-rose-500/80 hover:bg-rose-500 text-pure-white transition-all shadow-xs cursor-pointer"
              title="Report Incident / Safety SOS"
              aria-label="Report Incident"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-1.5 rounded-full bg-pure-white/20 hover:bg-pure-white/30 text-pure-white transition-all cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-mint-green text-midnight-navy font-extrabold text-[10px] flex items-center justify-center border border-pure-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Profile Avatar / Sign In */}
            {isAuthenticated && user ? (
              <button
                onClick={() => onSelectTab('profile')}
                className="w-8 h-8 rounded-full bg-pure-white text-royal-indigo font-bold text-xs flex items-center justify-center shadow-xs border-2 border-pure-white/80 cursor-pointer"
                title={user.display_name}
              >
                {user.display_name.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-pure-white text-royal-indigo text-xs font-bold shadow-xs hover:bg-pure-white/95 transition-all cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications Drawer / Modal */}
      <Modal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        title="Notifications"
      >
        <div className="space-y-2.5">
          {notifications.length === 0 ? (
            <p className="text-center text-dark-slate/70 text-sm py-6">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-3 rounded-2xl border transition-colors cursor-pointer ${
                  n.is_read
                    ? 'bg-cloud-gray/40 border-cloud-gray text-dark-slate'
                    : 'bg-indigo-50/50 border-royal-indigo/30 text-midnight-navy font-medium'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-royal-indigo">{n.title}</span>
                  <span className="text-[10px] text-dark-slate/60">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-dark-slate leading-relaxed">{n.message}</p>
              </div>
            ))
          )}
        </div>
      </Modal>
    </>
  );
};

