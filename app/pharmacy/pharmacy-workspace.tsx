'use client';

import Link from 'next/link';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import DashboardTopToolbar from '@/app/components/DashboardTopToolbar';
import {
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  MessageCircle,
  Package,
  Pill,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wallet,
} from 'lucide-react';

export type PharmacyView =
  | 'dashboard'
  | 'queue'
  | 'verification'
  | 'orders'
  | 'inventory'
  | 'substitutions'
  | 'refills'
  | 'deliveries'
  | 'messages'
  | 'billing'
  | 'reports'
  | 'compliance'
  | 'settings';

const titleMap: Record<PharmacyView, { title: string; description: string; icon: React.ElementType }> = {
  dashboard: {
    title: 'Pharmacy Dashboard',
    description: 'Live pharmacy metrics appear here after medicines and dispensing records are added.',
    icon: Pill,
  },
  queue: {
    title: 'Prescription Queue',
    description: 'Prescription requests will appear here when doctors send them to the pharmacy.',
    icon: ClipboardList,
  },
  verification: {
    title: 'Clinical Verification',
    description: 'Clinical review items will appear here when prescriptions need pharmacist checks.',
    icon: ShieldCheck,
  },
  orders: {
    title: 'Orders & Fulfillment',
    description: 'Patient pickup and delivery orders will appear here after dispensing starts.',
    icon: ShoppingCart,
  },
  inventory: {
    title: 'Inventory Management',
    description: 'Medicine stock is built from medicines added by users.',
    icon: Package,
  },
  substitutions: {
    title: 'Substitutions',
    description: 'Substitution requests will appear here when a prescription needs an alternative.',
    icon: RefreshCw,
  },
  refills: {
    title: 'Chronic Refill Program',
    description: 'Refill schedules will appear here after chronic medications are configured.',
    icon: Clock,
  },
  deliveries: {
    title: 'Delivery / Dispatch',
    description: 'Delivery assignments will appear here when orders are sent for dispatch.',
    icon: Truck,
  },
  messages: {
    title: 'Messages',
    description: 'Pharmacy conversations will appear here when care teams send messages.',
    icon: MessageCircle,
  },
  billing: {
    title: 'Billing & Wallet',
    description: 'Payments, balances, and payouts will appear here after pharmacy transactions are recorded.',
    icon: Wallet,
  },
  reports: {
    title: 'Reports',
    description: 'Reports will appear here after real pharmacy activity is recorded.',
    icon: FileText,
  },
  compliance: {
    title: 'Compliance Logs',
    description: 'Audit events will appear here after pharmacy actions are performed.',
    icon: ClipboardCheck,
  },
  settings: {
    title: 'Pharmacy Settings',
    description: 'Configure pharmacy profile, dispensing preferences, and notifications here.',
    icon: Pill,
  },
};

const primaryActions: Partial<Record<PharmacyView, { label: string; href: string; icon: React.ElementType }[]>> = {
  dashboard: [
    { label: 'Add Medicine', href: '/pharmacy/medicines/new', icon: Plus },
    { label: 'Dispensing', href: '/pharmacy/dispensing', icon: ClipboardList },
  ],
  inventory: [
    { label: 'Add Medicine', href: '/pharmacy/medicines/new', icon: Plus },
    { label: 'Medicine List', href: '/pharmacy', icon: Pill },
  ],
  queue: [{ label: 'Dispensing', href: '/pharmacy/dispensing', icon: ClipboardList }],
  orders: [{ label: 'Dispensing List', href: '/pharmacy/dispensing/list', icon: ClipboardList }],
  billing: [{ label: 'Dispensing List', href: '/pharmacy/dispensing/list', icon: ClipboardList }],
  reports: [{ label: 'Dispensing List', href: '/pharmacy/dispensing/list', icon: ClipboardList }],
};

function EmptyWorkspace({ view }: { view: PharmacyView }) {
  const meta = titleMap[view];
  const Icon = meta.icon;
  const actions = primaryActions[view] || [
    { label: 'Dashboard', href: '/pharmacy', icon: Pill },
    { label: 'Add Medicine', href: '/pharmacy/medicines/new', icon: Plus },
  ];

  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-950">No records yet</h3>
      <p className="mx-auto mt-1 max-w-xl text-sm text-gray-600">{meta.description}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <action.icon className="h-4 w-4" />
            {action.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function PharmacyWorkspace({ view }: { view: PharmacyView }) {
  const meta = titleMap[view];

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={meta.title}
        description={meta.description}
        topRight={<DashboardTopToolbar compact />}
        dense
        wide
      >
        <EmptyWorkspace view={view} />
      </SidebarLayout>
    </ProtectedRoute>
  );
}
