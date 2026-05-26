'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from '../hooks/useTranslations';
import { useSettings } from '../contexts/SettingsContext';
import { useLanguage } from '../contexts/LanguageContext';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  RotateCcw, 
  Settings as SettingsIcon,
  Bell,
  Clock,
  MapPin,
  Shield,
  Palette,
  ImageIcon
} from 'lucide-react';
import { getCurrencySelectOptions } from '@/lib/currencies';

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
];

const dateFormats = [
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'MM-DD-YYYY',
];

const daysOfWeek = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export default function SettingsPage() {
  const { t, translationsLoaded } = useTranslations();
  const { settings, loading, updateSettings } = useSettings();
  const { currentLanguage, setLanguage, availableLanguages } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [activeTab, setActiveTab] = useState('general');

  const currencyOptions = useMemo(
    () => getCurrencySelectOptions(formData.currency),
    [formData.currency]
  );

  // Check if user is admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (settings) {
      setFormData({
        ...settings,
        language: currentLanguage // Sync with language context
      });
    }
  }, [settings, currentLanguage]);

  // Apply theme changes immediately
  useEffect(() => {
    if (formData.theme) {
      const root = document.documentElement;
      const body = document.body;
      
      // Save theme to localStorage
      localStorage.setItem('theme', formData.theme);
      
      // Remove existing theme classes
      root.classList.remove('light', 'dark');
      body.classList.remove('light', 'dark');
      
      const applyTheme = (isDark: boolean) => {
        if (isDark) {
          root.classList.add('dark');
          body.classList.add('dark');
          root.style.colorScheme = 'dark';
        } else {
          root.classList.add('light');
          body.classList.add('light');
          root.style.colorScheme = 'light';
        }
      };
      
      if (formData.theme === 'dark') {
        applyTheme(true);
      } else if (formData.theme === 'light') {
        applyTheme(false);
      } else if (formData.theme === 'auto') {
        // Auto mode - use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark);
        
        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
          applyTheme(e.matches);
        };
        
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
    }
  }, [formData.theme]);
  
  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      setFormData((prev: any) => ({
        ...prev,
        theme: savedTheme
      }));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev: any) => ({
        ...prev,
        [name]: checked
      }));
    } else if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev: any) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      // Handle language change immediately
      if (name === 'language') {
        setLanguage(value); // Update language context immediately
      }
      
      setFormData((prev: any) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleWorkingDayChange = (day: string, checked: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        days: checked 
          ? [...prev.workingHours.days, day]
          : prev.workingHours.days.filter((d: string) => d !== day)
      }
    }));
  };

  const MAX_INVOICE_LOGO_BYTES = 800 * 1024;
  const INVOICE_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

  const handleInvoiceLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!INVOICE_LOGO_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: t('settings.invoiceLogoInvalidType') });
      return;
    }
    if (file.size > MAX_INVOICE_LOGO_BYTES) {
      setMessage({ type: 'error', text: t('settings.invoiceLogoTooLarge') });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev: any) => ({
        ...prev,
        invoiceLogoUrl: typeof reader.result === 'string' ? reader.result : '',
      }));
      setMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveInvoiceLogo = () => {
    setFormData((prev: any) => ({ ...prev, invoiceLogoUrl: '' }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await updateSettings(formData);
      setMessage({ type: 'success', text: t('settings.saved') });
    } catch (error) {
      setMessage({ type: 'error', text: t('settings.error') });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm(t('settings.confirmReset'))) {
      setFormData(settings);
    }
  };

  // Check if user is admin - show access denied if not
  if (status === 'authenticated' && session?.user?.role !== 'admin') {
    return (
      <ProtectedRoute>
        <SidebarLayout 
          title="Access Denied" 
          description="You don't have permission to access this page" dense>
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-sm text-gray-600 mb-6">
              Only administrators can access system settings.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  // Show loading state if translations aren't loaded yet
  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('settings.title')} description={t('settings.description')} dense>
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
            <p className="text-xs text-gray-600">{t('common.loading')}</p>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('settings.title')} description={t('settings.description')} dense>
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('settings.title')} 
        description={t('settings.description')} dense>
        <div className="mx-auto max-w-6xl space-y-4">
          {/* Back Button */}
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs text-gray-600 transition-colors hover:text-gray-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t('settings.backToDashboard')}</span>
            </Link>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                message.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Tabs Layout */}
          <div className="flex overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            {/* Left Sidebar Tabs */}
            <div className="w-72 shrink-0 border-r border-gray-100 bg-gray-50/80">
              <div className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-gray-900">Settings</h2>
                <nav className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                      activeTab === 'general'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <SettingsIcon className="h-4 w-4 shrink-0" />
                    <span>{t('settings.general.title')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('appearance')}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                      activeTab === 'appearance'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Palette className="h-4 w-4 shrink-0" />
                    <span>{t('settings.appearance')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('notifications')}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                      activeTab === 'notifications'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Bell className="h-4 w-4 shrink-0" />
                    <span>{t('settings.notifications')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('working-hours')}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                      activeTab === 'working-hours'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>{t('settings.workingHours')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('contact')}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                      activeTab === 'contact'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{t('settings.contact')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('invoice-logo')}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                      activeTab === 'invoice-logo'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <ImageIcon className="h-4 w-4 shrink-0" />
                    <span>{t('settings.invoiceLogo')}</span>
                  </button>
                </nav>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="min-w-0 flex-1 p-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

                {/* General Settings Tab */}
                {activeTab === 'general' && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-gray-900">{t('settings.general.title')}</h3>
                      <p className="text-xs text-gray-600">Basic system configuration</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="systemTitle" className="mb-1 block text-xs font-medium text-gray-700">
                    {t('settings.general.systemTitle')}
                  </label>
                  <input
                    type="text"
                    id="systemTitle"
                    name="systemTitle"
                    value={formData.systemTitle || ''}
                    onChange={handleInputChange}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="currency" className="mb-1 block text-xs font-medium text-gray-700">
                    {t('settings.general.currency')}
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    value={formData.currency || 'USD'}
                    onChange={handleInputChange}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {currencyOptions.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="timezone" className="mb-1 block text-xs font-medium text-gray-700">
                    {t('settings.general.timezone')}
                  </label>
                  <select
                    id="timezone"
                    name="timezone"
                    value={formData.timezone || 'UTC'}
                    onChange={handleInputChange}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="dateFormat" className="mb-1 block text-xs font-medium text-gray-700">
                    {t('settings.dateFormat')}
                  </label>
                  <select
                    id="dateFormat"
                    name="dateFormat"
                    value={formData.dateFormat || 'MM/DD/YYYY'}
                    onChange={handleInputChange}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {dateFormats.map((format) => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="timeFormat" className="mb-1 block text-xs font-medium text-gray-700">
                    {t('settings.timeFormat')}
                  </label>
                  <select
                    id="timeFormat"
                    name="timeFormat"
                    value={formData.timeFormat || '12h'}
                    onChange={handleInputChange}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="12h">12 Hour (AM/PM)</option>
                    <option value="24h">24 Hour</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="maxAppointmentsPerDay" className="mb-1 block text-xs font-medium text-gray-700">
                    {t('settings.maxAppointmentsPerDay')}
                  </label>
                  <input
                    type="number"
                    id="maxAppointmentsPerDay"
                    name="maxAppointmentsPerDay"
                    value={formData.maxAppointmentsPerDay || 50}
                    onChange={handleInputChange}
                    min="1"
                    max="200"
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

                    <div className="mt-4">
                      <label htmlFor="systemDescription" className="mb-1 block text-xs font-medium text-gray-700">
                        {t('settings.general.systemDescription')}
                      </label>
                      <textarea
                        id="systemDescription"
                        name="systemDescription"
                        value={formData.systemDescription || ''}
                        onChange={handleInputChange}
                        rows={3}
                        className="min-h-[5rem] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Appearance Settings Tab */}
                {activeTab === 'appearance' && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-gray-900">{t('settings.appearance')}</h3>
                      <p className="text-xs text-gray-600">Visual preferences and language settings</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="language" className="mb-1 block text-xs font-medium text-gray-700">
                          {t('settings.language')}
                        </label>
                        <select
                          id="language"
                          name="language"
                          value={formData.language || currentLanguage || 'en'}
                          onChange={handleInputChange}
                          className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {availableLanguages.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.flag} {lang.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Language changes apply immediately
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Settings Tab */}
                {activeTab === 'notifications' && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-gray-900">{t('settings.notifications')}</h3>
                      <p className="text-xs text-gray-600">Notification preferences</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label htmlFor="emailNotifications" className="text-xs font-medium text-gray-700">
                            {t('settings.emailNotifications')}
                          </label>
                          <p className="text-xs text-gray-500">Receive notifications via email</p>
                        </div>
                        <input
                          type="checkbox"
                          id="emailNotifications"
                          name="emailNotifications"
                          checked={formData.emailNotifications || false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label htmlFor="smsNotifications" className="text-xs font-medium text-gray-700">
                            {t('settings.smsNotifications')}
                          </label>
                          <p className="text-xs text-gray-500">Receive notifications via SMS</p>
                        </div>
                        <input
                          type="checkbox"
                          id="smsNotifications"
                          name="smsNotifications"
                          checked={formData.smsNotifications || false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label htmlFor="appointmentReminders" className="text-xs font-medium text-gray-700">
                            {t('settings.appointmentReminders')}
                          </label>
                          <p className="text-xs text-gray-500">Send appointment reminders</p>
                        </div>
                        <input
                          type="checkbox"
                          id="appointmentReminders"
                          name="appointmentReminders"
                          checked={formData.appointmentReminders || false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>

                      {formData.appointmentReminders && (
                        <div>
                          <label htmlFor="reminderTime" className="mb-1 block text-xs font-medium text-gray-700">
                            {t('settings.reminderTime')}
                          </label>
                          <input
                            type="number"
                            id="reminderTime"
                            name="reminderTime"
                            value={formData.reminderTime || 30}
                            onChange={handleInputChange}
                            min="5"
                            max="1440"
                            className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Working Hours Tab */}
                {activeTab === 'working-hours' && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-gray-900">{t('settings.workingHours')}</h3>
                      <p className="text-xs text-gray-600">Configure working hours and days</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="workingHours.start" className="mb-1 block text-xs font-medium text-gray-700">
                          {t('settings.startTime')}
                        </label>
                        <input
                          type="time"
                          id="workingHours.start"
                          name="workingHours.start"
                          value={formData.workingHours?.start || '09:00'}
                          onChange={handleInputChange}
                          className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="workingHours.end" className="mb-1 block text-xs font-medium text-gray-700">
                          {t('settings.endTime')}
                        </label>
                        <input
                          type="time"
                          id="workingHours.end"
                          name="workingHours.end"
                          value={formData.workingHours?.end || '17:00'}
                          onChange={handleInputChange}
                          className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-xs font-medium text-gray-700">
                        {t('settings.workingDays')}
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {daysOfWeek.map((day) => (
                          <div key={day} className="flex items-center">
                            <input
                              type="checkbox"
                              id={day}
                              checked={formData.workingHours?.days?.includes(day) || false}
                              onChange={(e) => handleWorkingDayChange(day, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={day} className="ml-2 text-xs text-gray-700">
                              {t(`settings.${day}`)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoice logo Tab */}
                {activeTab === 'invoice-logo' && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-gray-900">{t('settings.invoiceLogo')}</h3>
                      <p className="text-xs text-gray-600">{t('settings.invoiceLogoDescription')}</p>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div
                        className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-200 bg-gray-50"
                        aria-hidden
                      >
                        {formData.invoiceLogoUrl ? (
                          <img
                            src={formData.invoiceLogoUrl}
                            alt=""
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <ImageIcon className="h-10 w-10 text-gray-300" />
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">
                            {t('settings.invoiceLogoUpload')}
                          </label>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/gif,image/webp"
                            onChange={handleInvoiceLogoFile}
                            className="block w-full text-xs text-gray-600 file:mr-3 file:inline-flex file:h-9 file:items-center file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                          />
                          <p className="mt-1 text-xs text-gray-500">{t('settings.invoiceLogoHint')}</p>
                        </div>
                        {formData.invoiceLogoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveInvoiceLogo}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            {t('settings.invoiceLogoRemove')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Information Tab */}
                {activeTab === 'contact' && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-gray-900">{t('settings.contact')}</h3>
                      <p className="text-xs text-gray-600">Practice contact information</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label htmlFor="address.street" className="mb-1 block text-xs font-medium text-gray-700">
                          {t('settings.street')}
                        </label>
                        <input
                          type="text"
                          id="address.street"
                          name="address.street"
                          value={formData.address?.street || ''}
                          onChange={handleInputChange}
                          className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="address.city" className="mb-1 block text-xs font-medium text-gray-700">
                          {t('settings.city')}
                        </label>
                        <input
                          type="text"
                          id="address.city"
                          name="address.city"
                          value={formData.address?.city || ''}
                          onChange={handleInputChange}
                          className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="address.state" className="mb-1 block text-xs font-medium text-gray-700">
                          {t('settings.state')}
                        </label>
                        <input
                          type="text"
                          id="address.state"
                          name="address.state"
                          value={formData.address?.state || ''}
                          onChange={handleInputChange}
                          className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="address.country" className="mb-1 block text-xs font-medium text-gray-700">
                          {t('settings.country')}
                        </label>
                        <input
                          type="text"
                          id="address.country"
                          name="address.country"
                          value={formData.address?.country || ''}
                          onChange={handleInputChange}
                          className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="address.postalCode" className="mb-1 block text-xs font-medium text-gray-700">
                          {t('settings.postalCode')}
                        </label>
                        <input
                          type="text"
                          id="address.postalCode"
                          name="address.postalCode"
                          value={formData.address?.postalCode || ''}
                          onChange={handleInputChange}
                          className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="address.phone" className="mb-1 block text-xs font-medium text-gray-700">
                          {t('settings.phone')}
                        </label>
                        <input
                          type="tel"
                          id="address.phone"
                          name="address.phone"
                          value={formData.address?.phone || ''}
                          onChange={handleInputChange}
                          className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="address.email" className="mb-1 block text-xs font-medium text-gray-700">
                          {t('settings.email')}
                        </label>
                        <input
                          type="email"
                          id="address.email"
                          name="address.email"
                          value={formData.address?.email || ''}
                          onChange={handleInputChange}
                          className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </form>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t('settings.reset')}</span>
                </button>

                <button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSave();
                  }}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? t('settings.saving') : t('settings.save')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
