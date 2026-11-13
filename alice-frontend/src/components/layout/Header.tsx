import React, { useState } from 'react';
import { Bell, ShieldAlert, Globe, User as UserIcon, Home, Compass, CalendarCheck2, Zap } from 'lucide-react';
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
      <header className="alice-header">
        <div className="alice-header-inner">
          {/* Brand & Wordmark */}
          <div
            className="flex items-center space-x-2 cursor-pointer select-none"
            onClick={() => onSelectTab('home')}
          >
            <div className="alice-brand-mark">
              <span>A</span>
            </div>
            <div>
              <span className="alice-brand-name">
                ALICE
              </span>
              <span className="alice-brand-subtitle">
                Buea Services
              </span>
            </div>
          </div>

          <nav className="alice-desktop-nav" aria-label="Main navigation">
            <button onClick={() => onSelectTab('home')}><Home /> Home</button>
            <button onClick={() => onSelectTab('explore')}><Compass /> Explore</button>
            <button onClick={() => onSelectTab('bookings')}><CalendarCheck2 /> My bookings</button>
            <button onClick={() => onSelectTab('rentals')}><Zap /> Power rentals</button>
          </nav>

          {/* Quick Actions Header Toolbar */}
          <div className="alice-header-actions">
            {/* Language Toggle EN / FR */}
            <button
              onClick={toggleLanguage}
              className="alice-header-icon-button alice-language-button"
              title="Toggle Language EN / FR"
              aria-label="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language.toUpperCase()}</span>
            </button>

            {/* Safety SOS Quick Trigger */}
            <button
              onClick={onOpenReport}
              className="alice-header-icon-button alice-sos-button"
              title="Report Incident / Safety SOS"
              aria-label="Report Incident"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative alice-header-icon-button"
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
                className="alice-header-avatar"
                title={user.display_name}
              >
                {user.display_name.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="alice-signin-button"
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

