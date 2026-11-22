'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from './contexts/LanguageContext';
import { SettingsProvider } from './contexts/SettingsContext';
import RealtimeListener from './components/realtime-listener';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <SettingsProvider>
          <RealtimeListener />
          {children}
          <Toaster
            position="top-center"
            gutter={10}
            containerStyle={{ top: 16, left: 12, right: 12 }}
            toastOptions={{
              duration: 4500,
              style: {
                background: '#ffffff',
                color: '#1f1147',
                border: '1px solid #e9e3ff',
                borderRadius: '14px',
                boxShadow: '0 12px 32px -8px rgba(73,48,170,0.28)',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 500,
                maxWidth: '440px',
                lineHeight: 1.4,
              },
              success: { duration: 3500, iconTheme: { primary: '#16a34a', secondary: '#fff' }, style: { borderLeft: '4px solid #16a34a' } },
              error: { duration: 6000, iconTheme: { primary: '#dc2626', secondary: '#fff' }, style: { borderLeft: '4px solid #dc2626' }, ariaProps: { role: 'alert', 'aria-live': 'assertive' } },
            }}
          />
        </SettingsProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
