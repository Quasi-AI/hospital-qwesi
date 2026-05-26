'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FlaskConical,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Printer,
  Edit,
  TestTube,
  XCircle,
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';
import { useSettings } from '../../contexts/SettingsContext';

export default function LabTestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, translationsLoaded } = useTranslations();
  const { settings } = useSettings();
  const [labTest, setLabTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchLabTest();
    }
  }, [params.id]);

  const fetchLabTest = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lab/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setLabTest(data.labTest);
      }
    } catch (error) {
      console.error('Error fetching lab test:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'sample-collected') {
        updateData.sampleCollectedAt = new Date();
      }

      const response = await fetch(`/api/lab/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        fetchLabTest();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sample-collected': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'stat': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      case 'routine': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-600';
      case 'abnormal': return 'text-orange-600';
      case 'critical': return 'text-red-600 font-bold';
      default: return 'text-gray-600';
    }
  };

  if (!translationsLoaded || loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('lab.testDetails')} description="" dense>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (!labTest) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('lab.testDetails')} description="" dense>
          <div className="text-center py-12">
            <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{t('lab.testNotFound')}</p>
            <Link href="/lab" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              {t('common.back')} {t('lab.toLabTests')}
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  const hospitalName = settings?.systemTitle || 'Medical Center';

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('lab.testDetails')} description={labTest.testNumber} dense>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 print:hidden">
            <Link href="/lab" className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 sm:text-sm">
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>{t('common.back')}</span>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 px-2.5 text-xs text-gray-700 hover:bg-gray-50 sm:text-sm"
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t('lab.printReport')}</span>
              </button>
              {labTest.status !== 'completed' && labTest.status !== 'cancelled' && (
                <Link
                  href={`/lab/${params.id}/results`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-2.5 text-xs font-medium text-white hover:bg-blue-700 sm:text-sm"
                >
                  <Edit className="h-4 w-4 shrink-0" />
                  <span>{t('lab.enterResults')}</span>
                </Link>
              )}
            </div>
          </div>

          {/* ===== PRINT VIEW - Professional Lab Report ===== */}
          <div className="hidden print:block lab-report-print">
            <style jsx>{`
              @media print {
                .lab-report-print {
                  font-family: 'Segoe UI', Arial, sans-serif;
                  color: #1a1a1a;
                  font-size: 10pt;
                  line-height: 1.4;
                }
              }
            `}</style>

            {/* Header */}
            <div style={{ borderBottom: '3px solid #1e40af', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {/* Logo & Hospital Info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '24px',
                    fontWeight: 'bold'
                  }}>
                    🔬
                  </div>
                  <div>
                    <h1 style={{ fontSize: '20pt', fontWeight: '700', color: '#1e40af', margin: 0, letterSpacing: '-0.5px' }}>
                      {hospitalName}
                    </h1>
                    <p style={{ fontSize: '9pt', color: '#4b5563', margin: '2px 0 0 0' }}>
                      Clinical Laboratory & Diagnostic Services
                    </p>
                    <p style={{ fontSize: '8pt', color: '#6b7280', margin: '4px 0 0 0' }}>
                      NABL Accredited | ISO 15189:2012 Certified | CAP Accredited
                    </p>
                  </div>
                </div>
                {/* Report Title */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    background: '#1e40af', 
                    color: 'white', 
                    padding: '8px 20px',
                    fontSize: '12pt',
                    fontWeight: '600',
                    letterSpacing: '2px'
                  }}>
                    LABORATORY REPORT
                  </div>
                  <p style={{ fontSize: '8pt', color: '#6b7280', marginTop: '8px' }}>
                    Tel: (555) 123-4567 | Fax: (555) 123-4568
                  </p>
                  <p style={{ fontSize: '8pt', color: '#6b7280' }}>
                    Email: laboratory@{hospitalName.toLowerCase().replace(/\s+/g, '')}.com
                  </p>
                </div>
              </div>
            </div>

            {/* Report Info Bar */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '1px', 
              background: '#e5e7eb',
              border: '1px solid #d1d5db',
              marginBottom: '20px'
            }}>
              <div style={{ background: '#f9fafb', padding: '10px 12px' }}>
                <p style={{ fontSize: '7pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Report No.</p>
                <p style={{ fontSize: '10pt', fontWeight: '600', color: '#111827', margin: '2px 0 0 0' }}>{labTest.testNumber}</p>
              </div>
              <div style={{ background: '#f9fafb', padding: '10px 12px' }}>
                <p style={{ fontSize: '7pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Report Date</p>
                <p style={{ fontSize: '10pt', fontWeight: '600', color: '#111827', margin: '2px 0 0 0' }}>{formatDate(labTest.completedAt || labTest.createdAt)}</p>
              </div>
              <div style={{ background: '#f9fafb', padding: '10px 12px' }}>
                <p style={{ fontSize: '7pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Collection Date</p>
                <p style={{ fontSize: '10pt', fontWeight: '600', color: '#111827', margin: '2px 0 0 0' }}>{labTest.sampleCollectedAt ? formatDate(labTest.sampleCollectedAt) : 'Pending'}</p>
              </div>
              <div style={{ background: '#f9fafb', padding: '10px 12px' }}>
                <p style={{ fontSize: '7pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Priority</p>
                <p style={{ 
                  fontSize: '10pt', 
                  fontWeight: '700', 
                  color: labTest.priority === 'stat' ? '#dc2626' : labTest.priority === 'urgent' ? '#ea580c' : '#111827', 
                  margin: '2px 0 0 0',
                  textTransform: 'uppercase'
                }}>{labTest.priority}</p>
              </div>
            </div>

            {/* Patient & Test Information */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* Patient Info */}
              <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#1e40af', color: 'white', padding: '8px 12px', fontSize: '9pt', fontWeight: '600', letterSpacing: '0.5px' }}>
                  PATIENT INFORMATION
                </div>
                <div style={{ padding: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px 0', fontSize: '8pt', color: '#6b7280', width: '35%' }}>Patient Name</td>
                        <td style={{ padding: '4px 0', fontSize: '10pt', fontWeight: '600', color: '#111827' }}>{labTest.patientName}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0', fontSize: '8pt', color: '#6b7280' }}>Patient ID</td>
                        <td style={{ padding: '4px 0', fontSize: '9pt', fontWeight: '500', color: '#374151' }}>{labTest.hospitalPatientId || labTest.patientId}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0', fontSize: '8pt', color: '#6b7280' }}>Contact</td>
                        <td style={{ padding: '4px 0', fontSize: '9pt', color: '#374151' }}>{labTest.patientPhone || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0', fontSize: '8pt', color: '#6b7280' }}>Email</td>
                        <td style={{ padding: '4px 0', fontSize: '9pt', color: '#374151' }}>{labTest.patientEmail || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Specimen Info */}
              <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: '#1e40af', color: 'white', padding: '8px 12px', fontSize: '9pt', fontWeight: '600', letterSpacing: '0.5px' }}>
                  SPECIMEN INFORMATION
                </div>
                <div style={{ padding: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px 0', fontSize: '8pt', color: '#6b7280', width: '40%' }}>Specimen Type</td>
                        <td style={{ padding: '4px 0', fontSize: '10pt', fontWeight: '600', color: '#111827' }}>{labTest.sampleType || 'Blood'}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0', fontSize: '8pt', color: '#6b7280' }}>Test Category</td>
                        <td style={{ padding: '4px 0', fontSize: '9pt', color: '#374151', textTransform: 'capitalize' }}>{labTest.testCategory}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0', fontSize: '8pt', color: '#6b7280' }}>Referring Physician</td>
                        <td style={{ padding: '4px 0', fontSize: '9pt', color: '#374151' }}>{labTest.doctorName}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Test Name Header */}
            <div style={{ 
              background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 100%)', 
              color: 'white', 
              padding: '10px 16px',
              marginBottom: '0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '11pt', fontWeight: '600', letterSpacing: '0.5px' }}>
                {labTest.testType}
              </span>
              <span style={{ fontSize: '9pt', opacity: 0.9 }}>
                Panel: {labTest.tests?.length || 0} Test(s)
              </span>
            </div>

            {/* Results Table */}
            {labTest.results && labTest.results.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', border: '1px solid #d1d5db' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '8pt', fontWeight: '600', color: '#374151', borderBottom: '2px solid #d1d5db', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Test Parameter
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '8pt', fontWeight: '600', color: '#374151', borderBottom: '2px solid #d1d5db', textTransform: 'uppercase', letterSpacing: '0.5px', width: '120px' }}>
                      Result
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '8pt', fontWeight: '600', color: '#374151', borderBottom: '2px solid #d1d5db', textTransform: 'uppercase', letterSpacing: '0.5px', width: '80px' }}>
                      Unit
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '8pt', fontWeight: '600', color: '#374151', borderBottom: '2px solid #d1d5db', textTransform: 'uppercase', letterSpacing: '0.5px', width: '140px' }}>
                      Reference Range
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '8pt', fontWeight: '600', color: '#374151', borderBottom: '2px solid #d1d5db', textTransform: 'uppercase', letterSpacing: '0.5px', width: '60px' }}>
                      Flag
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {labTest.results.map((result: any, index: number) => (
                    <tr key={index} style={{ background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '10px 12px', fontSize: '9pt', color: '#1f2937', borderBottom: '1px solid #e5e7eb' }}>
                        {result.testName}
                      </td>
                      <td style={{ 
                        padding: '10px 12px', 
                        textAlign: 'center', 
                        fontSize: '10pt', 
                        fontWeight: '700',
                        color: result.status === 'critical' ? '#dc2626' : result.status === 'abnormal' ? '#ea580c' : '#059669',
                        borderBottom: '1px solid #e5e7eb',
                        background: result.status === 'critical' ? '#fef2f2' : result.status === 'abnormal' ? '#fffbeb' : 'transparent'
                      }}>
                        {result.value}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '9pt', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                        {result.unit || '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '9pt', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                        {result.normalRange || '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '9pt', borderBottom: '1px solid #e5e7eb' }}>
                        {result.status === 'normal' ? (
                          <span style={{ color: '#059669', fontWeight: '500' }}>✓</span>
                        ) : result.status === 'abnormal' ? (
                          <span style={{ color: '#ea580c', fontWeight: '700' }}>H/L</span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '10pt' }}>⚠ C</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Legend */}
            <div style={{ 
              display: 'flex', 
              gap: '24px', 
              fontSize: '8pt', 
              color: '#6b7280',
              padding: '8px 12px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              marginBottom: '20px'
            }}>
              <span><strong style={{ color: '#059669' }}>✓</strong> Normal</span>
              <span><strong style={{ color: '#ea580c' }}>H</strong> High</span>
              <span><strong style={{ color: '#ea580c' }}>L</strong> Low</span>
              <span><strong style={{ color: '#dc2626' }}>⚠ C</strong> Critical - Immediate attention required</span>
            </div>

            {/* Critical Alert */}
            {labTest.isCritical && (
              <div style={{ 
                border: '2px solid #dc2626', 
                background: '#fef2f2',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '20pt' }}>⚠️</span>
                <div>
                  <p style={{ fontSize: '10pt', fontWeight: '700', color: '#dc2626', margin: 0 }}>CRITICAL VALUE ALERT</p>
                  <p style={{ fontSize: '9pt', color: '#7f1d1d', margin: '2px 0 0 0' }}>
                    One or more results require immediate clinical attention. The ordering physician has been notified.
                  </p>
                </div>
              </div>
            )}

            {/* Comments */}
            {(labTest.resultNotes || labTest.notes) && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '9pt', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Comments / Interpretation
                </p>
                <div style={{ padding: '10px 12px', background: '#f9fafb', border: '1px solid #e5e7eb', fontSize: '9pt', color: '#4b5563', lineHeight: '1.5' }}>
                  {labTest.resultNotes || labTest.notes}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginTop: '40px', marginBottom: '30px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #374151', height: '50px', marginBottom: '8px' }}></div>
                <p style={{ fontSize: '9pt', fontWeight: '600', color: '#374151', margin: 0 }}>Medical Technologist</p>
                <p style={{ fontSize: '8pt', color: '#6b7280', margin: '2px 0 0 0' }}>{labTest.technicianName || 'MT License No: _______'}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #374151', height: '50px', marginBottom: '8px' }}></div>
                <p style={{ fontSize: '9pt', fontWeight: '600', color: '#374151', margin: 0 }}>Pathologist</p>
                <p style={{ fontSize: '8pt', color: '#6b7280', margin: '2px 0 0 0' }}>MD, FCAP</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #374151', height: '50px', marginBottom: '8px' }}></div>
                <p style={{ fontSize: '9pt', fontWeight: '600', color: '#374151', margin: 0 }}>Laboratory Director</p>
                <p style={{ fontSize: '8pt', color: '#6b7280', margin: '2px 0 0 0' }}>MD, PhD, DABCC</p>
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '2px solid #1e40af', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '7pt', color: '#6b7280', maxWidth: '60%' }}>
                  <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#374151' }}>Important Information:</p>
                  <p style={{ margin: 0, lineHeight: '1.4' }}>
                    This report is intended for the use of the ordering physician. Results should be interpreted in clinical context. 
                    Reference ranges may vary based on age, sex, and clinical condition. This is an electronically generated report 
                    and is valid without signature when transmitted electronically.
                  </p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '7pt', color: '#6b7280' }}>
                  <p style={{ margin: '0 0 2px 0' }}>Report ID: {labTest.testNumber}</p>
                  <p style={{ margin: '0 0 2px 0' }}>Generated: {new Date().toLocaleString()}</p>
                  <p style={{ margin: '0 0 8px 0' }}>Page 1 of 1</p>
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    border: '1px solid #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '6pt',
                    color: '#9ca3af',
                    marginLeft: 'auto'
                  }}>
                    QR Code
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '7pt', color: '#9ca3af', margin: 0 }}>
                  {hospitalName} Laboratory Services | Accreditation No: LAB-2024-00123 | 
                  For queries: laboratory@{hospitalName.toLowerCase().replace(/\s+/g, '')}.com | (555) 123-4567
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm print:hidden sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 sm:h-10 sm:w-10">
                    <FlaskConical className="h-5 w-5 text-purple-600 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 sm:text-lg">{labTest.testNumber}</h2>
                    <p className="text-xs text-gray-600 sm:text-sm">{labTest.testType}</p>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${getStatusColor(labTest.status)}`}>
                    {t(`lab.statusLabels.${labTest.status}`)}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${getPriorityColor(labTest.priority)}`}>
                    {t(`lab.priorityLabels.${labTest.priority}`)}
                  </span>
                  {labTest.isCritical && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800 sm:text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      {t('lab.criticalValueAlert')}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[10px] uppercase tracking-wide text-gray-500 sm:text-xs">{t('lab.orderedDate')}</p>
                <p className="text-sm font-medium text-gray-900 sm:text-base">{formatDate(labTest.createdAt)}</p>
              </div>
            </div>

            {labTest.status !== 'completed' && labTest.status !== 'cancelled' && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-gray-50 p-2 sm:p-2.5">
                <span className="text-xs font-medium text-gray-700">Quick actions:</span>
                {labTest.status === 'pending' && (
                  <button
                    onClick={() => updateStatus('sample-collected')}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                  >
                    <TestTube className="h-4 w-4" />
                    {t('lab.collectSample')}
                  </button>
                )}
                {labTest.status === 'sample-collected' && (
                  <button
                    onClick={() => updateStatus('in-progress')}
                    className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700"
                  >
                    <FlaskConical className="h-4 w-4" />
                    {t('lab.startProcessing')}
                  </button>
                )}
                {labTest.status === 'in-progress' && (
                  <Link
                    href={`/lab/${params.id}/results`}
                    className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {t('lab.enterResults')}
                  </Link>
                )}
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel this test?')) {
                      updateStatus('cancelled');
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                  {t('lab.cancelTest')}
                </button>
              </div>
            )}

            <div className="mb-3 border-t border-gray-100 pt-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <User className="h-4 w-4 shrink-0 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">{t('lab.patientInformation')}</h3>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                <div>
                  <p className="text-[11px] text-gray-500 sm:text-xs">{t('lab.patient')}</p>
                  <p className="text-sm font-medium text-gray-900 sm:text-base">{labTest.patientName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 sm:text-xs">{t('lab.email')}</p>
                  <p className="text-sm text-gray-900 sm:text-base">{labTest.patientEmail || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 sm:text-xs">{t('lab.phone')}</p>
                  <p className="text-sm text-gray-900 sm:text-base">{labTest.patientPhone || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="mb-3 border-t border-gray-100 pt-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4 shrink-0 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">{t('lab.testInformation')}</h3>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                <div>
                  <p className="text-[11px] text-gray-500 sm:text-xs">{t('lab.testType')}</p>
                  <p className="text-sm font-medium text-gray-900 sm:text-base">{labTest.testType}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 sm:text-xs">{t('lab.testCategory')}</p>
                  <p className="text-sm font-medium text-gray-900 sm:text-base">{t(`lab.categoryLabels.${labTest.testCategory}`)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 sm:text-xs">{t('lab.sampleType')}</p>
                  <p className="text-sm text-gray-900 sm:text-base">{labTest.sampleType || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 sm:text-xs">{t('lab.orderingDoctor')}</p>
                  <p className="text-sm text-gray-900 sm:text-base">{labTest.doctorName}</p>
                </div>
                {labTest.sampleCollectedAt && (
                  <div>
                    <p className="text-[11px] text-gray-500 sm:text-xs">{t('lab.sampleCollectedAt')}</p>
                    <p className="text-sm text-gray-900 sm:text-base">{formatDateTime(labTest.sampleCollectedAt)}</p>
                  </div>
                )}
                {labTest.completedAt && (
                  <div>
                    <p className="text-[11px] text-gray-500 sm:text-xs">{t('lab.completedAt')}</p>
                    <p className="text-sm text-gray-900 sm:text-base">{formatDateTime(labTest.completedAt)}</p>
                  </div>
                )}
              </div>

              {labTest.tests && labTest.tests.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1 text-xs text-gray-500 sm:text-sm">{t('lab.testsToPerform')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {labTest.tests.map((test: string, index: number) => (
                      <span key={index} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
                        {test}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {labTest.results && labTest.results.length > 0 && (
              <div className="mb-3 border-t border-gray-100 pt-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 shrink-0 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">{t('lab.results')}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:px-3 sm:text-xs">{t('lab.testName')}</th>
                        <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:px-3 sm:text-xs">{t('lab.value')}</th>
                        <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:px-3 sm:text-xs">{t('lab.unit')}</th>
                        <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:px-3 sm:text-xs">{t('lab.normalRange')}</th>
                        <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:px-3 sm:text-xs">{t('lab.status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {labTest.results.map((result: any, index: number) => (
                        <tr key={index}>
                          <td className="px-2 py-1.5 text-xs font-medium text-gray-900 sm:px-3 sm:py-2 sm:text-sm">{result.testName}</td>
                          <td className={`px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm ${getResultStatusColor(result.status)}`}>{result.value}</td>
                          <td className="px-2 py-1.5 text-xs text-gray-600 sm:px-3 sm:py-2 sm:text-sm">{result.unit || 'N/A'}</td>
                          <td className="px-2 py-1.5 text-xs text-gray-600 sm:px-3 sm:py-2 sm:text-sm">{result.normalRange || 'N/A'}</td>
                          <td className="px-2 py-1.5 sm:px-3 sm:py-2">
                            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:py-1 sm:text-xs ${
                              result.status === 'normal' ? 'bg-green-100 text-green-800' :
                              result.status === 'abnormal' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {t(`lab.resultStatusLabels.${result.status}`)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {labTest.resultNotes && (
                  <div className="mt-2 rounded-md bg-gray-50 p-2.5 sm:p-3">
                    <p className="mb-0.5 text-xs font-medium text-gray-700 sm:text-sm">{t('lab.additionalNotes')}</p>
                    <p className="text-xs text-gray-600 sm:text-sm">{labTest.resultNotes}</p>
                  </div>
                )}
              </div>
            )}

            {labTest.notes && (
              <div className="border-t border-gray-100 pt-2.5">
                <p className="mb-0.5 text-xs font-medium text-gray-700 sm:text-sm">{t('lab.notes')}</p>
                <p className="text-xs text-gray-600 sm:text-sm">{labTest.notes}</p>
              </div>
            )}
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
