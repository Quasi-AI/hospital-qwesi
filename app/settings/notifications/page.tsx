'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Settings,
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';

interface NotificationProviders {
  email: {
    provider: 'sendgrid' | 'smtp';
    enabled: boolean;
    sendgrid?: {
      apiKey: string;
      fromEmail: string;
      fromName: string;
    };
    smtp?: {
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
      fromEmail: string;
      fromName: string;
    };
  };
  sms: {
    provider: 'twilio';
    enabled: boolean;
    defaultCountryCode?: string;
    twilio?: {
      accountSid: string;
      authToken: string;
      phoneNumber?: string;
      messagingServiceSid?: string;
    };
  };
}

interface FormData {
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  reminderTime: number;
  notificationProviders: NotificationProviders;
}

export default function NotificationSettingsPage() {
  const { translationsLoaded } = useTranslations();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSMS, setTestingSMS] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<FormData>({
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    reminderTime: 30,
    notificationProviders: {
      email: {
        provider: 'sendgrid',
        enabled: false,
        sendgrid: {
          apiKey: '',
          fromEmail: '',
          fromName: '',
        },
        smtp: {
          host: '',
          port: 587,
          secure: false,
          username: '',
          password: '',
          fromEmail: '',
          fromName: '',
        },
      },
      sms: {
        provider: 'twilio',
        enabled: false,
        defaultCountryCode: '',
        twilio: {
          accountSid: '',
          authToken: '',
          phoneNumber: '',
          messagingServiceSid: '',
        },
      },
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        const np = data.notificationProviders || formData.notificationProviders;
        setFormData({
          emailNotifications: data.emailNotifications ?? true,
          smsNotifications: data.smsNotifications ?? false,
          appointmentReminders: data.appointmentReminders ?? true,
          reminderTime: data.reminderTime ?? 30,
          notificationProviders: {
            ...np,
            sms: {
              ...np.sms,
              defaultCountryCode: np.sms?.defaultCountryCode ?? '',
              twilio: {
                accountSid: '',
                authToken: '',
                phoneNumber: '',
                messagingServiceSid: '',
                ...np.sms?.twilio,
              },
            },
          },
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const testEmailConnection = async () => {
    try {
      setTestingEmail(true);
      setMessage(null);

      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          testEmail: testEmailAddress || undefined,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: testEmailAddress ? 'Test email sent successfully!' : 'Email connection verified!' 
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Email test failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to test email connection' });
    } finally {
      setTestingEmail(false);
    }
  };

  const testSMSConnection = async () => {
    try {
      setTestingSMS(true);
      setMessage(null);

      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sms',
          testPhone: testPhoneNumber || undefined,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: testPhoneNumber ? 'Test SMS sent successfully!' : 'SMS connection verified!' 
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'SMS test failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to test SMS connection' });
    } finally {
      setTestingSMS(false);
    }
  };

  const updateEmailProvider = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      notificationProviders: {
        ...prev.notificationProviders,
        email: {
          ...prev.notificationProviders.email,
          [field]: value,
        },
      },
    }));
  };

  const updateSendgrid = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      notificationProviders: {
        ...prev.notificationProviders,
        email: {
          ...prev.notificationProviders.email,
          sendgrid: {
            ...prev.notificationProviders.email.sendgrid!,
            [field]: value,
          },
        },
      },
    }));
  };

  const updateSmtp = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      notificationProviders: {
        ...prev.notificationProviders,
        email: {
          ...prev.notificationProviders.email,
          smtp: {
            ...prev.notificationProviders.email.smtp!,
            [field]: value,
          },
        },
      },
    }));
  };

  const updateTwilio = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      notificationProviders: {
        ...prev.notificationProviders,
        sms: {
          ...prev.notificationProviders.sms,
          twilio: {
            ...prev.notificationProviders.sms.twilio!,
            [field]: value,
          },
        },
      },
    }));
  };

  const updateSmsProvider = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      notificationProviders: {
        ...prev.notificationProviders,
        sms: {
          ...prev.notificationProviders.sms,
          [field]: value,
        },
      },
    }));
  };

  if (!translationsLoaded || loading) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <SidebarLayout title="Notification Settings" description="Configure email and SMS providers" dense>
          <div className="flex h-32 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <SidebarLayout title="Notification Settings" description="Configure email and SMS notification providers" dense>
        <div className="mx-auto max-w-4xl space-y-3">
          {/* Back Link */}
          <Link 
            href="/settings" 
            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to General Settings
          </Link>

          {/* Message */}
          {message && (
            <div className={`flex items-center gap-1.5 rounded-md border p-2 text-xs ${
              message.type === 'success' 
                ? 'border-green-200 bg-green-50 text-green-800' 
                : 'border-red-200 bg-red-50 text-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              {message.text}
            </div>
          )}

          {/* General Notification Settings */}
          <div className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Settings className="h-4 w-4" />
              General Settings
            </h2>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs">
                <span className="text-gray-700">Enable Email Notifications</span>
                <input
                  type="checkbox"
                  checked={formData.emailNotifications}
                  onChange={(e) => setFormData({ ...formData, emailNotifications: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between text-xs">
                <span className="text-gray-700">Enable SMS Notifications</span>
                <input
                  type="checkbox"
                  checked={formData.smsNotifications}
                  onChange={(e) => setFormData({ ...formData, smsNotifications: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between text-xs">
                <span className="text-gray-700">Enable Appointment Reminders</span>
                <input
                  type="checkbox"
                  checked={formData.appointmentReminders}
                  onChange={(e) => setFormData({ ...formData, appointmentReminders: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700">Reminder Time (minutes before)</span>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={formData.reminderTime}
                  onChange={(e) => setFormData({ ...formData, reminderTime: parseInt(e.target.value) || 30 })}
                  className="h-8 w-24 rounded-md border border-gray-200 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Email Provider Settings */}
          <div className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Mail className="h-4 w-4" />
              Email Provider
            </h2>

            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs">
                <span className="text-gray-700">Enable Email Provider</span>
                <input
                  type="checkbox"
                  checked={formData.notificationProviders.email.enabled}
                  onChange={(e) => updateEmailProvider('enabled', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Provider</label>
                <select
                  value={formData.notificationProviders.email.provider}
                  onChange={(e) => updateEmailProvider('provider', e.target.value)}
                  className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="sendgrid">SendGrid</option>
                  <option value="smtp">SMTP</option>
                </select>
              </div>

              {formData.notificationProviders.email.provider === 'sendgrid' && (
                <div className="space-y-2 border-t border-gray-100 pt-2">
                  <h3 className="text-xs font-semibold text-gray-900">SendGrid Configuration</h3>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">API Key</label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={formData.notificationProviders.email.sendgrid?.apiKey || ''}
                        onChange={(e) => updateSendgrid('apiKey', e.target.value)}
                        placeholder="SG.xxxxxxxxxx"
                        className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 pr-10 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">From Email</label>
                      <input
                        type="email"
                        value={formData.notificationProviders.email.sendgrid?.fromEmail || ''}
                        onChange={(e) => updateSendgrid('fromEmail', e.target.value)}
                        placeholder="noreply@clinic.com"
                        className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">From Name</label>
                      <input
                        type="text"
                        value={formData.notificationProviders.email.sendgrid?.fromName || ''}
                        onChange={(e) => updateSendgrid('fromName', e.target.value)}
                        placeholder="My Clinic"
                        className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.notificationProviders.email.provider === 'smtp' && (
                <div className="space-y-2 border-t border-gray-100 pt-2">
                  <h3 className="text-xs font-semibold text-gray-900">SMTP Configuration</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Host</label>
                      <input
                        type="text"
                        value={formData.notificationProviders.email.smtp?.host || ''}
                        onChange={(e) => updateSmtp('host', e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Port</label>
                      <input
                        type="number"
                        value={formData.notificationProviders.email.smtp?.port || 587}
                        onChange={(e) => updateSmtp('port', parseInt(e.target.value))}
                        className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={formData.notificationProviders.email.smtp?.secure || false}
                      onChange={(e) => updateSmtp('secure', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Use SSL/TLS</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Username</label>
                      <input
                        type="text"
                        value={formData.notificationProviders.email.smtp?.username || ''}
                        onChange={(e) => updateSmtp('username', e.target.value)}
                        className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Password</label>
                      <div className="relative">
                        <input
                          type={showSmtpPassword ? 'text' : 'password'}
                          value={formData.notificationProviders.email.smtp?.password || ''}
                          onChange={(e) => updateSmtp('password', e.target.value)}
                          className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 pr-10 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                        >
                          {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">From Email</label>
                      <input
                        type="email"
                        value={formData.notificationProviders.email.smtp?.fromEmail || ''}
                        onChange={(e) => updateSmtp('fromEmail', e.target.value)}
                        placeholder="noreply@clinic.com"
                        className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">From Name</label>
                      <input
                        type="text"
                        value={formData.notificationProviders.email.smtp?.fromName || ''}
                        onChange={(e) => updateSmtp('fromName', e.target.value)}
                        placeholder="My Clinic"
                        className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Test Email */}
              <div className="border-t border-gray-100 pt-2">
                <h3 className="mb-1 text-xs font-semibold text-gray-900">Test Email Connection</h3>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="test@example.com (optional)"
                    className="h-8 flex-1 rounded-md border border-gray-200 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={testEmailConnection}
                    disabled={testingEmail || !formData.notificationProviders.email.enabled}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-blue-600 bg-blue-600 px-2.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {testingEmail ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    Test
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to just verify connection, or enter an email to send a test message
                </p>
              </div>
            </div>
          </div>

          {/* SMS Provider Settings */}
          <div className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <MessageSquare className="h-4 w-4" />
              SMS Provider (Twilio)
            </h2>

            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs">
                <span className="text-gray-700">Enable SMS Provider</span>
                <input
                  type="checkbox"
                  checked={formData.notificationProviders.sms.enabled}
                  onChange={(e) => updateSmsProvider('enabled', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <div className="rounded-md border border-sky-200 bg-sky-50 p-2 text-[11px] leading-snug text-sky-950 shadow-sm">
                <p className="text-xs font-semibold text-sky-900">International / multi-country SMS</p>
                <p className="mt-1 text-sky-900/90">
                  Twilio operates worldwide, but <strong>each account</strong> must explicitly allow destination
                  countries and use senders that are permitted for those routes. This app cannot turn on "all
                  countries" for you—that is controlled in Twilio Console (fraud and compliance).
                </p>
                <ul className="mt-1 list-disc space-y-0 pl-3.5 text-sky-900/90">
                  <li>
                    Enable every country you need under{' '}
                    <strong className="text-sky-950">Messaging → Settings → Geographic permissions</strong> (account
                    owner/admin only). See{' '}
                    <a
                      href="https://www.twilio.com/docs/messaging/guides/sms-geo-permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-700 underline hover:text-blue-900"
                    >
                      Twilio: SMS geo permissions
                    </a>
                    .
                  </li>
                  <li>
                    Add a <strong className="text-sky-950">Messaging Service SID</strong> below and attach Twilio
                    numbers (or other approved senders) for each region you message—Twilio will pick a valid sender
                    when possible. A lone US +1 number is often not enough for global delivery.
                  </li>
                </ul>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Account SID</label>
                  <input
                    type="text"
                    value={formData.notificationProviders.sms.twilio?.accountSid || ''}
                    onChange={(e) => updateTwilio('accountSid', e.target.value)}
                    placeholder="ACxxxxxxxxxx"
                    className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Auth Token</label>
                  <div className="relative">
                    <input
                      type={showAuthToken ? 'text' : 'password'}
                      value={formData.notificationProviders.sms.twilio?.authToken || ''}
                      onChange={(e) => updateTwilio('authToken', e.target.value)}
                      placeholder="xxxxxxxxxx"
                      className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 pr-10 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthToken(!showAuthToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                    >
                      {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Messaging Service SID (recommended for many regions)
                  </label>
                  <input
                    type="text"
                    value={formData.notificationProviders.sms.twilio?.messagingServiceSid || ''}
                    onChange={(e) => updateTwilio('messagingServiceSid', e.target.value.trim())}
                    placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    When set, SMS is sent with this service instead of the From number. In Twilio: Messaging →
                    Services → create a service → add sender phone numbers for each country or region you need.
                    Leave empty to send only from the From number below.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">From phone number (E.164)</label>
                  <input
                    type="text"
                    value={formData.notificationProviders.sms.twilio?.phoneNumber || ''}
                    onChange={(e) => updateTwilio('phoneNumber', e.target.value)}
                    placeholder="+1234567890 or +880…"
                    className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Required if Messaging Service SID is empty. If you use a Messaging Service, you can still fill
                    this for tests or leave it empty when the service owns all senders.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Default SMS country (ISO code)
                  </label>
                  <input
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    maxLength={2}
                    value={formData.notificationProviders.sms.defaultCountryCode || ''}
                    onChange={(e) =>
                      updateSmsProvider(
                        'defaultCountryCode',
                        e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
                      )
                    }
                    placeholder="e.g. BD, US, GB"
                    className="h-8 w-full max-w-[8rem] rounded-md border border-gray-200 bg-white px-2 font-mono text-xs uppercase tracking-widest focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ISO 3166-1 alpha-2 (two letters). Used to format national numbers for SMS and public
                    booking verification (e.g. <span className="font-mono">017…</span> with{' '}
                    <span className="font-mono">BD</span> becomes <span className="font-mono">+880…</span>).
                    If empty, your organisation address country is used when possible.
                  </p>
                </div>
              </div>

              {/* Test SMS */}
              <div className="border-t border-gray-100 pt-2">
                <h3 className="mb-1 text-xs font-semibold text-gray-900">Test SMS Connection</h3>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="+1234567890 (optional)"
                    className="h-8 flex-1 rounded-md border border-gray-200 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={testSMSConnection}
                    disabled={testingSMS || !formData.notificationProviders.sms.enabled}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-blue-600 bg-blue-600 px-2.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {testingSMS ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    Test
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to just verify credentials, or enter a phone number to send a test SMS
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Settings
            </button>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
