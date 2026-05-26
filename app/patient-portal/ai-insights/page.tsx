'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from '../../hooks/useTranslations';
import { 
  Brain,
  Pill,
  Camera,
  Calendar,
  Shield,
  Activity,
  Stethoscope,
  Mic,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface AIInsight {
  _id: string;
  patientId: string;
  type: 'treatment-plan' | 'drug-interaction' | 'image-analysis' | 'appointment-optimizer' | 'risk-assessment' | 'symptom-analysis' | 'prescription' | 'voice-transcription';
  title: string;
  content: string;
  aiModel?: {
    id: string;
    name: string;
    provider: string;
  };
  metadata?: {
    symptoms?: string[];
    diagnosis?: string;
    medications?: string[];
    imageType?: string;
    riskFactors?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export default function PatientAIInsightsPage() {
  const { data: session } = useSession();
  const { t } = useTranslations();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch('/api/patient-portal/ai-insights');
        const data = await res.json();
        setInsights(data.aiInsights || []);
      } catch (error) {
        console.error('Error fetching AI insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'treatment-plan': return Stethoscope;
      case 'drug-interaction': return Pill;
      case 'image-analysis': return Camera;
      case 'appointment-optimizer': return Calendar;
      case 'risk-assessment': return Shield;
      case 'symptom-analysis': return Activity;
      case 'prescription': return Pill;
      case 'voice-transcription': return Mic;
      default: return Brain;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'treatment-plan': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'drug-interaction': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'image-analysis': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'appointment-optimizer': return 'bg-green-100 text-green-700 border-green-200';
      case 'risk-assessment': return 'bg-red-100 text-red-700 border-red-200';
      case 'symptom-analysis': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'prescription': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'voice-transcription': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedInsights(newExpanded);
  };

  const filteredInsights = insights.filter(insight => {
    // Filter by type
    if (filter !== 'all' && insight.type !== filter) return false;
    
    // Filter by search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        insight.title.toLowerCase().includes(search) ||
        insight.content.toLowerCase().includes(search) ||
        insight.type.toLowerCase().includes(search)
      );
    }
    
    return true;
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
      <div className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t('patientPortal.aiInsights.title')}</h1>
            <p className="mt-0.5 text-sm text-purple-100">{t('patientPortal.aiInsights.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-xs text-gray-500 sm:text-sm">{t('patientPortal.aiInsights.totalInsights')}</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900">{insights.length}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-xs text-gray-500 sm:text-sm">{t('patientPortal.aiInsights.treatmentPlans')}</p>
          <p className="mt-0.5 text-xl font-bold text-blue-600">
            {insights.filter(i => i.type === 'treatment-plan').length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-xs text-gray-500 sm:text-sm">{t('patientPortal.aiInsights.riskAssessments')}</p>
          <p className="mt-0.5 text-xl font-bold text-red-600">
            {insights.filter(i => i.type === 'risk-assessment').length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="text-xs text-gray-500 sm:text-sm">{t('patientPortal.aiInsights.imageAnalyses')}</p>
          <p className="mt-0.5 text-xl font-bold text-cyan-600">
            {insights.filter(i => i.type === 'image-analysis').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('patientPortal.aiInsights.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">{t('patientPortal.aiInsights.filter.all')}</option>
          <option value="treatment-plan">{t('patientPortal.aiInsights.filter.treatmentPlan')}</option>
          <option value="drug-interaction">{t('patientPortal.aiInsights.filter.drugInteraction')}</option>
          <option value="image-analysis">{t('patientPortal.aiInsights.filter.imageAnalysis')}</option>
          <option value="risk-assessment">{t('patientPortal.aiInsights.filter.riskAssessment')}</option>
          <option value="symptom-analysis">{t('patientPortal.aiInsights.filter.symptomAnalysis')}</option>
        </select>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {filteredInsights.length > 0 ? (
          filteredInsights.map((insight) => {
            const Icon = getTypeIcon(insight.type);
            const isExpanded = expandedInsights.has(insight._id);
            
            return (
              <div
                key={insight._id}
                className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="p-3 sm:p-4">
                  {/* Header */}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getTypeColor(insight.type)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 sm:text-base">{insight.title}</h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(insight.type)}`}>
                            {getTypeLabel(insight.type)}
                          </span>
                          {insight.aiModel && (
                            <span className="text-xs">
                              <Brain className="h-3 w-3 inline mr-1" />
                              {insight.aiModel.name}
                            </span>
                          )}
                          <span className="text-xs">{formatDate(insight.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(insight._id)}
                      className="shrink-0 rounded-md p-1 transition-colors hover:bg-gray-100"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>

                  {/* Metadata Pills */}
                  {insight.metadata && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {insight.metadata.symptoms && insight.metadata.symptoms.length > 0 && (
                        <div className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                          {t('patientPortal.aiInsights.symptoms')}: {insight.metadata.symptoms.join(', ')}
                        </div>
                      )}
                      {insight.metadata.diagnosis && (
                        <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                          {t('patientPortal.aiInsights.diagnosis')}: {insight.metadata.diagnosis}
                        </div>
                      )}
                      {insight.metadata.medications && insight.metadata.medications.length > 0 && (
                        <div className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                          {t('patientPortal.aiInsights.medications')}: {insight.metadata.medications.length}
                        </div>
                      )}
                      {insight.metadata.riskFactors && insight.metadata.riskFactors.length > 0 && (
                        <div className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
                          {t('patientPortal.aiInsights.riskFactors')}: {insight.metadata.riskFactors.length}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Preview/Full */}
                  <div className={`prose prose-sm max-w-none ${!isExpanded ? 'line-clamp-3' : ''}`}>
                    <div 
                      className="text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: insight.content.replace(/\n/g, '<br/>') }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-gray-100 bg-white py-8 text-center">
            <Sparkles className="mx-auto mb-2 h-12 w-12 text-gray-300" />
            <h3 className="text-base font-medium text-gray-900">{t('patientPortal.aiInsights.noInsights')}</h3>
            <p className="mt-0.5 text-sm text-gray-500">{t('patientPortal.aiInsights.noInsightsDesc')}</p>
          </div>
        )}
      </div>

      {/* Info Notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex gap-2">
          <Brain className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">{t('patientPortal.aiInsights.infoTitle')}</h4>
            <p className="mt-0.5 text-xs text-blue-700 sm:text-sm">
              {t('patientPortal.aiInsights.infoText')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
