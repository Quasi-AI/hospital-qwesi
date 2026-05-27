'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Settings {
  systemTitle: string;
  systemDescription: string;
  invoiceLogoUrl: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  language: string;
  theme: 'light' | 'dark' | 'auto';
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  reminderTime: number;
  maxAppointmentsPerDay: number;
  workingHours: {
    start: string;
    end: string;
    days: string[];
  };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    phone: string;
    email: string;
  };
  socialMedia: {
    website: string;
    facebook: string;
    twitter: string;
    linkedin: string;
    instagram: string;
  };
  privacy: {
    dataRetentionDays: number;
    allowDataExport: boolean;
    allowDataDeletion: boolean;
    requireConsent: boolean;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    requireTwoFactor: boolean;
  };
  paymentProviders?: {
    paystack?: {
      enabled: boolean;
      mode: 'test' | 'live';
      publicKey: string;
      secretKey?: string;
      callbackUrl: string;
    };
  };
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  systemTitle: '',
  systemDescription: 'Qwesi Virtual Hospital',
  invoiceLogoUrl: '',
  currency: 'USD',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  language: 'en',
  theme: 'light',
  emailNotifications: true,
  smsNotifications: false,
  appointmentReminders: true,
  reminderTime: 30,
  maxAppointmentsPerDay: 50,
  workingHours: {
    start: '09:00',
    end: '17:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  },
  address: {
    street: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    phone: '',
    email: '',
  },
  socialMedia: {
    website: '',
    facebook: '',
    twitter: '',
    linkedin: '',
    instagram: '',
  },
  privacy: {
    dataRetentionDays: 2555,
    allowDataExport: true,
    allowDataDeletion: true,
    requireConsent: true,
  },
  security: {
    sessionTimeout: 480,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireTwoFactor: false,
  },
  paymentProviders: {
    paystack: {
      enabled: false,
      mode: 'live',
      publicKey: '',
      secretKey: '',
      callbackUrl: '',
    },
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        // Only set default settings if we're authenticated but got an error
        // Otherwise, keep settings as null until authenticated
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      // Only set default settings if we're authenticated but got an error
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = async (updates: Partial<Settings>) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  };

  const refreshSettings = async () => {
    setLoading(true);
    await fetchSettings();
  };

  // Fetch settings on mount and when session becomes authenticated
  useEffect(() => {
    if (status === 'authenticated') {
    fetchSettings();
    } else if (status === 'unauthenticated') {
      // Clear settings when logged out
      setSettings(null);
      setLoading(false);
    }
  }, [status, fetchSettings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
