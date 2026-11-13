import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { api, getStoredToken, setStoredToken } from '../lib/api';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  sendOtp: (phone: string) => Promise<{ status: string; phone_e164: string; message: string }>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isOffline: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeRole, setActiveRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem('alice_active_role') as UserRole;
    return saved || 'CUSTOMER';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshProfile = async () => {
    try {
      const profile = await api.users.getMe();
      setUser(profile);
    } catch (err) {
      console.warn('Failed to fetch user profile, initializing demo profile:', err);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    localStorage.setItem('alice_active_role', role);
  };

  const sendOtp = async (phone: string) => {
    return await api.auth.sendOtp(phone);
  };

  const verifyOtp = async (phone: string, token: string) => {
    const res = await api.auth.verifyOtp(phone, token);
    if (res.access_token) {
      await refreshProfile();
      setIsAuthModalOpen(false);
    }
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setActiveRole('CUSTOMER');
    localStorage.removeItem('alice_active_role');
  };

  const isAuthenticated = Boolean(getStoredToken() || user);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        activeRole,
        setActiveRole,
        sendOtp,
        verifyOtp,
        logout,
        refreshProfile,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isOffline,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

