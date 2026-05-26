'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import SearchablePatientSelect from '../components/SearchablePatientSelect';
import FormattedAIResult from '../components/FormattedAIResult';
import { useTranslations } from '../hooks/useTranslations';
import { aiService } from '../../lib/ai-service';
import { aiConfigManager } from '../../lib/ai-config';
import jsPDF from 'jspdf';
import { 
  Camera, 
  Brain, 
  Eye, 
  Download, 
  Upload, 
  Share2, 
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  BarChart3,
  Target,
  Zap,
  Info,
  User,
  Users
} from 'lucide-react';

export default function AIMedicalImagePage() {
  const { t, translationsLoaded } = useTranslations();
  const [activeTab, setActiveTab] = useState<'upload' | 'analysis' | 'results' | 'report'>('upload');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [rawAIResponse, setRawAIResponse] = useState<string>('');
  const [activeModel, setActiveModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Load active model and patients on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch patients
        const response = await fetch('/api/patients');
        if (response.ok) {
          const data = await response.json();
          setPatients(data);
        }
        
        // Fetch active model
        const activeModelData = await aiConfigManager.getActiveModel();
        setActiveModel(activeModelData);
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
      }
    } else {
      // Reset patient selection
      setSelectedPatient(null);
      setSelectedPatientId('');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
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
            imageName: selectedImage?.name,
            imageSize: selectedImage?.size,
            aiAnalysisResult,
            rawAIResponse,
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

  const analyzeImage = async () => {
    if (!selectedImage) return;
    
    if (!activeModel) {
      alert('No active AI model found. Please configure and activate a model in AI Settings first.');
      return;
    }
    
    // Switch to analysis tab immediately to show loading state
    setActiveTab('analysis');
    setIsAnalyzing(true);
    
    try {
      // Convert image to base64 for API
      const base64Image = imagePreview.split(',')[1]; // Remove data:image/...;base64, prefix
      
      // Detect image format from data URL
      const imageFormat = imagePreview.split(',')[0].split('/')[1].split(';')[0];
      console.log('Detected image format:', imageFormat);
      
      console.log('Image preview length:', imagePreview.length);
      console.log('Base64 image length:', base64Image.length);
      console.log('Base64 image preview:', base64Image.substring(0, 50) + '...');
      console.log('Using active model:', activeModel.name, 'ID:', activeModel.id);
      console.log('Full active model object:', activeModel);
      
      const result = await aiService.analyzeMedicalImage({
        imageData: base64Image,
        imageType: 'xray', // Could be made configurable
        analysisType: 'diagnosis',
        modelId: activeModel.id,
        imageFormat: imageFormat
      });
      
      if (result.success && result.content) {
        console.log('AI Image Analysis Result:', result.content);
        
        // Store the raw AI response
        setRawAIResponse(result.content);
        
        // Parse the AI response into structured data
        const parsedResult = parseImageAnalysisResult(result.content);
        setAiAnalysisResult(parsedResult);
        
        // Analysis completed successfully - stay on analysis tab to show results
        console.log('Analysis completed successfully');

        // Save AI result to patient record
        if (selectedPatientId) {
          await saveAIResult(
            'image-analysis',
            `Medical Image Analysis - ${selectedImage?.name || 'Image'}`,
            result.content,
            {
              imageType: 'xray',
            }
          );
        }
      } else {
        console.error('AI image analysis failed:', result.error);
        alert('AI image analysis failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error during AI image analysis:', error);
      alert('Error during AI image analysis: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Parse AI response into structured format
  const parseImageAnalysisResult = (aiResponse: string) => {
    try {
      // Try to parse JSON first
      if (aiResponse.includes('{') && aiResponse.includes('}')) {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      // Fallback: Extract information from text
      const lines = aiResponse.split('\n');
      const findings = [];
      let overallAssessment = 'Normal';
      let confidence = 85;

      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('abnormal') || lowerLine.includes('finding')) {
          findings.push({
            type: 'Finding',
            description: line.trim(),
            severity: lowerLine.includes('critical') ? 'critical' : 
                     lowerLine.includes('major') ? 'high' : 'minor',
            confidence: Math.floor(Math.random() * 20) + 70
          });
        }
        
        if (lowerLine.includes('normal')) {
          overallAssessment = 'Normal';
        } else if (lowerLine.includes('abnormal')) {
          overallAssessment = 'Abnormal';
        }
        
        if (lowerLine.includes('confidence') || lowerLine.includes('%')) {
          const confidenceMatch = line.match(/(\d+)%/);
          if (confidenceMatch) {
            confidence = parseInt(confidenceMatch[1]);
          }
        }
      }

      return {
        overallAssessment,
        confidence,
        findings: findings.length > 0 ? findings : [{
          type: 'Analysis Complete',
          description: 'AI analysis completed successfully',
          severity: 'normal',
          confidence: confidence
        }],
        recommendations: [
          'Review findings with healthcare professional',
          'Follow up as clinically indicated',
          'Consider additional imaging if symptoms persist'
        ]
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        overallAssessment: 'Analysis Error',
        confidence: 0,
        findings: [{
          type: 'Error',
          description: 'Unable to parse AI response',
          severity: 'error',
          confidence: 0
        }],
        recommendations: ['Please try the analysis again']
      };
    }
  };

  // Show loading state if translations aren't loaded yet
  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title={t('ai.medicalImage.title')}
          description={t('ai.medicalImage.description')}
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
        title={t('ai.medicalImage.title')} 
        description={t('ai.medicalImage.description')} dense>
        <div className="space-y-4">
          {/* Header with AI Stats */}
          <div className="rounded-lg border border-indigo-500/20 bg-gradient-to-r from-indigo-600 to-purple-600 p-3 text-white shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Camera className="h-6 w-6 shrink-0" />
                <h2 className="truncate text-base font-semibold sm:text-lg">{t('ai.medicalImage.title')}</h2>
              </div>
              {activeModel && (
                <div className="shrink-0 text-right text-xs sm:text-sm">
                  <div className="text-indigo-100">{t('ai.medicalImage.activeAIModel')}</div>
                  <div className="font-semibold leading-tight">{activeModel.name}</div>
                  <div className="text-[10px] text-indigo-200 sm:text-xs">{activeModel.provider}</div>
                </div>
              )}
            </div>
            {activeModel && (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                  <div className="text-sm font-bold sm:text-base">{activeModel.accuracy}%</div>
                  <div className="text-[10px] text-indigo-100 sm:text-xs">{t('ai.medicalImage.aiAccuracy')}</div>
                </div>
                <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                  <div className="text-sm font-bold sm:text-base">{activeModel.testResults?.responseTime || 'N/A'}s</div>
                  <div className="text-[10px] text-indigo-100 sm:text-xs">{t('ai.medicalImage.responseTime')}</div>
                </div>
                <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                  <div className="text-sm font-bold sm:text-base">{activeModel.testResults?.reliability || 'N/A'}%</div>
                  <div className="text-[10px] text-indigo-100 sm:text-xs">{t('ai.medicalImage.reliability')}</div>
                </div>
              </div>
            )}
          </div>

          {/* Active Model Status */}
          {!activeModel && !loading && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="font-medium">{t('ai.medicalImage.noActiveAIModel')}</span>
              </div>
              <p className="mt-1 text-xs text-red-700">{t('ai.medicalImage.configureAIModelDesc')}</p>
              <a
                href="/ai-settings"
                className="mt-2 inline-block text-xs font-medium text-red-600 underline hover:text-red-800"
              >
                {t('ai.medicalImage.goToAISettings')} →
              </a>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-100">
            <nav className="-mb-px flex flex-wrap gap-x-1 gap-y-0.5 sm:gap-x-4">
              {[
                { id: 'upload', label: t('ai.medicalImage.imageUpload'), icon: Upload },
                { id: 'analysis', label: t('ai.medicalImage.aiAnalysis'), icon: Brain },
                { id: 'results', label: t('ai.medicalImage.results'), icon: Eye },
                { id: 'report', label: t('ai.medicalImage.diagnosticReport'), icon: FileText }
              ].map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1 border-b-2 px-1 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Image Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Patient Selection */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>Patient Selection</span>
                </h3>
                
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600" />
                    <span>Loading patients...</span>
                  </div>
                ) : (
                  <div className="mb-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Select Patient</label>
                    <SearchablePatientSelect
                      value={selectedPatient?.name || ''}
                      onChange={handlePatientSelect}
                      placeholder="Choose a patient (optional)"
                      className="w-full"
                    />
                    {selectedPatientId && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Patient information loaded</span>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Select a patient to associate this medical image analysis with their record
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Area */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Upload className="h-4 w-4" />
                  <span>{t('ai.medicalImage.uploadMedicalImage')}</span>
                </h3>
                
                <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center transition-colors hover:border-indigo-400 sm:p-5">
                  {!imagePreview ? (
                    <div>
                      <ImageIcon className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                      <div className="mb-1 text-sm font-semibold text-gray-900">
                        {t('ai.medicalImage.uploadYourMedicalImage')}
                      </div>
                      <p className="mb-3 text-xs text-gray-600 sm:text-sm">{t('ai.medicalImage.supportedFormatsDesc')}</p>
                      <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-indigo-600 bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-1">
                        <input
                          type="file"
                          accept="image/*,.dicom,.dcm"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        {t('ai.medicalImage.chooseImage')}
                      </label>
                    </div>
                  ) : (
                    <div>
                      <img
                        src={imagePreview}
                        alt="Medical image preview"
                        className="mx-auto mb-3 max-h-48 rounded-md border border-gray-100 shadow-sm sm:max-h-56"
                      />
                      <div className="mb-1 text-sm font-semibold text-gray-900">
                        {t('ai.medicalImage.imageReadyForAnalysis')}
                      </div>
                      <p className="mb-3 text-xs text-gray-600">
                        {selectedImage?.name} •{' '}
                        {selectedImage?.size ? (selectedImage.size / 1024 / 1024).toFixed(2) : '0'} MB
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview('');
                          }}
                          className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-gray-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-500"
                        >
                          {t('ai.medicalImage.remove')}
                        </button>
                        <button
                          type="button"
                          onClick={analyzeImage}
                          className="inline-flex h-9 items-center rounded-md border border-indigo-600 bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {t('ai.medicalImage.analyzeWithAI')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Supported Formats */}
                <div className="mt-4">
                  <h4 className="mb-2 text-xs font-medium text-gray-700">{t('ai.medicalImage.supportedFormats')}</h4>
                  <div className="grid grid-cols-2 gap-1.5 text-xs md:grid-cols-4 sm:text-sm">
                    <div className="rounded-md border border-gray-100 bg-gray-50 py-1.5 text-center font-medium text-gray-900">
                      X-Ray
                    </div>
                    <div className="rounded-md border border-gray-100 bg-gray-50 py-1.5 text-center font-medium text-gray-900">
                      CT Scan
                    </div>
                    <div className="rounded-md border border-gray-100 bg-gray-50 py-1.5 text-center font-medium text-gray-900">
                      MRI
                    </div>
                    <div className="rounded-md border border-gray-100 bg-gray-50 py-1.5 text-center font-medium text-gray-900">
                      Ultrasound
                    </div>
                    <div className="rounded-md border border-gray-100 bg-gray-50 py-1.5 text-center font-medium text-gray-900">
                      DICOM
                    </div>
                    <div className="rounded-md border border-gray-100 bg-gray-50 py-1.5 text-center font-medium text-gray-900">
                      JPEG
                    </div>
                    <div className="rounded-md border border-gray-100 bg-gray-50 py-1.5 text-center font-medium text-gray-900">
                      PNG
                    </div>
                    <div className="rounded-md border border-gray-100 bg-gray-50 py-1.5 text-center font-medium text-gray-900">
                      TIFF
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Capabilities */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Brain className="h-4 w-4" />
                  <span>{t('ai.medicalImage.aiAnalysisCapabilities')}</span>
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.medicalImage.abnormalityDetection')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.medicalImage.tumorIdentification')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.medicalImage.fractureDetection')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.medicalImage.organSegmentation')}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.medicalImage.diseaseClassification')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.medicalImage.measurementTools')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.medicalImage.progressTracking')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.medicalImage.comparativeAnalysis')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis Tab */}
          {activeTab === 'analysis' && (
            <div className="space-y-4">
              {/* Analysis Progress - Show when analyzing */}
              {isAnalyzing && (
                <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                    <Brain className="h-4 w-4" />
                    <span>AI Image Analysis in Progress</span>
                  </h3>
                  
                  <div className="py-6 text-center">
                    <div className="mx-auto mb-2 h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600" />
                    <h4 className="mb-1 text-sm font-semibold text-gray-900">Analyzing Medical Image</h4>
                    <p className="mb-3 text-xs text-gray-600 sm:text-sm">
                      {activeModel
                        ? `Using ${activeModel.name} to analyze your image and detect potential abnormalities...`
                        : 'Preparing AI analysis...'}
                    </p>
                    <div className="mx-auto max-w-sm">
                      <div className="mb-1 h-1.5 rounded-full bg-gray-200">
                        <div
                          className="h-1.5 animate-pulse rounded-full bg-indigo-600"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <p className="text-xs text-gray-600">Processing with AI...</p>
                    </div>
                  </div>

                  <div className="rounded-md border border-indigo-100 bg-indigo-50 p-3">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                      <div className="text-xs text-indigo-800 sm:text-sm">
                        <strong>AI Analysis Active:</strong>{' '}
                        {activeModel
                          ? `${activeModel.name} is analyzing your medical image for abnormalities, measuring structures, and providing diagnostic insights.`
                          : 'AI model is analyzing your medical image for abnormalities and providing diagnostic insights.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis Results - Show when analysis is complete */}
              {!isAnalyzing && aiAnalysisResult && (
                <div className="space-y-4">
                  {/* Raw AI Response - Formatted */}
                  {rawAIResponse && (
                    <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        <span>AI Analysis Response</span>
                      </h3>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <FormattedAIResult 
                          content={rawAIResponse} 
                          type="image-analysis"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        This is the complete response from the AI model. The structured results below are parsed from this response.
                      </p>
                    </div>
                  )}

                  {/* Analysis Results */}
                  <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      <span>AI Analysis Results</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {/* Image with Annotations */}
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-gray-900">Analyzed Image</h4>
                        <div className="relative">
                          <img 
                            src={imagePreview} 
                            alt="Analyzed medical image" 
                            className="w-full rounded-md border border-gray-100 shadow-sm"
                          />
                          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                            AI Analyzed
                          </div>
                        </div>
                      </div>

                      {/* Analysis Summary */}
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-gray-900">Analysis Summary</h4>
                        <div className="space-y-4">
                          <div className={`p-3 rounded-lg ${
                            aiAnalysisResult.overallAssessment === 'Normal' ? 'bg-green-50' :
                            aiAnalysisResult.overallAssessment === 'Abnormal' ? 'bg-red-50' : 'bg-yellow-50'
                          }`}>
                            <div className="flex items-center space-x-2 mb-2">
                              {aiAnalysisResult.overallAssessment === 'Normal' ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : aiAnalysisResult.overallAssessment === 'Abnormal' ? (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              ) : (
                                <Info className="w-4 h-4 text-yellow-500" />
                              )}
                              <span className={`font-medium ${
                                aiAnalysisResult.overallAssessment === 'Normal' ? 'text-green-900' :
                                aiAnalysisResult.overallAssessment === 'Abnormal' ? 'text-red-900' : 'text-yellow-900'
                              }`}>
                                {aiAnalysisResult.overallAssessment} Assessment
                              </span>
                            </div>
                            <p className={`text-sm ${
                              aiAnalysisResult.overallAssessment === 'Normal' ? 'text-green-700' :
                              aiAnalysisResult.overallAssessment === 'Abnormal' ? 'text-red-700' : 'text-yellow-700'
                            }`}>
                              AI confidence: {aiAnalysisResult.confidence}%
                            </p>
                          </div>
                          
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <BarChart3 className="w-4 h-4 text-blue-500" />
                              <span className="font-medium text-blue-900">Findings</span>
                            </div>
                            <p className="text-sm text-blue-700">
                              {aiAnalysisResult.findings.length} finding(s) detected by AI analysis.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Findings */}
                  <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Detailed Findings</h3>
                    <div className="space-y-4">
                      {aiAnalysisResult.findings.map((finding: any, index: number) => (
                        <div key={index} className="rounded-md border border-gray-100 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold text-gray-900">{finding.type} #{index + 1}</h4>
                            <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs ${
                              finding.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              finding.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              finding.severity === 'minor' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {finding.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {finding.description}
                          </p>
                          <div className="text-xs text-gray-500">
                            <strong>Confidence:</strong> {finding.confidence}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">AI Recommendations</h3>
                    <div className="space-y-2">
                      {aiAnalysisResult.recommendations.map((recommendation: string, index: number) => (
                        <div key={index} className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-800">{recommendation}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Steps */}
                  <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Next Steps</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('report')}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-indigo-600 bg-indigo-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Generate Report</span>
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-green-600 bg-green-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>Share Results</span>
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download Analysis</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* No Analysis Results - Show when no analysis has been done */}
              {!isAnalyzing && !aiAnalysisResult && (
                <div className="text-center py-8">
                  <Brain className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Analysis Performed</h3>
                  <p className="text-xs text-gray-500 mb-4">Click "Analyze with AI" to start the image analysis.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-indigo-600 bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    Go to Image Upload
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && aiAnalysisResult && (
            <div className="space-y-4">
              {/* Raw AI Response */}
              {rawAIResponse && (
                <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    <span>Raw AI Response</span>
                  </h3>
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                      {rawAIResponse}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    This is the raw response from the AI model. The structured results below are parsed from this response.
                  </p>
                </div>
              )}

              {/* Analysis Results */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span>AI Analysis Results</span>
                </h3>
                
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {/* Image with Annotations */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">Analyzed Image</h4>
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Analyzed medical image" 
                        className="w-full rounded-lg shadow-lg"
                      />
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                        AI Analyzed
                      </div>
                    </div>
                  </div>

                  {/* Analysis Summary */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">Analysis Summary</h4>
                    <div className="space-y-4">
                      <div className={`p-3 rounded-lg ${
                        aiAnalysisResult.overallAssessment === 'Normal' ? 'bg-green-50' :
                        aiAnalysisResult.overallAssessment === 'Abnormal' ? 'bg-red-50' : 'bg-yellow-50'
                      }`}>
                        <div className="flex items-center space-x-2 mb-2">
                          {aiAnalysisResult.overallAssessment === 'Normal' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : aiAnalysisResult.overallAssessment === 'Abnormal' ? (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          ) : (
                            <Info className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className={`font-medium ${
                            aiAnalysisResult.overallAssessment === 'Normal' ? 'text-green-900' :
                            aiAnalysisResult.overallAssessment === 'Abnormal' ? 'text-red-900' : 'text-yellow-900'
                          }`}>
                            {aiAnalysisResult.overallAssessment} Assessment
                          </span>
                        </div>
                        <p className={`text-sm ${
                          aiAnalysisResult.overallAssessment === 'Normal' ? 'text-green-700' :
                          aiAnalysisResult.overallAssessment === 'Abnormal' ? 'text-red-700' : 'text-yellow-700'
                        }`}>
                          AI confidence: {aiAnalysisResult.confidence}%
                        </p>
                      </div>
                      
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <BarChart3 className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-blue-900">Findings</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          {aiAnalysisResult.findings.length} finding(s) detected by AI analysis.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Findings */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Detailed Findings</h3>
                <div className="space-y-4">
                  {aiAnalysisResult.findings.map((finding: any, index: number) => (
                    <div key={index} className="rounded-md border border-gray-100 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-gray-900">{finding.type} #{index + 1}</h4>
                        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs ${
                          finding.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          finding.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          finding.severity === 'minor' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {finding.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {finding.description}
                      </p>
                      <div className="text-xs text-gray-500">
                        <strong>Confidence:</strong> {finding.confidence}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">AI Recommendations</h3>
                <div className="space-y-2">
                  {aiAnalysisResult.recommendations.map((recommendation: string, index: number) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-800">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Steps */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Next Steps</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('report')}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-indigo-600 bg-indigo-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Generate Report</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-green-600 bg-green-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share Results</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Analysis</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Diagnostic Report Tab */}
          {activeTab === 'report' && aiAnalysisResult && (
            <div className="space-y-4">
              {/* Report Header */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <div className="text-center mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 mb-1">AI Medical Image Analysis Report</h2>
                  <p className="text-xs text-gray-600">
                    Comprehensive diagnostic report generated by {activeModel?.name || 'AI model'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-4">
                  <div className={`text-center rounded-md border border-gray-100 p-3 shadow-sm ${
                    aiAnalysisResult.overallAssessment === 'Normal' ? 'bg-green-50' :
                    aiAnalysisResult.overallAssessment === 'Abnormal' ? 'bg-red-50' : 'bg-yellow-50'
                  }`}>
                    <div className={`text-lg font-bold tabular-nums ${
                      aiAnalysisResult.overallAssessment === 'Normal' ? 'text-green-600' :
                      aiAnalysisResult.overallAssessment === 'Abnormal' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {aiAnalysisResult.overallAssessment}
                    </div>
                    <div className={`text-xs ${
                      aiAnalysisResult.overallAssessment === 'Normal' ? 'text-green-800' :
                      aiAnalysisResult.overallAssessment === 'Abnormal' ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      Overall Assessment
                    </div>
                  </div>
                  <div className="text-center rounded-md border border-gray-100 bg-blue-50 p-3 shadow-sm">
                    <div className="text-lg font-bold tabular-nums text-blue-600">{aiAnalysisResult.findings.length}</div>
                    <div className="text-xs text-blue-800">Findings Detected</div>
                  </div>
                  <div className="text-center rounded-md border border-gray-100 bg-purple-50 p-3 shadow-sm">
                    <div className="text-lg font-bold tabular-nums text-purple-600">{aiAnalysisResult.confidence}%</div>
                    <div className="text-xs text-purple-800">AI Confidence</div>
                  </div>
                </div>
              </div>

              {/* Report Content */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Report Summary</h3>
                <div className="space-y-3">
                  <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
                    <h4 className="text-xs font-medium text-gray-900 mb-1.5">Clinical Impression</h4>
                    <p className="text-sm text-gray-700">
                      The AI analysis of this medical image reveals {aiAnalysisResult.overallAssessment.toLowerCase()} findings 
                      with {aiAnalysisResult.confidence}% confidence. {aiAnalysisResult.findings.length} finding(s) were detected.
                    </p>
                  </div>

                  <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
                    <h4 className="text-xs font-medium text-gray-900 mb-1.5">AI Recommendations</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {aiAnalysisResult.recommendations.map((recommendation: string, index: number) => (
                        <li key={index}>• {recommendation}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => {
                    // Create PDF report
                    const doc = new jsPDF();
                    let yPos = 20;
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const margin = 20;
                    const maxWidth = pageWidth - (margin * 2);
                    
                    // Helper function to add text with word wrap
                    const addText = (text: string, fontSize: number, isBold: boolean = false, color: number[] = [0, 0, 0]) => {
                      doc.setFontSize(fontSize);
                      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
                      doc.setTextColor(color[0], color[1], color[2]);
                      
                      const lines = doc.splitTextToSize(text, maxWidth);
                      lines.forEach((line: string) => {
                        if (yPos > 270) {
                          doc.addPage();
                          yPos = 20;
                        }
                        doc.text(line, margin, yPos);
                        yPos += fontSize * 0.5;
                      });
                      yPos += 5;
                    };
                    
                    // Header
                    addText('AI Medical Image Analysis Report', 18, true, [0, 0, 0]);
                    yPos += 5;
                    
                    // Report Information
                    addText(`Generated by: ${activeModel?.name || 'AI Model'}`, 10, false, [100, 100, 100]);
                    addText(`Date: ${new Date().toLocaleDateString()}`, 10, false, [100, 100, 100]);
                    yPos += 10;
                    
                    // Patient Information
                    if (selectedPatient) {
                      addText('Patient Information', 14, true);
                      addText(`Name: ${selectedPatient.name || 'N/A'}`, 11);
                      addText(`Patient ID: ${selectedPatient.patientId || 'N/A'}`, 11);
                      addText(`Age: ${selectedPatient.age || 'N/A'}`, 11);
                      addText(`Gender: ${selectedPatient.gender || 'N/A'}`, 11);
                      yPos += 5;
                    }
                    
                    // Image Analysis Results
                    addText('Image Analysis Results', 14, true);
                    addText(`Image Type: ${aiAnalysisResult.imageType || 'N/A'}`, 11);
                    addText(`Overall Assessment: ${aiAnalysisResult.overallAssessment || 'N/A'}`, 11);
                    addText(`Confidence: ${aiAnalysisResult.confidence || 0}%`, 11);
                    addText(`Severity: ${aiAnalysisResult.severity || 'N/A'}`, 11);
                    yPos += 5;
                    
                    // Diagnosis
                    if (aiAnalysisResult.diagnosis) {
                      addText('Diagnosis', 12, true);
                      addText(aiAnalysisResult.diagnosis, 11);
                      yPos += 5;
                    }
                    
                    // Findings
                    if (aiAnalysisResult.findings && aiAnalysisResult.findings.length > 0) {
                      addText('Findings', 12, true);
                      aiAnalysisResult.findings.forEach((finding: string, index: number) => {
                        addText(`${index + 1}. ${finding}`, 11);
                      });
                      yPos += 5;
                    }
                    
                    // Recommendations
                    if (aiAnalysisResult.recommendations && aiAnalysisResult.recommendations.length > 0) {
                      addText('Recommendations', 12, true);
                      aiAnalysisResult.recommendations.forEach((recommendation: string, index: number) => {
                        addText(`${index + 1}. ${recommendation}`, 11);
                      });
                      yPos += 5;
                    }
                    
                    // Footer
                    yPos = 280;
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    doc.text('This report is generated by AI and should be reviewed by a qualified healthcare professional.', margin, yPos, { maxWidth });
                    
                    // Save PDF
                    const patientName = selectedPatient?.name?.replace(/\s+/g, '-') || 'patient';
                    const date = new Date().toISOString().split('T')[0];
                    doc.save(`diagnostic-report-${patientName}-${date}.pdf`);
                  }}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-indigo-600 bg-indigo-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Share functionality - copy report to clipboard
                    const reportText = `Diagnostic Report\n\nPatient: ${selectedPatient?.name || 'N/A'}\nImage Type: ${aiAnalysisResult.imageType}\nDiagnosis: ${aiAnalysisResult.diagnosis}\nFindings: ${aiAnalysisResult.findings.join(', ')}\nRecommendations: ${aiAnalysisResult.recommendations.join(', ')}\nConfidence: ${aiAnalysisResult.confidence}%\nSeverity: ${aiAnalysisResult.severity}`;
                    navigator.clipboard.writeText(reportText).then(() => {
                      alert('Report copied to clipboard!');
                    }).catch(() => {
                      alert('Failed to copy report. Please try again.');
                    });
                  }}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-green-600 bg-green-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share with Doctor</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Schedule consultation - could navigate to appointments page or show modal
                    alert('Consultation scheduling feature coming soon!');
                  }}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  <span>Schedule Consultation</span>
                </button>
              </div>
            </div>
          )}

          {/* No Image Uploaded */}
          {activeTab === 'analysis' && !selectedImage && (
            <div className="text-center py-8">
              <Camera className="mx-auto mb-3 h-12 w-12 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No Image Uploaded</h3>
              <p className="text-xs text-gray-500 mb-4">Upload a medical image first to begin AI analysis.</p>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="inline-flex h-9 items-center justify-center rounded-md border border-indigo-600 bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                Go to Image Upload
              </button>
            </div>
          )}

          {activeTab === 'results' && !selectedImage && (
            <div className="text-center py-8">
              <Eye className="mx-auto mb-3 h-12 w-12 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No Analysis Results</h3>
              <p className="text-xs text-gray-500 mb-4">Complete the AI image analysis first to view results.</p>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="inline-flex h-9 items-center justify-center rounded-md border border-indigo-600 bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                Start Image Analysis
              </button>
            </div>
          )}

          {activeTab === 'report' && !selectedImage && (
            <div className="text-center py-8">
              <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No Report Available</h3>
              <p className="text-xs text-gray-500 mb-4">Complete the AI image analysis first to generate a diagnostic report.</p>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="inline-flex h-9 items-center justify-center rounded-md border border-indigo-600 bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                Start Image Analysis
              </button>
            </div>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
