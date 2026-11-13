import React, { createContext, useContext, useEffect, useState } from 'react';
import { InAppNotification } from '../types';
import { api } from '../lib/api';

interface NotificationContextType {
  notifications: InAppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    api.notifications.list().then(setNotifications).catch(console.error);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await api.notifications.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        showToast,
        toast,
      }}
    >
      {children}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-elevated border flex items-center space-x-3 text-sm font-semibold max-w-sm w-full mx-4 animate-in fade-in slide-in-from-top-4 duration-200 bg-midnight-navy text-pure-white border-royal-indigo/30">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              toast.type === 'success'
                ? 'bg-mint-green'
                : toast.type === 'error'
                ? 'bg-red-400'
                : 'bg-electric-lavender'
            }`}
          />
          <span className="flex-1">{toast.message}</span>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

