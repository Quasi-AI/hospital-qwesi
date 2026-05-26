'use client';

import { useState } from 'react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { aiService } from '../../lib/ai-service';
import { 
  FileText, 
  Brain, 
  Download, 
  Eye, 
  Edit3, 
  CheckCircle, 
  AlertCircle,
  Clock,
  User,
  Stethoscope,
  Activity,
  TrendingUp,
  Zap,
  Save,
  Share2,
  Printer
} from 'lucide-react';

export default function AIReportGeneratorPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'generate' | 'templates' | 'history'>('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string>('');
  const [reportType, setReportType] = useState<string>('patient_summary');
  const [patientData, setPatientData] = useState({
    name: '',
    age: '',
    diagnosis: '',
    treatment: '',
    followUp: ''
  });

  // Function to generate AI report
  const generateAIReport = async () => {
    if (!patientData.name || !patientData.diagnosis) return;
    
    setIsGenerating(true);
    
    try {
      const result = await aiService.generateText({
        prompt: `Generate a comprehensive ${reportType.replace('_', ' ')} report for the following patient:

Patient Information:
- Name: ${patientData.name}
- Age: ${patientData.age}
- Diagnosis: ${patientData.diagnosis}
- Treatment: ${patientData.treatment}
- Follow-up: ${patientData.followUp}

Report Type: ${reportType}

Please provide:
1. Executive summary
2. Detailed findings
3. Treatment recommendations
4. Follow-up instructions
5. Risk assessment
6. Patient education points

Format the report professionally for healthcare providers.`,
        modelId: '1', // Default to first model
        maxTokens: 1200,
        temperature: 0.3
      });
      
      if (result.success && result.content) {
        setGeneratedReport(result.content);
        console.log('AI Generated Report:', result.content);
        setActiveTab('generate');
      } else {
        console.error('AI report generation failed:', result.error);
        setGeneratedReport('AI report generation temporarily unavailable. Please try again later.');
        setActiveTab('generate');
      }
    } catch (error) {
      console.error('Error generating AI report:', error);
      setGeneratedReport('AI report generation temporarily unavailable. Please try again later.');
      setActiveTab('generate');
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to clear report
  const clearReport = () => {
    setGeneratedReport('');
    setPatientData({
      name: '',
      age: '',
      diagnosis: '',
      treatment: '',
      followUp: ''
    });
  };

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title="AI Medical Report Generator" 
        description="AI-powered medical report creation with intelligent insights and analysis" dense>
        <div className="space-y-4">
          {/* Header with AI Stats */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <FileText className="w-8 h-8" />
              <h2 className="text-2xl font-bold">AI Medical Report Generator</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">99.2%</div>
                <div className="text-green-100">Accuracy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">1.8s</div>
                <div className="text-green-100">Average Generation Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">1000+</div>
                <div className="text-green-100">Reports Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">24/7</div>
                <div className="text-green-100">Available</div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'input', label: 'Report Data', icon: Edit3 },
                { id: 'ai-insights', label: 'AI Insights', icon: Brain },
                { id: 'final-report', label: 'Final Report', icon: FileText }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content based on active tab */}
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">AI Medical Report Generator</h3>
            <p className="text-gray-500">Advanced AI-powered medical report generation system coming soon...</p>
            <p className="text-sm text-gray-400 mt-2">Currently showing: {activeTab} tab</p>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
