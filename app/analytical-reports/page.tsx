'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  DollarSign,
  Activity,
  LineChart,
  Target,
  Users,
  Calendar,
  ArrowRight,
  TrendingUp,
  PieChart
} from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';

export default function AnalyticalReportsPage() {
  const { t, translationsLoaded } = useTranslations();

  const reportCategories = [
    {
      id: 'financial',
      title: t('navigation.financialReports'),
      description: 'Revenue reports, outstanding payments, payment history, and financial statements',
      icon: DollarSign,
      href: '/analytical-reports/financial',
      color: 'bg-green-100 text-green-700',
      iconColor: 'text-green-600',
      roles: ['admin', 'staff']
    },
    {
      id: 'clinical',
      title: t('navigation.clinicalAnalytics'),
      description: 'Patient outcomes, treatment effectiveness, disease trends, and clinical metrics',
      icon: Activity,
      href: '/analytical-reports/clinical',
      color: 'bg-blue-100 text-blue-700',
      iconColor: 'text-blue-600',
      roles: ['admin', 'doctor', 'staff']
    },
    {
      id: 'operational',
      title: t('navigation.operationalAnalytics'),
      description: 'Appointment utilization, patient flow analysis, and resource utilization',
      icon: LineChart,
      href: '/analytical-reports/operational',
      color: 'bg-purple-100 text-purple-700',
      iconColor: 'text-purple-600',
      roles: ['admin', 'staff']
    },
    {
      id: 'performance',
      title: t('navigation.performanceReports'),
      description: 'Doctor performance metrics, staff productivity, and efficiency reports',
      icon: Target,
      href: '/analytical-reports/performance',
      color: 'bg-orange-100 text-orange-700',
      iconColor: 'text-orange-600',
      roles: ['admin', 'doctor']
    },
    {
      id: 'patient',
      title: t('navigation.patientAnalytics'),
      description: 'Patient demographics, visit patterns, and patient satisfaction metrics',
      icon: Users,
      href: '/analytical-reports/patient',
      color: 'bg-indigo-100 text-indigo-700',
      iconColor: 'text-indigo-600',
      roles: ['admin', 'doctor', 'staff']
    },
    {
      id: 'appointment',
      title: t('navigation.appointmentAnalytics'),
      description: 'Appointment trends, no-show rates, and scheduling efficiency',
      icon: Calendar,
      href: '/analytical-reports/appointment',
      color: 'bg-pink-100 text-pink-700',
      iconColor: 'text-pink-600',
      roles: ['admin', 'doctor', 'staff']
    }
  ];

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="Analytical Reports" description="" dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title={t('navigation.analyticalReports')}
        description="Comprehensive analytical reports and insights for your hospital" dense>
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shadow-sm">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 shrink-0" />
              <h2 className="text-sm font-semibold sm:text-base">Analytical Reports Dashboard</h2>
            </div>
            <p className="mt-1 text-xs text-blue-100">
              Access comprehensive analytics and insights to make data-driven decisions
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {reportCategories.map((category) => (
              <Link
                key={category.id}
                href={category.href}
                className="group rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className={`rounded-md p-2 ${category.color}`}>
                    <category.icon className={`h-4 w-4 ${category.iconColor}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{category.title}</h3>
                <p className="mt-1 text-xs leading-snug text-gray-600">{category.description}</p>
              </Link>
            ))}
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Quick Insights</h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="rounded-md border border-green-100 bg-green-50/80 p-3 text-center">
                <TrendingUp className="mx-auto mb-1 h-6 w-6 text-green-600" />
                <p className="text-lg font-semibold tabular-nums text-gray-900">--</p>
                <p className="text-xs text-gray-600">Total Revenue</p>
              </div>
              <div className="rounded-md border border-blue-100 bg-blue-50/80 p-3 text-center">
                <Users className="mx-auto mb-1 h-6 w-6 text-blue-600" />
                <p className="text-lg font-semibold tabular-nums text-gray-900">--</p>
                <p className="text-xs text-gray-600">Active Patients</p>
              </div>
              <div className="rounded-md border border-purple-100 bg-purple-50/80 p-3 text-center">
                <Calendar className="mx-auto mb-1 h-6 w-6 text-purple-600" />
                <p className="text-lg font-semibold tabular-nums text-gray-900">--</p>
                <p className="text-xs text-gray-600">Appointments</p>
              </div>
              <div className="rounded-md border border-orange-100 bg-orange-50/80 p-3 text-center">
                <PieChart className="mx-auto mb-1 h-6 w-6 text-orange-600" />
                <p className="text-lg font-semibold tabular-nums text-gray-900">--</p>
                <p className="text-xs text-gray-600">Reports Generated</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
