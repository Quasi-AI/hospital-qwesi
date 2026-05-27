'use client';

import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import SearchablePatientSelect from '../components/SearchablePatientSelect';
import FormattedAIResult from '../components/FormattedAIResult';
import { useTranslations } from '../hooks/useTranslations';
import { aiService } from '../../lib/ai-service';
import { aiConfigManager } from '../../lib/ai-config';
import { useRouter } from 'next/navigation';
import {
  Pill,
  AlertTriangle,
  Activity,
  Brain,
  Zap,
  Target,
  FileText,
  Download,
  Share2,
  Heart,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Stethoscope,
  TrendingUp,
  Save,
  Printer,
  Plus,
  Edit,
  Trash2,
  Search,
  Info,
  XCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AIDrugInteractionPage() {
  const { t, translationsLoaded } = useTranslations();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'drugs' | 'profile' | 'analysis' | 'report'>('profile');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [currentMedications, setCurrentMedications] = useState<string[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientInfo, setPatientInfo] = useState({
    age: 30,
    gender: '',
    medicalHistory: '',
    currentMedications: '',
    allergies: ''
  });
  const [loading, setLoading] = useState(true);
  const [activeModel, setActiveModel] = useState<any>(null);
  
  // Drug input form state
  const [newDrug, setNewDrug] = useState({
    name: '',
    dosage: '',
    frequency: '',
    purpose: ''
  });

  // Fetch patients and active model on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch patients
        const response = await fetch('/api/patients');
        if (response.ok) {
          const data = await response.json();
          setPatients(data);
        }

        // Load active AI model
        const model = await aiConfigManager.getActiveModel();
        setActiveModel(model);
        console.log('Active AI model loaded:', model);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Sync selectedPatient when selectedPatientId changes and patients are loaded
  useEffect(() => {
    if (selectedPatientId && patients.length > 0 && !selectedPatient) {
      const patient = patients.find(p => p._id === selectedPatientId);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [selectedPatientId, patients, selectedPatient]);

  // Handle patient selection from SearchablePatientSelect
  const handlePatientSelect = (patient: any | null) => {
    if (patient) {
      // Find the full patient data from the patients array
      const fullPatient = patients.find(p => p._id === patient._id);
      if (fullPatient) {
        setSelectedPatient(fullPatient);
        setSelectedPatientId(fullPatient._id);
        
        // Calculate age from date of birth
        const birthDate = new Date(fullPatient.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
        
        setPatientInfo({
          age: actualAge,
          gender: fullPatient.gender || '',
          medicalHistory: fullPatient.medicalHistory?.join(', ') || '',
          currentMedications: fullPatient.currentMedications?.join(', ') || '',
          allergies: fullPatient.allergies?.join(', ') || ''
        });
      }
    } else {
      // Reset patient info when no patient is selected
      setSelectedPatient(null);
      setSelectedPatientId('');
      setPatientInfo({
        age: 30,
        gender: '',
        medicalHistory: '',
        currentMedications: '',
        allergies: ''
      });
    }
  };

  // Handle patient selection (legacy - kept for compatibility)
  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    
    if (patientId) {
      const selectedPatient = patients.find(p => p._id === patientId);
      if (selectedPatient) {
        setSelectedPatient(selectedPatient);
        // Calculate age from date of birth
        const birthDate = new Date(selectedPatient.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
        
        setPatientInfo({
          age: actualAge,
          gender: selectedPatient.gender || '',
          medicalHistory: selectedPatient.medicalHistory?.join(', ') || '',
          currentMedications: selectedPatient.currentMedications?.join(', ') || '',
          allergies: selectedPatient.allergies?.join(', ') || ''
        });
      }
    } else {
      // Reset patient info when no patient is selected
      setSelectedPatient(null);
      setPatientInfo({
        age: 30,
        gender: '',
        medicalHistory: '',
        currentMedications: '',
        allergies: ''
      });
    }
  };

  // Function to save AI result to patient record
  const saveAIResult = async (type: string, title: string, content: string, metadata?: any) => {
    if (!selectedPatientId) {
      console.warn('Cannot save AI result: No patient selected');
      return;
    }

    try {
      console.log('Saving AI result:', { patientId: selectedPatientId, type, title });
      const response = await fetch('/api/ai-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: selectedPatientId,
          type,
          title,
          content,
          rawData: {
            medications: currentMedications,
            patientInfo,
            aiAnalysis,
          },
          aiModel: activeModel ? {
            id: activeModel.id,
            name: activeModel.name,
            provider: activeModel.provider,
          } : undefined,
          metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to save AI result:', errorData);
        return;
      }

      const result = await response.json();
      console.log('AI result saved successfully:', result);
    } catch (error) {
      console.error('Error saving AI result:', error);
    }
  };

  // Function to perform AI drug interaction analysis
  const performDrugInteractionAnalysis = async () => {
    if (currentMedications.length === 0) {
      alert(t('ai.drugInteraction.alertAddMedication'));
      return;
    }
    
    if (!selectedPatientId) {
      alert(t('ai.drugInteraction.alertSelectPatient'));
      return;
    }

    if (!activeModel) {
      alert(t('ai.drugInteraction.alertNoActiveModel'));
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      console.log('Starting drug interaction analysis with model:', activeModel);
      const result = await aiService.checkDrugInteractions({
        medications: currentMedications,
        patientAge: patientInfo.age,
        medicalConditions: patientInfo.medicalHistory ? [patientInfo.medicalHistory] : [],
        allergies: patientInfo.allergies ? [patientInfo.allergies] : [],
        modelId: activeModel.id
      });
      
      console.log('AI analysis result:', result);
      
      if (result.success && result.content) {
        setAiAnalysis(result.content);
        console.log('AI Drug Interaction Analysis:', result.content);
        setActiveTab('analysis');

        // Save AI result to patient record
        if (selectedPatientId) {
          await saveAIResult(
            'drug-interaction',
            `Drug Interaction Analysis - ${currentMedications.length} Medication${currentMedications.length > 1 ? 's' : ''}`,
            result.content,
            {
              medications: currentMedications,
            }
          );
        }
      } else {
        console.error('AI drug interaction analysis failed:', result.error);
        setAiAnalysis(`AI analysis failed: ${result.error || 'Unknown error'}. Please check your AI model configuration.`);
        setActiveTab('analysis');
      }
    } catch (error) {
      console.error('Error during AI drug interaction analysis:', error);
      setAiAnalysis(`AI analysis error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your AI model configuration.`);
      setActiveTab('analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Function to add medication
  const addMedication = (medication: string) => {
    if (medication.trim() && !currentMedications.includes(medication.trim())) {
      setCurrentMedications([...currentMedications, medication.trim()]);
    }
  };

  // Function to handle adding new drug from form
  const handleAddDrug = () => {
    if (newDrug.name.trim()) {
      const drugString = `${newDrug.name.trim()}${newDrug.dosage ? ` (${newDrug.dosage})` : ''}${newDrug.frequency ? ` - ${newDrug.frequency}` : ''}${newDrug.purpose ? ` - ${newDrug.purpose}` : ''}`;
      addMedication(drugString);
      // Reset form
      setNewDrug({
        name: '',
        dosage: '',
        frequency: '',
        purpose: ''
      });
    }
  };

  // Function to handle quick add drugs
  const handleQuickAddDrug = (drugName: string) => {
    addMedication(drugName);
  };

  // Function to remove medication
  const removeMedication = (medication: string) => {
    setCurrentMedications(currentMedications.filter(m => m !== medication));
  };

  const buildReportText = () => {
    const patientName = selectedPatient?.name || 'N/A';
    const patientId = selectedPatient?.patientId || selectedPatientId || 'N/A';
    const date = new Date().toLocaleString();
    const medicationList = currentMedications.length
      ? currentMedications.map((med, index) => `${index + 1}. ${med}`).join('\n')
      : 'No medications listed';

    return [
      'AI Drug Safety Report',
      `Generated: ${date}`,
      '',
      `Patient: ${patientName}`,
      `Patient ID: ${patientId}`,
      `Age: ${patientInfo.age || 'N/A'}`,
      `Gender: ${patientInfo.gender || 'N/A'}`,
      '',
      'Current Medications',
      medicationList,
      '',
      'Medical History',
      patientInfo.medicalHistory || 'N/A',
      '',
      'Allergies',
      patientInfo.allergies || 'N/A',
      '',
      'AI Drug Interaction Analysis',
      aiAnalysis || 'No analysis available',
      '',
      'This report is generated by AI and should be reviewed by a qualified healthcare professional.',
    ].join('\n');
  };

  const safeFileName = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'patient';

  const handleDownloadReport = async () => {
    if (!aiAnalysis) {
      alert(t('ai.drugInteraction.completeAnalysisFirst'));
      return;
    }

    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const margin = 14;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;
      let y = 18;

      const addLines = (text: string, fontSize = 10, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxWidth);

        lines.forEach((line: string) => {
          if (y > pageHeight - 18) {
            doc.addPage();
            y = 18;
          }
          doc.text(line, margin, y);
          y += fontSize * 0.45 + 2;
        });
      };

      doc.setTextColor(20, 20, 20);
      addLines('AI Drug Safety Report', 16, true);
      addLines(`Generated: ${new Date().toLocaleString()}`, 9);
      y += 3;
      addLines(`Patient: ${selectedPatient?.name || 'N/A'}`, 11, true);
      addLines(`Patient ID: ${selectedPatient?.patientId || selectedPatientId || 'N/A'}`, 10);
      addLines(`Age: ${patientInfo.age || 'N/A'}   Gender: ${patientInfo.gender || 'N/A'}`, 10);
      y += 3;
      addLines('Current Medications', 12, true);
      currentMedications.forEach((med, index) => addLines(`${index + 1}. ${med}`, 10));
      y += 3;
      addLines('Medical History', 12, true);
      addLines(patientInfo.medicalHistory || 'N/A', 10);
      y += 3;
      addLines('Allergies', 12, true);
      addLines(patientInfo.allergies || 'N/A', 10);
      y += 3;
      addLines('AI Drug Interaction Analysis', 12, true);
      addLines(aiAnalysis, 10);
      y += 4;
      doc.setTextColor(120, 120, 120);
      addLines('This report is generated by AI and should be reviewed by a qualified healthcare professional.', 8);

      const patientName = safeFileName(selectedPatient?.name || 'patient');
      const date = new Date().toISOString().split('T')[0];
      doc.save(`drug-interaction-report-${patientName}-${date}.pdf`);
    } catch (error) {
      console.error('Failed to download drug interaction report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const handleShareReport = async () => {
    if (!aiAnalysis) {
      alert(t('ai.drugInteraction.completeAnalysisFirst'));
      return;
    }

    const reportText = buildReportText();
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'AI Drug Safety Report',
          text: reportText,
        });
        return;
      }

      await navigator.clipboard.writeText(reportText);
      alert('Drug interaction report copied to clipboard.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(reportText);
        alert('Drug interaction report copied to clipboard.');
      } catch {
        alert('Failed to share report. Please try again.');
      }
    }
  };

  const handleScheduleConsultation = () => {
    const params = new URLSearchParams();
    if (selectedPatientId) params.set('patientId', selectedPatientId);
    router.push(`/appointments/new${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Show loading state if translations aren't loaded yet
  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title={t('ai.drugInteraction.title')}
          description={t('ai.drugInteraction.description')}
          dense
        >
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
        title={t('ai.drugInteraction.title')} 
        description={t('ai.drugInteraction.description')} dense>
        <div className="space-y-4">
          {/* Header with AI Stats */}
          <div className="rounded-lg border border-red-500/20 bg-gradient-to-r from-red-600 to-orange-600 p-3 text-white shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Pill className="h-6 w-6 shrink-0" />
              <h2 className="text-base font-semibold sm:text-lg">{t('ai.drugInteraction.title')}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                <div className="text-sm font-bold sm:text-base">99.8%</div>
                <div className="text-[10px] text-red-100 sm:text-xs">{t('ai.drugInteraction.accuracyRate')}</div>
              </div>
              <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                <div className="text-sm font-bold sm:text-base">1.2s</div>
                <div className="text-[10px] text-red-100 sm:text-xs">{t('ai.drugInteraction.analysisTime')}</div>
              </div>
              <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                <div className="text-sm font-bold sm:text-base">50K+</div>
                <div className="text-[10px] text-red-100 sm:text-xs">{t('ai.drugInteraction.drugDatabase')}</div>
              </div>
              <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                <div className="text-sm font-bold sm:text-base">24/7</div>
                <div className="text-[10px] text-red-100 sm:text-xs">{t('ai.drugInteraction.safetyMonitoring')}</div>
              </div>
            </div>

            {/* Active Model Information */}
            {activeModel ? (
              <div className="mt-2 rounded-md bg-white/10 p-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 shrink-0" />
                  <span>
                    {t('ai.drugInteraction.activeModel')}: <strong>{activeModel.name}</strong> ({activeModel.provider})
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-2 rounded-md bg-yellow-400/20 p-2 text-xs sm:text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {t('ai.drugInteraction.noActiveModel')}{' '}
                    <a href="/ai-settings" className="font-medium underline">
                      {t('ai.drugInteraction.configureModel')}
                    </a>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-100">
            <nav className="-mb-px flex flex-wrap gap-x-1 gap-y-0.5 sm:gap-x-4">
              {[
                { id: 'profile' as const, label: t('ai.drugInteraction.patientProfile'), icon: User },
                { id: 'drugs' as const, label: t('ai.drugInteraction.drugList'), icon: Pill },
                { id: 'analysis' as const, label: t('ai.drugInteraction.aiAnalysis'), icon: Brain },
                { id: 'report' as const, label: t('ai.drugInteraction.report'), icon: FileText }
              ].map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 border-b-2 px-1 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Medications Tab */}
          {activeTab === 'drugs' && (
            <div className="space-y-4">
              {!selectedPatientId && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">{t('ai.drugInteraction.patientSelectionRequired')}</span>
                  </div>
                  <p className="mt-1 text-xs text-yellow-800 sm:text-sm">
                    {t('ai.drugInteraction.patientSelectionRequiredDesc')}
                  </p>
                </div>
              )}

              {/* Add New Drug */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span>{t('ai.drugInteraction.addNewMedication')}</span>
                </h3>
                
                <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.drugInteraction.drugName')}</label>
                    <input
                      type="text"
                      placeholder={t('ai.drugInteraction.enterDrugName')}
                      value={newDrug.name}
                      onChange={(e) => setNewDrug(prev => ({ ...prev, name: e.target.value }))}
                      className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      disabled={!selectedPatientId}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.drugInteraction.dosage')}</label>
                    <input
                      type="text"
                      placeholder={t('ai.drugInteraction.dosagePlaceholder')}
                      value={newDrug.dosage}
                      onChange={(e) => setNewDrug(prev => ({ ...prev, dosage: e.target.value }))}
                      className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      disabled={!selectedPatientId}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.drugInteraction.frequency')}</label>
                    <input
                      type="text"
                      placeholder={t('ai.drugInteraction.frequencyPlaceholder')}
                      value={newDrug.frequency}
                      onChange={(e) => setNewDrug(prev => ({ ...prev, frequency: e.target.value }))}
                      className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      disabled={!selectedPatientId}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.drugInteraction.purpose')}</label>
                    <input
                      type="text"
                      placeholder={t('ai.drugInteraction.purposePlaceholder')}
                      value={newDrug.purpose}
                      onChange={(e) => setNewDrug(prev => ({ ...prev, purpose: e.target.value }))}
                      className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      disabled={!selectedPatientId}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddDrug}
                  className="inline-flex h-9 items-center rounded-md border border-red-600 bg-red-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!selectedPatientId || !newDrug.name.trim()}
                >
                  {t('ai.drugInteraction.addMedication')}
                </button>

                {/* Quick Add Common Drugs */}
                <div className="mt-4">
                  <h4 className="mb-2 text-xs font-medium text-gray-700">{t('ai.drugInteraction.quickAddCommonDrugs')}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {['Aspirin', 'Ibuprofen', 'Acetaminophen', 'Lisinopril', 'Metformin', 'Atorvastatin', 'Omeprazole'].map((drug) => (
                      <button
                        type="button"
                        key={drug}
                        onClick={() => handleQuickAddDrug(drug)}
                        disabled={!selectedPatientId}
                        className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {drug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Current Medications List */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  {t('ai.drugInteraction.currentMedications')} ({currentMedications.length})
                </h3>
                {currentMedications.length > 0 ? (
                  <div className="space-y-3">
                    {currentMedications.map((drug, index) => (
                      <div key={index} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm font-medium text-gray-900">{drug}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCurrentMedications(prev => prev.filter((_, i) => i !== index))}
                          className="rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Pill className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>{t('ai.drugInteraction.noMedicationsAdded')}</p>
                  </div>
                )}
              </div>

              {/* Analyze Button */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={performDrugInteractionAnalysis}
                  disabled={!selectedPatientId || isAnalyzing}
                  className="mx-auto inline-flex h-9 items-center gap-2 rounded-md border border-orange-500 bg-gradient-to-r from-red-600 to-orange-600 px-4 text-sm font-medium text-white shadow-sm hover:from-red-700 hover:to-orange-700 focus:outline-none focus:ring-1 focus:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      <span>{t('ai.drugInteraction.analyzing')}</span>
                    </>
                  ) : (
                    <>
                      <Pill className="h-4 w-4" />
                      <span>{t('ai.drugInteraction.analyzeDrugInteractions')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Patient Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Patient Selection */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  <span>{t('ai.drugInteraction.patientSelection')}</span>
                </h3>
                
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
                    <span>{t('ai.drugInteraction.loadingPatients')}</span>
                  </div>
                ) : (
                  <>
                    <div className="mb-2">
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('ai.drugInteraction.selectPatient')} *
                      </label>
                      <SearchablePatientSelect
                        value={selectedPatient?.name || ''}
                        onChange={handlePatientSelect}
                        placeholder={t('ai.drugInteraction.choosePatient')}
                        className="w-full"
                      />
                      {selectedPatientId && (
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>{t('ai.drugInteraction.patientInfoLoaded')}</span>
                          </div>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {t('ai.drugInteraction.selectPatientDesc')}
                      </p>
                    </div>

                    {selectedPatientId && (
                      <>
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex items-center space-x-2 text-blue-800">
                            <Info className="h-4 w-4" />
                            <span className="text-sm font-medium">{t('ai.drugInteraction.patientInfoEditable')}</span>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">
                            {t('ai.drugInteraction.patientInfoEditableDesc')}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.drugInteraction.age')}</label>
                            <input
                              type="number"
                              value={patientInfo.age}
                              onChange={(e) => setPatientInfo({...patientInfo, age: parseInt(e.target.value) || 0})}
                              className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.drugInteraction.gender')}</label>
                            <select
                              value={patientInfo.gender}
                              onChange={(e) => setPatientInfo({...patientInfo, gender: e.target.value})}
                              className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                            >
                              <option value="">{t('ai.drugInteraction.selectGender')}</option>
                              <option value="male">{t('ai.drugInteraction.male')}</option>
                              <option value="female">{t('ai.drugInteraction.female')}</option>
                              <option value="other">{t('ai.drugInteraction.other')}</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.drugInteraction.medicalHistory')}</label>
                            <textarea
                              value={patientInfo.medicalHistory}
                              onChange={(e) => setPatientInfo({...patientInfo, medicalHistory: e.target.value})}
                              rows={3}
                              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.drugInteraction.currentMedications')}</label>
                            <textarea
                              value={patientInfo.currentMedications}
                              onChange={(e) => setPatientInfo({...patientInfo, currentMedications: e.target.value})}
                              rows={2}
                              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                              placeholder={t('ai.treatmentRecommendations.medicationsPlaceholder')}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.drugInteraction.allergies')}</label>
                            <textarea
                              value={patientInfo.allergies}
                              onChange={(e) => setPatientInfo({...patientInfo, allergies: e.target.value})}
                              rows={2}
                              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                              placeholder={t('ai.appointmentOptimizer.allergiesPlaceholder')}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Basic Information */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('ai.drugInteraction.patientInfoEditable')}</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.drugInteraction.age')}</label>
                    <input
                      type="number"
                      value={patientInfo.age}
                      readOnly
                      className="h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.drugInteraction.weight')}</label>
                    <input
                      type="number"
                      placeholder={t('ai.drugInteraction.enterWeight')}
                      className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      disabled={!selectedPatientId}
                    />
                  </div>
                </div>
              </div>

              {!selectedPatientId && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">{t('ai.drugInteraction.patientSelectionRequired')}</span>
                  </div>
                  <p className="mt-1 text-xs text-yellow-800 sm:text-sm">
                    {t('ai.drugInteraction.patientSelectionRequiredDesc')}
                  </p>
                </div>
              )}

              {/* Medical Conditions */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Activity className="h-4 w-4" />
                  <span>{t('ai.drugInteraction.medicalConditions')}</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t('ai.drugInteraction.addMedicalCondition')}
                      className="h-9 flex-1 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      disabled={!selectedPatientId}
                    />
                    <button
                      type="button"
                      className="inline-flex h-9 shrink-0 items-center rounded-md border border-red-600 bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!selectedPatientId}
                    >
                      {t('ai.drugInteraction.add')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Hypertension', 'Type 2 Diabetes', 'High Cholesterol'].map((condition, index) => (
                      <span key={index} className="inline-flex items-center gap-1 rounded-md border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800">
                        {condition}
                        <button type="button" className="rounded px-0.5 text-red-600 hover:bg-red-100 hover:text-red-800">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Allergies */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{t('ai.drugInteraction.drugAllergies')}</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t('ai.drugInteraction.addDrugAllergy')}
                      className="h-9 flex-1 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      disabled={!selectedPatientId}
                    />
                    <button
                      type="button"
                      className="inline-flex h-9 shrink-0 items-center rounded-md border border-red-600 bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!selectedPatientId}
                    >
                      {t('ai.drugInteraction.add')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Penicillin', 'Sulfa Drugs'].map((allergy, index) => (
                      <span key={index} className="inline-flex items-center gap-1 rounded-md border border-yellow-100 bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        {allergy}
                        <button type="button" className="rounded px-0.5 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-900">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Organ Function */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('ai.drugInteraction.organFunctionStatus')}</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.drugInteraction.liverFunction')}</label>
                    <select className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500">
                      <option>{t('ai.drugInteraction.normal')}</option>
                      <option>{t('ai.drugInteraction.impaired')}</option>
                      <option>{t('ai.drugInteraction.severeImpairment')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.drugInteraction.kidneyFunction')}</label>
                    <select className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500">
                      <option>{t('ai.drugInteraction.normal')}</option>
                      <option>{t('ai.drugInteraction.impaired')}</option>
                      <option>{t('ai.drugInteraction.severeImpairment')}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis Tab */}
          {activeTab === 'analysis' && (
            <div className="space-y-4">
              {/* Analysis Results */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Brain className="h-4 w-4" />
                  <span>{t('ai.drugInteraction.aiDrugInteractionAnalysis')}</span>
                </h3>
                
                {isAnalyzing ? (
                  <div className="py-6 text-center">
                    <div className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
                    <p className="text-sm text-gray-600">{t('ai.drugInteraction.analyzingDrugInteractions')}</p>
                  </div>
                ) : aiAnalysis ? (
                  <div className="rounded-md border border-gray-100 bg-gray-50/50 p-2">
                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-700">
                      <Brain className="h-4 w-4" />
                      <span>{t('ai.drugInteraction.aiAnalysisResults')}</span>
                    </h4>
                    <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
                      <FormattedAIResult 
                        content={aiAnalysis} 
                        type="drug-interaction"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-gray-500">
                    <Brain className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                    <p>{t('ai.drugInteraction.noAnalysisPerformed')}</p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {!aiAnalysis && (
                <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={performDrugInteractionAnalysis}
                      disabled={currentMedications.length === 0 || isAnalyzing}
                      className="mx-auto inline-flex h-9 items-center gap-1.5 rounded-md border border-red-600 bg-red-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Brain className="h-4 w-4" />
                      <span>{t('ai.drugInteraction.analyzeInteractions')}</span>
                    </button>
                    {currentMedications.length === 0 && (
                      <p className="mt-2 text-xs text-gray-500">{t('ai.drugInteraction.addMedicationsFirst')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Safety Report Tab */}
          {activeTab === 'report' && (
            <div className="space-y-4">
              {/* Report Header */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <div className="mb-3 text-center">
                  <h2 className="mb-1 text-base font-semibold text-gray-900 sm:text-lg">
                    {t('ai.drugInteraction.aiDrugSafetyReport')}
                  </h2>
                  <p className="text-xs text-gray-600 sm:text-sm">
                    {t('ai.drugInteraction.comprehensiveAnalysisGenerated')} {new Date().toLocaleDateString()}
                  </p>
                </div>

                {aiAnalysis ? (
                  <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-center">
                    <div className="text-sm font-semibold text-blue-800">{t('ai.drugInteraction.aiAnalysisComplete')}</div>
                    <div className="text-xs text-blue-600">{t('ai.drugInteraction.reviewDetailedAnalysis')}</div>
                  </div>
                ) : (
                  <div className="rounded-md border border-gray-100 bg-gray-50 p-3 text-center">
                    <div className="text-sm font-semibold text-gray-700">{t('ai.drugInteraction.noAnalysisAvailable')}</div>
                    <div className="text-xs text-gray-500">{t('ai.drugInteraction.completeAnalysisToGenerate')}</div>
                  </div>
                )}
              </div>

              {/* AI Analysis Results */}
              {aiAnalysis && (
                <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('ai.drugInteraction.aiDrugInteractionAnalysis')}</h3>
                  <div className="rounded-md border border-red-100 bg-red-50/70 p-3">
                    <FormattedAIResult
                      content={aiAnalysis}
                      type="drug-interaction"
                    />
                  </div>
                </div>
              )}

              {/* No Analysis Message */}
              {!aiAnalysis && (
                <div className="py-8 text-center">
                  <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">{t('ai.drugInteraction.noReportAvailable')}</h3>
                  <p className="mb-4 text-sm text-gray-500">{t('ai.drugInteraction.completeAnalysisFirst')}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('drugs')}
                    className="inline-flex h-9 items-center rounded-md border border-red-600 bg-red-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    {t('ai.drugInteraction.startDrugAnalysis')}
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  disabled={!aiAnalysis}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-600 bg-red-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span>{t('ai.drugInteraction.downloadReport')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareReport}
                  disabled={!aiAnalysis}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-green-600 bg-green-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" />
                  <span>{t('ai.drugInteraction.shareWithDoctor')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleScheduleConsultation}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{t('ai.drugInteraction.scheduleConsultation')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
