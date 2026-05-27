type RawPaystackSettings = {
  enabled?: boolean;
  mode?: 'test' | 'live';
  publicKey?: string;
  secretKey?: string;
  callbackUrl?: string;
};

export type PaystackSettings = {
  enabled: boolean;
  mode: 'test' | 'live';
  publicKey: string;
  secretKey: string;
  callbackUrl: string;
};

function envEnabled() {
  const value = process.env.PAYSTACK_ENABLED?.toLowerCase().trim();
  return value === 'true' || value === '1' || value === 'yes';
}

export function getPaystackSettings(settings: any): PaystackSettings {
  const saved = (settings?.paymentProviders?.paystack || {}) as RawPaystackSettings;
  const secretKey = (saved.secretKey || process.env.PAYSTACK_SECRET_KEY || '').trim();

  return {
    enabled: saved.enabled === true || envEnabled(),
    mode: saved.mode === 'test' ? 'test' : 'live',
    publicKey: (saved.publicKey || process.env.PAYSTACK_PUBLIC_KEY || '').trim(),
    secretKey,
    callbackUrl: (saved.callbackUrl || process.env.PAYSTACK_CALLBACK_URL || '').trim(),
  };
}

export function getPaystackConfigError(paystack: PaystackSettings) {
  if (!paystack.enabled) {
    return 'Paystack checkout is disabled in Settings > Payments';
  }

  if (!paystack.secretKey) {
    return 'Paystack secret key is missing in Settings > Payments';
  }

  return null;
}
