import twilio from 'twilio';
import type { CountryCode } from 'libphonenumber-js';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { countryCodeFromAddressField, countryCodeFromSmsSettingsField } from '@/lib/phoneCountryFields';
import { phoneToE164 } from '@/lib/phoneE164';

export interface SMSOptions {
  to: string;
  message: string;
}

export interface SMSResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

interface SMSConfig {
  provider: 'twilio';
  enabled: boolean;
  defaultCountryCode?: string;
  twilio?: {
    accountSid: string;
    authToken: string;
    phoneNumber?: string;
    messagingServiceSid?: string;
  };
}

export type TwilioSendCredentials = {
  accountSid: string;
  authToken: string;
  phoneNumber?: string;
  messagingServiceSid?: string;
};

async function loadSettingsForSms(): Promise<{
  sms: SMSConfig | null;
  defaultCountry: CountryCode | undefined;
}> {
  await dbConnect();
  const settings = await Settings.findOne({}).select('notificationProviders.sms address.country').lean();
  const smsDoc = settings?.notificationProviders?.sms as SMSConfig | null | undefined;
  const defaultCountry: CountryCode | undefined =
    countryCodeFromSmsSettingsField(smsDoc?.defaultCountryCode) ||
    countryCodeFromAddressField(settings?.address?.country);
  const sms = settings?.notificationProviders?.sms
    ? (settings.notificationProviders.sms as SMSConfig)
    : null;
  return { sms, defaultCountry };
}

function getTwilioFromEnv(): TwilioSendCredentials | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (!accountSid || !authToken) return null;
  if (messagingServiceSid) {
    return { accountSid, authToken, messagingServiceSid, ...(phoneNumber ? { phoneNumber } : {}) };
  }
  if (phoneNumber) {
    return { accountSid, authToken, phoneNumber };
  }
  return null;
}

function normalizeTwilioCredentials(t?: SMSConfig['twilio']): TwilioSendCredentials | null {
  if (!t?.accountSid?.trim() || !t.authToken?.trim()) return null;
  const accountSid = t.accountSid.trim();
  const authToken = t.authToken.trim();
  const messagingServiceSid = t.messagingServiceSid?.trim();
  const phoneNumber = t.phoneNumber?.trim();
  if (messagingServiceSid) {
    return { accountSid, authToken, messagingServiceSid, ...(phoneNumber ? { phoneNumber } : {}) };
  }
  if (phoneNumber) {
    return { accountSid, authToken, phoneNumber };
  }
  return null;
}

export async function sendSMS(options: SMSOptions): Promise<SMSResult> {
  try {
    const { sms: config, defaultCountry } = await loadSettingsForSms();
    const dbTwilio = config?.provider === 'twilio' ? normalizeTwilioCredentials(config.twilio) : null;
    const envTwilio = getTwilioFromEnv();

    const twilioCreds = dbTwilio || envTwilio;
    if (twilioCreds) {
      return await sendViaTwilio(options, twilioCreds, defaultCountry);
    }

    return {
      success: false,
      error:
        'SMS is not configured. In Admin, open Settings → Notification Settings, enter Twilio Account SID, Auth Token, and either a Messaging Service SID (MG…) and/or a From phone number (or set TWILIO_* env vars).',
    };
  } catch (error: any) {
    console.error('SMS send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    };
  }
}

async function sendViaTwilio(
  options: SMSOptions,
  config: TwilioSendCredentials,
  defaultCountry: CountryCode | undefined
): Promise<SMSResult> {
  try {
    const client = twilio(config.accountSid, config.authToken);

    const formattedTo = phoneToE164(options.to, defaultCountry);
    if (!formattedTo) {
      return {
        success: false,
        error:
          'Invalid phone number for SMS. Use international format (e.g. +880 1XXX), or set Default SMS country (ISO code) in Admin → Settings → Notification Settings → SMS.',
      };
    }

    const useMs = Boolean(config.messagingServiceSid?.trim());
    if (!useMs && !config.phoneNumber?.trim()) {
      return {
        success: false,
        error:
          'Twilio needs a Messaging Service SID (MG…) or a From phone number. Set one in Admin → Notification Settings.',
      };
    }
    const message = await client.messages.create({
      body: options.message,
      to: formattedTo,
      ...(useMs
        ? { messagingServiceSid: config.messagingServiceSid!.trim() }
        : { from: config.phoneNumber!.trim() }),
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error: any) {
    console.error('Twilio error:', error);
    return {
      success: false,
      error: error.message || 'Twilio error',
    };
  }
}

export async function testSMSConnection(testPhone?: string): Promise<SMSResult> {
  try {
    const { sms: config } = await loadSettingsForSms();
    const dbTwilio = config?.provider === 'twilio' ? normalizeTwilioCredentials(config.twilio) : null;
    const envTwilio = getTwilioFromEnv();
    const twilioCreds = dbTwilio || envTwilio;

    if (!twilioCreds) {
      return {
        success: false,
        error: 'SMS is not configured (add Twilio in Notification Settings or TWILIO_* env vars).',
      };
    }

    try {
      const client = twilio(twilioCreds.accountSid, twilioCreds.authToken);
      await client.api.accounts(twilioCreds.accountSid).fetch();

      if (testPhone) {
        return await sendSMS({
          to: testPhone,
          message: 'Test message from HMS Notification System. Your SMS configuration is working correctly.',
        });
      }

      return { success: true };
    } catch (twilioError: any) {
      return {
        success: false,
        error: twilioError.message || 'Failed to verify Twilio credentials',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Connection test failed',
    };
  }
}
