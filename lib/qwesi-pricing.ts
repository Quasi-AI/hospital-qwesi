export type QwesiPriceCurrency = 'GHS' | 'USD';

export type QwesiPaygItem = {
  id: string;
  name: string;
  priceLabel: string;
  minAmount: number;
  maxAmount: number;
  currency: QwesiPriceCurrency;
  description?: string;
  features: string[];
};

export type QwesiSubscriptionPlan = {
  id: string;
  name: string;
  priceLabel: string;
  amount: number;
  maxAmount?: number;
  currency: QwesiPriceCurrency;
  billingInterval: 'month';
  audience: string;
  features: string[];
};

export const qwesiPaygItems: QwesiPaygItem[] = [
  {
    id: 'ai-consultation-intake',
    name: 'AI Consultation / Intake',
    priceLabel: 'Free',
    minAmount: 0,
    maxAmount: 0,
    currency: 'GHS',
    features: ['Symptom intake', 'Basic guidance', 'Routing to care'],
  },
  {
    id: 'doctor-virtual-consultation',
    name: 'Doctor Virtual Consultation',
    priceLabel: 'GHS 80-150',
    minAmount: 80,
    maxAmount: 150,
    currency: 'GHS',
    features: ['GP/general consult'],
  },
  {
    id: 'specialist-consultation',
    name: 'Specialist Consultation',
    priceLabel: 'GHS 150-400',
    minAmount: 150,
    maxAmount: 400,
    currency: 'GHS',
    description: 'Depends on specialty.',
    features: ['Specialist review', 'Care recommendations', 'Referral guidance when needed'],
  },
];

export const qwesiSubscriptionPlans: QwesiSubscriptionPlan[] = [
  {
    id: 'basic-care',
    name: 'Basic Care',
    priceLabel: 'GHS 50/month',
    amount: 50,
    currency: 'GHS',
    billingInterval: 'month',
    audience: 'For general health support.',
    features: [
      'AI health intake',
      'Digital health record',
      'Lab and pharmacy coordination',
      'Discounted doctor consultations',
    ],
  },
  {
    id: 'family-care',
    name: 'Family Care',
    priceLabel: 'GHS 150/month',
    amount: 150,
    currency: 'GHS',
    billingInterval: 'month',
    audience: 'For patients with ongoing health needs.',
    features: [
      'BP/diabetes tracking',
      'Access to a Qwesi doctor when needed',
      'Lab and medication coordination',
      'Family health updates',
      'Health Wallet savings: GHS 20-30/month',
    ],
  },
  {
    id: 'chronic-care-plus',
    name: 'Chronic Care Plus',
    priceLabel: 'GHS 300/month',
    amount: 300,
    currency: 'GHS',
    billingInterval: 'month',
    audience: 'For chronic illness, elderly care, and higher-risk patients.',
    features: [
      'Monthly doctor review',
      'BP/glucose monitoring support',
      'Medication adherence follow-up',
      'Lab coordination',
      'Monthly health report',
      'Priority support',
      'Health Wallet savings: GHS 40-60',
    ],
  },
  {
    id: 'diaspora-parent-care',
    name: 'Diaspora Parent Care',
    priceLabel: '$30-50/month',
    amount: 30,
    maxAmount: 50,
    currency: 'USD',
    billingInterval: 'month',
    audience: 'For families abroad caring for loved ones back home.',
    features: [
      'Doctor review access',
      'BP/diabetes monitoring',
      'Lab/pharmacy coordination',
      'Monthly health updates to family abroad',
      'Health Wallet savings: GHS 5-10',
    ],
  },
];

export function getQwesiPaygItem(id: string) {
  return qwesiPaygItems.find((item) => item.id === id);
}

export function getQwesiSubscriptionPlan(id: string) {
  return qwesiSubscriptionPlans.find((plan) => plan.id === id);
}

export function toPaystackSubunit(amount: number) {
  return Math.round(amount * 100);
}
