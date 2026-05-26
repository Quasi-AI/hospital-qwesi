'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from '../../hooks/useTranslations';
import { 
  Pill,
  Calendar,
  AlertTriangle,
  Search,
  Brain,
  Sparkles,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Report {
  _id: string;
  doctorName: string;
  reportDate: string;
  reportType: string;
  status: string;
  findings: string;
  diagnosis: string;
  recommendations: string;
  notes?: string;
  source: 'report';
}

interface AIResult {
  _id: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
  aiModel?: {
    name: string;
    provider: string;
  };
  metadata?: {
    diagnosis?: string;
    medications?: string[];
  };
  source: 'ai';
}

type Prescription = Report | AIResult;

export default function PatientPrescriptionsPage() {
  const { data: session } = useSession();
  const { t } = useTranslations();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        // Fetch both treatment reports and AI prescriptions
        const [reportsRes, aiInsightsRes] = await Promise.all([
          fetch('/api/patient-portal/reports'),
          fetch('/api/patient-portal/ai-insights')
        ]);
        
        const reportsData = await reportsRes.json();
        const aiData = await aiInsightsRes.json();
        
        // Filter treatment reports
        const treatmentReports: Prescription[] = (reportsData.reports || [])
          .filter((r: Report) => r.reportType === 'treatment')
          .map((r: Report) => ({ ...r, source: 'report' as const }));
        
        // Filter only AI prescriptions (not treatment plans)
        const aiPrescriptions: Prescription[] = (aiData.aiInsights || [])
          .filter((ai: AIResult) => ai.type === 'prescription')
          .map((ai: AIResult) => ({ ...ai, source: 'ai' as const }));
        
        // Combine and sort by date
        const combined = [...treatmentReports, ...aiPrescriptions].sort((a, b) => {
          const dateA = new Date('source' in a && a.source === 'report' ? a.reportDate : a.createdAt);
          const dateB = new Date('source' in b && b.source === 'report' ? b.reportDate : b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        setPrescriptions(combined);
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isReport = (prescription: Prescription): prescription is Report => {
    return prescription.source === 'report';
  };

  const isAIResult = (prescription: Prescription): prescription is AIResult => {
    return prescription.source === 'ai';
  };

  const filteredPrescriptions = prescriptions.filter(p => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    
    if (isReport(p)) {
      return (
        p.doctorName.toLowerCase().includes(search) ||
        p.recommendations.toLowerCase().includes(search) ||
        p.diagnosis.toLowerCase().includes(search)
      );
    } else {
      return (
        p.title.toLowerCase().includes(search) ||
        p.content.toLowerCase().includes(search)
      );
    }
  });

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-teal-600" />
          <p className="mt-2 text-sm text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('patientPortal.prescriptions.title')}</h1>
        <p className="mt-0.5 text-sm text-gray-600">{t('patientPortal.prescriptions.subtitle')}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={t('patientPortal.prescriptions.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Prescriptions Table */}
      {filteredPrescriptions.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    {t('patientPortal.prescriptions.diagnosis')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Prescribed By
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Date
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPrescriptions.map((prescription) => (
                  <tr key={prescription._id} className="transition-colors hover:bg-gray-50">
                    {/* Type */}
                    <td className="whitespace-nowrap px-3 py-2 sm:px-4">
                      <div className="flex items-center gap-2">
                        {isAIResult(prescription) ? (
                          <>
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Brain className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              AI
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Pill className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="text-sm text-gray-700">Manual</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Diagnosis */}
                    <td className="px-3 py-2 sm:px-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {isReport(prescription) ? prescription.diagnosis : 
                         isAIResult(prescription) && prescription.metadata?.diagnosis ? prescription.metadata.diagnosis :
                         isAIResult(prescription) ? prescription.title : '-'}
                      </div>
                    </td>

                    {/* Prescribed By */}
                    <td className="whitespace-nowrap px-3 py-2 sm:px-4">
                      <div className="text-sm text-gray-900">
                        {isReport(prescription) ? prescription.doctorName : 
                         isAIResult(prescription) && prescription.aiModel ? prescription.aiModel.name : 'AI System'}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="whitespace-nowrap px-3 py-2 sm:px-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        {formatDate(isReport(prescription) ? prescription.reportDate : prescription.createdAt)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap px-3 py-2 text-center sm:px-4">
                      <button
                        onClick={() => setSelectedPrescription(prescription)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 bg-white py-8 text-center">
          <Pill className="mx-auto mb-2 h-12 w-12 text-gray-300" />
          <h3 className="text-base font-medium text-gray-900">{t('patientPortal.prescriptions.noPrescriptions')}</h3>
          <p className="mt-0.5 text-sm text-gray-500">{t('patientPortal.prescriptions.noPrescriptionsDesc')}</p>
        </div>
      )}

      {/* Warning */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <h4 className="text-sm font-medium text-amber-800">{t('patientPortal.prescriptions.warningTitle')}</h4>
            <p className="mt-0.5 text-xs text-amber-700 sm:text-sm">
              {t('patientPortal.prescriptions.warningText')}
            </p>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => setSelectedPrescription(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 border-b border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {isAIResult(selectedPrescription) ? (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                      <Brain className="h-5 w-5 text-purple-600" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
                      <Pill className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-gray-900">
                      {isAIResult(selectedPrescription) ? selectedPrescription.title : t('patientPortal.prescriptions.treatmentPlan')}
                    </h2>
                    {isAIResult(selectedPrescription) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full mt-1">
                        <Sparkles className="h-3 w-3" />
                        AI Generated
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPrescription(null)}
                  className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="space-y-4 p-4">
              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Prescribed By</p>
                  <p className="font-medium text-gray-900">
                    {isReport(selectedPrescription) ? selectedPrescription.doctorName : 
                     isAIResult(selectedPrescription) && selectedPrescription.aiModel ? selectedPrescription.aiModel.name : 'AI System'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(isReport(selectedPrescription) ? selectedPrescription.reportDate : selectedPrescription.createdAt)}
                  </p>
                </div>
              </div>

              {/* Diagnosis */}
              {((isReport(selectedPrescription) && selectedPrescription.diagnosis) || 
                (isAIResult(selectedPrescription) && selectedPrescription.metadata?.diagnosis)) && (
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold text-gray-900 sm:text-sm">{t('patientPortal.prescriptions.diagnosis')}</h3>
                  <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
                    <p className="text-gray-700">
                      {isReport(selectedPrescription) ? selectedPrescription.diagnosis : selectedPrescription.metadata?.diagnosis}
                    </p>
                  </div>
                </div>
              )}

              {/* Medications */}
              <div>
                <h3 className="mb-1.5 text-xs font-semibold text-gray-900 sm:text-sm">{t('patientPortal.prescriptions.medications')}</h3>
                <div className={`rounded-md border p-3 ${
                  isAIResult(selectedPrescription) 
                    ? 'bg-purple-50 border-purple-100' 
                    : 'bg-green-50 border-green-100'
                }`}>
                  {isReport(selectedPrescription) ? (
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedPrescription.recommendations}</p>
                  ) : (
                    <div className="text-gray-900 whitespace-pre-wrap"
                         dangerouslySetInnerHTML={{ __html: selectedPrescription.content.replace(/\n/g, '<br/>') }}
                    />
                  )}
                </div>
              </div>

              {/* Medication List (for AI results) */}
              {isAIResult(selectedPrescription) && selectedPrescription.metadata?.medications && selectedPrescription.metadata.medications.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold text-gray-900 sm:text-sm">Medication List:</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPrescription.metadata.medications.map((med, idx) => (
                      <span key={idx} className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 sm:text-sm">
                        {med}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {isReport(selectedPrescription) && selectedPrescription.notes && (
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold text-gray-900 sm:text-sm">{t('patientPortal.prescriptions.instructions')}</h3>
                  <div className="rounded-md border border-yellow-100 bg-yellow-50 p-3">
                    <p className="text-gray-700">{selectedPrescription.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


