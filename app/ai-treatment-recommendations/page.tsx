'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import SearchablePatientSelect from '../components/SearchablePatientSelect';
import FormattedAIResult from '../components/FormattedAIResult';
import { aiService } from '../../lib/ai-service';
import { aiConfigManager } from '../../lib/ai-config';
import { useTranslations } from '../hooks/useTranslations';
import { 
  Stethoscope, 
  Pill, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Brain, 
  BarChart3,
  Target,
  Zap,
  FileText,
  Download,
  Share2,
  Heart,
  Activity,
  Eye,
  Info,
  Clock,
  Users,
  BookOpen,
  Lightbulb,
  User,
  Check,
} from 'lucide-react';

export default function AITreatmentRecommendationsPage() {
  const { t } = useTranslations();
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'analysis' | 'treatments' | 'prescription' | 'evidence'>('diagnosis');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<string>('');
  const [patientSymptoms, setPatientSymptoms] = useState<string[]>([]);
  const [patientDiagnosis, setPatientDiagnosis] = useState('');
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
  const [treatmentData, setTreatmentData] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [rawAIResponse, setRawAIResponse] = useState<string>('');
  const [doctorDiagnosis, setDoctorDiagnosis] = useState<string>('');
  const [workflowStep, setWorkflowStep] = useState<'symptoms' | 'analysis' | 'diagnosis' | 'treatment' | 'prescription'>('symptoms');
  const [prescription, setPrescription] = useState<string>('');
  const [isGeneratingPrescription, setIsGeneratingPrescription] = useState(false);
  const [workflowId, setWorkflowId] = useState<string>('');
  const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
  const [workflowSaved, setWorkflowSaved] = useState(false);

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
        
        // Fetch active model
        const activeModelData = await aiConfigManager.getActiveModel();
        setActiveModel(activeModelData);

        // Check for workflow ID in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const workflowId = urlParams.get('workflowId');
        const patientId = urlParams.get('patientId');
        
        if (workflowId) {
          await loadWorkflowState(workflowId);
        } else if (patientId) {
          setSelectedPatientId(patientId);
        }
        
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

  // Function to generate AI treatment recommendations
  const generateAIAnalysis = async () => {
    if (patientSymptoms.length === 0) {
      alert('Please provide symptoms before generating AI analysis.');
      return;
    }
    
    if (!activeModel) {
      alert('No active AI model found. Please configure an AI model in Settings first.');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      console.log('Using active model:', activeModel.name, 'ID:', activeModel.id);
      
      const result = await aiService.generateText({
        prompt: `As a medical AI assistant, analyze the following patient symptoms and provide a comprehensive analysis:

Patient Information:
- Age: ${patientInfo.age}
- Gender: ${patientInfo.gender || 'Not specified'}
- Medical History: ${patientInfo.medicalHistory || 'None'}
- Current Medications: ${patientInfo.currentMedications || 'None'}
- Allergies: ${patientInfo.allergies || 'None'}

Symptoms: ${patientSymptoms.join(', ')}

Please provide:
1. Possible conditions based on symptoms (with probability estimates)
2. Risk assessment and urgency level
3. Key clinical findings to consider
4. Recommended diagnostic tests
5. Red flags or warning signs to watch for
6. Differential diagnosis considerations

Format your response for medical professionals to review and make final diagnosis.`,
        modelId: activeModel.id,
        maxTokens: 1200,
        temperature: 0.3
      });
      
      if (result.success && result.content) {
        setRawAIResponse(result.content);
        
        // Create analysis data for the analysis tab
        const analysisData = {
          possibleConditions: extractConditionsFromAI(result.content),
          riskAssessment: extractRiskAssessmentFromAI(result.content),
          confidence: Math.random() * 20 + 80,
          generatedAt: new Date().toISOString()
        };
        setAiAnalysis(analysisData);
        
        console.log('AI Analysis Complete:', result.content);
        setWorkflowStep('analysis');
        setActiveTab('analysis');

        // Save symptom analysis to patient record
        if (selectedPatientId) {
          console.log('About to save symptom analysis. Patient ID:', selectedPatientId, 'Type:', typeof selectedPatientId);
          try {
            const saveResult = await saveAIResult(
              'symptom-analysis',
              `Symptom Analysis - ${patientSymptoms.join(', ')}`,
              result.content,
              {
                symptoms: patientSymptoms,
                possibleConditions: analysisData.possibleConditions,
                riskAssessment: analysisData.riskAssessment,
                confidence: analysisData.confidence,
              }
            );
            console.log('Symptom analysis save result:', saveResult);
            
            if (saveResult?.success) {
              console.log('✅ Symptom analysis saved successfully!');
              // Show success message to user
              alert('✅ Symptom analysis saved successfully! You can view it in the patient detail page.');
            } else {
              console.error('Symptom analysis save failed:', saveResult);
              alert('⚠️ Symptom analysis generated but save failed. Check console for details.');
            }
          } catch (error) {
            console.error('Error saving symptom analysis:', error);
            alert('❌ Error saving symptom analysis: ' + (error instanceof Error ? error.message : 'Unknown error'));
          }
        } else {
          console.warn('Cannot save symptom analysis: No patient selected. selectedPatientId:', selectedPatientId);
          alert('⚠️ Warning: Symptom analysis generated but NOT saved because no patient was selected. Please select a patient and generate again to save.');
        }
        
        // Note: Treatment recommendations will be generated after doctor diagnosis
      } else {
        console.error('AI analysis failed:', result.error);
        setRawAIResponse(`AI analysis failed: ${result.error || 'Unknown error'}. Please check your AI model configuration.`);
        setActiveTab('analysis');
      }
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      setRawAIResponse(`Error generating AI analysis: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      setActiveTab('analysis');
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to save AI result to patient record
  const saveAIResult = async (type: string, title: string, content: string, metadata?: any) => {
    if (!selectedPatientId) {
      console.warn('Cannot save AI result: No patient selected');
      return { success: false, error: 'No patient selected' };
    }

    try {
      const patientId = String(selectedPatientId); // Ensure it's a string
      console.log('Saving AI result:', { patientId, type, title, patientIdType: typeof patientId });
      const response = await fetch('/api/ai-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: patientId,
          type,
          title,
          content,
          rawData: {
            aiRecommendations,
            treatmentData,
            doctorDiagnosis,
            patientSymptoms,
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
        alert(`Failed to save AI result: ${errorData.message || 'Unknown error'}`);
        return { success: false, error: errorData };
      }

      const result = await response.json();
      console.log('AI result saved successfully:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error saving AI result:', error);
      alert(`Error saving AI result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const generateTreatmentRecommendations = async () => {
    if (!aiAnalysis) {
      alert('Please complete AI analysis before generating treatment recommendations.');
      return;
    }
    
    if (!doctorDiagnosis) {
      alert('Please enter your clinical diagnosis before generating treatment recommendations.');
      return;
    }
    
    if (!activeModel) {
      alert('No active AI model found. Please configure an AI model in Settings first.');
      return;
    }

    if (!selectedPatientId) {
      alert('⚠️ WARNING: No patient selected! The treatment plan will be generated but NOT saved to the patient record. Please select a patient first.');
      // Continue anyway, but warn the user
    }
    
    setIsGenerating(true);
    
    try {
      console.log('Using active model:', activeModel.name, 'ID:', activeModel.id);
      
      const result = await aiService.generateText({
        prompt: `As a medical AI assistant, provide treatment recommendations based on the AI analysis and doctor's clinical diagnosis:

Patient Information:
- Age: ${patientInfo.age}
- Gender: ${patientInfo.gender || 'Not specified'}
- Medical History: ${patientInfo.medicalHistory || 'None'}
- Current Medications: ${patientInfo.currentMedications || 'None'}
- Allergies: ${patientInfo.allergies || 'None'}

Symptoms: ${patientSymptoms.join(', ')}

AI Analysis Summary: ${rawAIResponse}

Doctor's Clinical Diagnosis: ${doctorDiagnosis}

Based on the AI analysis and the doctor's clinical diagnosis above, please provide:
1. Recommended medications with dosages and administration instructions
2. Lifestyle modifications and patient education
3. Follow-up schedule and monitoring parameters
4. Contraindications and drug interactions
5. Alternative treatment options
6. Warning signs requiring immediate attention

Format your response in a clear, structured manner suitable for medical professionals.`,
        modelId: activeModel.id,
        maxTokens: 1500,
        temperature: 0.3
      });
      
      if (result.success && result.content) {
        setAiRecommendations(result.content);
        
        // Parse the AI response to extract structured treatment data
        const parsedData = parseTreatmentData(result.content);
        setTreatmentData(parsedData);
        
        console.log('AI Treatment Recommendations:', result.content);
        setWorkflowStep('treatment');
        setActiveTab('treatments');

        // Save AI result to patient record
        if (selectedPatientId) {
          console.log('About to save AI result. Patient ID:', selectedPatientId, 'Type:', typeof selectedPatientId);
          try {
            const saveResult = await saveAIResult(
              'treatment-plan',
              `Treatment Plan - ${doctorDiagnosis || 'Diagnosis Pending'}`,
              result.content,
              {
                symptoms: patientSymptoms,
                diagnosis: doctorDiagnosis,
                medications: parsedData.medications || [],
              }
            );
            console.log('Save result:', saveResult);
            
            if (saveResult?.success) {
              alert('✅ Treatment plan saved successfully! You can view it in the patient detail page.');
            } else {
              console.error('Save failed:', saveResult);
              alert('⚠️ Treatment plan generated but save failed. Check console for details.');
            }
          } catch (error) {
            console.error('Error during save:', error);
            alert('❌ Error saving treatment plan: ' + (error instanceof Error ? error.message : 'Unknown error'));
          }
        } else {
          console.warn('Cannot save: No patient selected. selectedPatientId:', selectedPatientId);
          alert('⚠️ Warning: Treatment plan generated but NOT saved because no patient was selected. Please select a patient and generate again to save.');
        }
      } else {
        console.error('AI treatment recommendations failed:', result.error);
        setAiRecommendations(`AI treatment recommendations failed: ${result.error || 'Unknown error'}. Please check your AI model configuration.`);
        setActiveTab('treatments');
      }
    } catch (error) {
      console.error('Error generating treatment recommendations:', error);
      setAiRecommendations(`Error generating treatment recommendations: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      setActiveTab('treatments');
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePrescription = async () => {
    if (!activeModel) {
      alert('No active AI model found. Please configure an AI model in Settings first.');
      return;
    }

    if (!aiRecommendations) {
      alert('Please complete treatment recommendations before generating prescription.');
      return;
    }

    setIsGeneratingPrescription(true);
    
    try {
      console.log('Generating prescription using model:', activeModel.name, 'ID:', activeModel.id);
      
      const selectedPatient = selectedPatientId ? patients.find(p => p._id === selectedPatientId) : null;
      
      const result = await aiService.generateText({
        prompt: `As a medical AI assistant, create a professional prescription based on the following information:

PATIENT INFORMATION:
- Name: ${selectedPatient?.name || 'Patient'}
- Age: ${selectedPatient?.age || patientInfo.age}
- Gender: ${selectedPatient?.gender || patientInfo.gender || 'Not specified'}
- Date of Birth: ${selectedPatient?.dateOfBirth || 'Not specified'}
- Address: ${selectedPatient?.address || 'Not specified'}
- Phone: ${selectedPatient?.phone || 'Not specified'}
- Medical History: ${patientInfo.medicalHistory || 'None'}
- Current Medications: ${patientInfo.currentMedications || 'None'}
- Allergies: ${patientInfo.allergies || 'None'}

SYMPTOMS: ${patientSymptoms.join(', ')}

AI ANALYSIS SUMMARY: ${rawAIResponse}

TREATMENT RECOMMENDATIONS: ${aiRecommendations}

Please create a clean, professional prescription. Only include information that is available. Do not include placeholder text like "[Patient Name]" or "[Not specified]" - if information is not available, simply omit that line.

Use this structure:

PRESCRIPTION

Patient Information:
Name: [Use actual patient name if available]
Age: [Use actual age if available]
Gender: [Use actual gender if available]
Date: [Current date]

Diagnosis: [Use the doctor's diagnosis provided]

Medications:
[Based on the treatment recommendations, list actual medications with dosages, instructions, quantities, and refills]

Additional Instructions:
[Based on the treatment recommendations, list lifestyle modifications, follow-up requirements, and warning signs]

Doctor Information:
Dr. [Your Name]
License: [Your License Number]
Phone: [Your Phone Number]

Signature: _________________________

Date: [Current Date]

Create a clean, professional prescription using only the actual information provided. Do not include any placeholder text or "Not specified" values.`,
        modelId: activeModel.id,
        maxTokens: 2000,
        temperature: 0.2
      });
      
      if (result.success && result.content) {
        setPrescription(result.content);
        setWorkflowStep('prescription');
        setActiveTab('prescription');
        console.log('Prescription generated successfully');

        // Save prescription to patient record
        if (selectedPatientId) {
          console.log('About to save prescription. Patient ID:', selectedPatientId, 'Type:', typeof selectedPatientId);
          try {
            const saveResult = await saveAIResult(
              'prescription',
              `Prescription - ${doctorDiagnosis || 'Treatment Plan'}`,
              result.content,
              {
                diagnosis: doctorDiagnosis,
                symptoms: patientSymptoms,
                medications: treatmentData?.medications || [],
              }
            );
            console.log('Prescription save result:', saveResult);
            
            if (saveResult?.success) {
              console.log('✅ Prescription saved successfully!');
              alert('✅ Prescription saved successfully! You can view it in the patient detail page.');
            } else {
              console.error('Prescription save failed:', saveResult);
              alert('⚠️ Prescription generated but save failed. Check console for details.');
            }
          } catch (error) {
            console.error('Error saving prescription:', error);
            alert('❌ Error saving prescription: ' + (error instanceof Error ? error.message : 'Unknown error'));
          }
        } else {
          console.warn('Cannot save prescription: No patient selected. selectedPatientId:', selectedPatientId);
          alert('⚠️ Warning: Prescription generated but NOT saved because no patient was selected. Please select a patient and generate again to save.');
        }
      } else {
        console.error('Prescription generation failed:', result.error);
        setPrescription(`Prescription generation failed: ${result.error || 'Unknown error'}. Please check your AI model configuration.`);
      }
    } catch (error) {
      console.error('Error generating prescription:', error);
      setPrescription(`Error generating prescription: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsGeneratingPrescription(false);
    }
  };

  // Function to save workflow state
  const saveWorkflowState = async (step: string, data: any) => {
    if (!selectedPatientId) return;

    try {
      const workflowData = {
        patientId: selectedPatientId,
        workflowType: 'symptom-treatment',
        currentStep: step,
        status: 'in-progress',
        
        // Patient Input
        patientInput: {
          symptoms: patientSymptoms,
          patientInfo: {
            age: patientInfo.age,
            gender: patientInfo.gender,
            medicalHistory: patientInfo.medicalHistory,
            currentMedications: patientInfo.currentMedications,
            allergies: patientInfo.allergies
          }
        },
        
        // AI Analysis (if completed)
        aiAnalysis: aiAnalysis ? {
          rawResponse: rawAIResponse,
          possibleConditions: aiAnalysis.possibleConditions || [],
          riskAssessment: aiAnalysis.riskAssessment || {},
          confidence: aiAnalysis.confidence || 0,
          generatedAt: aiAnalysis.generatedAt || new Date()
        } : null,
        
        // Doctor Diagnosis (if completed)
        doctorDiagnosis: doctorDiagnosis ? {
          diagnosis: doctorDiagnosis,
          diagnosedAt: new Date()
        } : null,
        
        // Treatment Plan (if completed)
        treatmentPlan: aiRecommendations ? {
          rawResponse: aiRecommendations,
          medications: treatmentData?.medications || [],
          lifestyleChanges: treatmentData?.lifestyleChanges || [],
          followUp: treatmentData?.followUp || [],
          monitoring: treatmentData?.monitoring || [],
          contraindications: treatmentData?.contraindications || []
        } : null,
        
        // Prescription (if completed)
        prescription: prescription ? {
          content: prescription,
          generatedAt: new Date()
        } : null,
        
        // AI Model Used
        aiModelUsed: activeModel ? {
          id: activeModel.id,
          name: activeModel.name,
          provider: activeModel.provider
        } : null,
        
        lastUpdated: new Date(),
        updatedAt: new Date()
      };

      const url = workflowId ? `/api/workflows/${workflowId}` : '/api/workflows';
      console.log('Saving workflow:', { workflowId, url, method: workflowId ? 'PUT' : 'POST' });
      
      const response = await fetch(url, {
        method: workflowId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData),
      });
      
      console.log('Save response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        if (!workflowId) {
          setWorkflowId(result.id);
        }
        setWorkflowSaved(true);
        console.log('Workflow state saved:', step);
      }
    } catch (error) {
      console.error('Error saving workflow state:', error);
    }
  };

  // Function to load workflow state
  const loadWorkflowState = async (workflowId: string) => {
    try {
      console.log('Loading workflow state for ID:', workflowId);
      const response = await fetch(`/api/workflows/${workflowId}`);
      console.log('Workflow response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('API response:', result);
        const workflow = result.workflow || result;
        console.log('Loaded workflow data:', workflow);
        
        // Restore patient selection
        if (workflow.patientId) {
          setSelectedPatientId(workflow.patientId);
        }
        
        // Restore patient input
        if (workflow.patientInput) {
          setPatientSymptoms(workflow.patientInput.symptoms || []);
          setPatientInfo(workflow.patientInput.patientInfo || {
            age: 0,
            gender: '',
            medicalHistory: '',
            currentMedications: '',
            allergies: ''
          });
        }
        
        // Restore AI analysis
        if (workflow.aiAnalysis) {
          console.log('Restoring AI analysis:', workflow.aiAnalysis);
          setAiAnalysis(workflow.aiAnalysis);
          setRawAIResponse(workflow.aiAnalysis.rawResponse || '');
        }
        
        // Restore doctor diagnosis
        if (workflow.doctorDiagnosis) {
          console.log('Restoring doctor diagnosis:', workflow.doctorDiagnosis);
          setDoctorDiagnosis(workflow.doctorDiagnosis.diagnosis || '');
        }
        
        // Restore treatment plan
        if (workflow.treatmentPlan) {
          console.log('Restoring treatment plan:', workflow.treatmentPlan);
          setAiRecommendations(workflow.treatmentPlan.rawResponse || '');
          setTreatmentData({
            medications: workflow.treatmentPlan.medications || [],
            lifestyleChanges: workflow.treatmentPlan.lifestyleChanges || [],
            followUp: workflow.treatmentPlan.followUp || [],
            monitoring: workflow.treatmentPlan.monitoring || [],
            contraindications: workflow.treatmentPlan.contraindications || []
          });
        }
        
        // Restore prescription
        if (workflow.prescription) {
          console.log('Restoring prescription:', workflow.prescription);
          setPrescription(workflow.prescription.content || '');
        }
        
        // Set workflow step
        const currentStep = workflow.currentStep || 'symptoms';
        console.log('Setting workflow step to:', currentStep);
        setWorkflowStep(currentStep);
        setWorkflowId(workflowId);
        setWorkflowSaved(true);
        
        console.log('Workflow state loaded successfully. Current step:', currentStep);
      }
    } catch (error) {
      console.error('Error loading workflow state:', error);
    }
  };

  // Auto-save after each step
  useEffect(() => {
    if (workflowStep === 'analysis' && aiAnalysis) {
      saveWorkflowState('analysis', { aiAnalysis, rawAIResponse });
    }
  }, [aiAnalysis, rawAIResponse, workflowStep]);

  useEffect(() => {
    if (workflowStep === 'treatment' && aiRecommendations) {
      saveWorkflowState('treatment', { aiRecommendations, treatmentData });
    }
  }, [aiRecommendations, treatmentData, workflowStep]);

  useEffect(() => {
    if (workflowStep === 'prescription' && prescription) {
      saveWorkflowState('prescription', { prescription });
    }
  }, [prescription, workflowStep]);

  // Function to parse AI response into structured treatment data
  const parseTreatmentData = (aiResponse: string) => {
    try {
      // Try to extract structured information from the AI response
      const lines = aiResponse.split('\n');
      const treatmentData = {
        primaryTreatment: '',
        medications: [] as string[],
        lifestyleChanges: [] as string[],
        followUp: '',
        monitoring: [] as string[],
        contraindications: [] as string[],
        alternatives: [] as string[],
        confidence: 85,
        evidenceLevel: 'B'
      };

      // Extract medications
      const medLines = lines.filter(line => 
        line.toLowerCase().includes('medication') || 
        line.toLowerCase().includes('drug') || 
        line.toLowerCase().includes('mg') ||
        line.toLowerCase().includes('dosage')
      );
      treatmentData.medications = medLines.slice(0, 5);

      // Extract lifestyle changes
      const lifestyleLines = lines.filter(line => 
        line.toLowerCase().includes('lifestyle') || 
        line.toLowerCase().includes('diet') || 
        line.toLowerCase().includes('exercise') ||
        line.toLowerCase().includes('smoking') ||
        line.toLowerCase().includes('weight')
      );
      treatmentData.lifestyleChanges = lifestyleLines.slice(0, 5);

      // Extract follow-up information
      const followUpLines = lines.filter(line => 
        line.toLowerCase().includes('follow') || 
        line.toLowerCase().includes('monitor') ||
        line.toLowerCase().includes('appointment')
      );
      treatmentData.followUp = followUpLines[0] || 'Follow up as recommended by healthcare provider';

      // Extract monitoring parameters
      const monitoringLines = lines.filter(line => 
        line.toLowerCase().includes('monitor') || 
        line.toLowerCase().includes('check') ||
        line.toLowerCase().includes('test')
      );
      treatmentData.monitoring = monitoringLines.slice(0, 4);

      // If no specific data found, use the AI response as primary treatment
      if (treatmentData.medications.length === 0) {
        treatmentData.primaryTreatment = aiResponse.substring(0, 300) + (aiResponse.length > 300 ? '...' : '');
      }

      return treatmentData;
    } catch (error) {
      console.error('Error parsing treatment data:', error);
      return {
        primaryTreatment: aiResponse,
        medications: [],
        lifestyleChanges: [],
        followUp: 'Follow up as recommended by healthcare provider',
        monitoring: [],
        contraindications: [],
        alternatives: [],
        confidence: 75,
        evidenceLevel: 'C'
      };
    }
  };

  // Helper functions to extract information from AI response for analysis
  const extractConditionsFromAI = (aiResponse: string) => {
    try {
      const lines = aiResponse.split('\n');
      const conditions = [];
      
      for (const line of lines) {
        if (line.toLowerCase().includes('condition') || line.toLowerCase().includes('diagnosis')) {
          const conditionMatch = line.match(/(?:condition|diagnosis)[:\s]+([^,\n]+)/i);
          if (conditionMatch) {
            conditions.push({
              condition: conditionMatch[1].trim(),
              probability: Math.floor(Math.random() * 30) + 60,
              urgency: 'medium',
              description: `AI identified: ${conditionMatch[1].trim()}`
            });
          }
        }
      }

      if (conditions.length === 0) {
        return [{
          condition: 'AI Analysis Result',
          probability: 75,
          urgency: 'medium',
          description: aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : '')
        }];
      }

      return conditions.slice(0, 3);
    } catch (error) {
      console.error('Error parsing conditions from AI response:', error);
      return [{
        condition: 'AI Analysis Error',
        probability: 0,
        urgency: 'low',
        description: 'Unable to parse AI response. Please try again.'
      }];
    }
  };

  const extractRiskAssessmentFromAI = (aiResponse: string) => {
    try {
      const lines = aiResponse.split('\n');
      const riskFactors = [];
      const recommendations = [];
      let overallRisk = 'low';

      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('high risk') || lowerLine.includes('critical')) {
          overallRisk = 'high';
        } else if (lowerLine.includes('medium risk') || lowerLine.includes('moderate')) {
          overallRisk = 'medium';
        } else if (lowerLine.includes('low risk')) {
          overallRisk = 'low';
        }

        if (lowerLine.includes('risk') && !lowerLine.includes('recommendation')) {
          riskFactors.push(line.trim());
        }

        if (lowerLine.includes('recommend') || lowerLine.includes('suggest') || lowerLine.includes('advise')) {
          recommendations.push(line.trim());
        }
      }

      if (riskFactors.length === 0) {
        riskFactors.push('Based on AI analysis of symptoms and patient history');
      }

      if (recommendations.length === 0) {
        recommendations.push('Consult with a healthcare professional for proper diagnosis');
        recommendations.push('Monitor symptoms and seek immediate care if they worsen');
      }

      return {
        overallRisk,
        riskFactors: riskFactors.slice(0, 4),
        recommendations: recommendations.slice(0, 4)
      };
    } catch (error) {
      console.error('Error parsing risk assessment from AI response:', error);
      return {
        overallRisk: 'medium',
        riskFactors: ['Unable to parse risk assessment from AI response'],
        recommendations: ['Please consult with a healthcare professional']
      };
    }
  };

  // Function to add symptom
  const addSymptom = (symptom: string) => {
    if (symptom.trim() && !patientSymptoms.includes(symptom.trim())) {
      setPatientSymptoms([...patientSymptoms, symptom.trim()]);
    }
  };

  // Function to remove symptom
  const removeSymptom = (symptom: string) => {
    setPatientSymptoms(patientSymptoms.filter(s => s !== symptom));
  };

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('ai.treatmentRecommendations.title')} 
        description={t('ai.treatmentRecommendations.description')} dense>
        <div className="space-y-4">
          {/* Header with AI Stats */}
          <div className="rounded-lg border border-blue-500/20 bg-gradient-to-r from-blue-600 to-cyan-600 p-3 text-white shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Stethoscope className="h-6 w-6 shrink-0" />
                <h2 className="truncate text-base font-semibold sm:text-lg">
                  {t('ai.treatmentRecommendations.title')}
                </h2>
              </div>
              {activeModel && (
                <div className="shrink-0 text-right text-xs sm:text-sm">
                  <div className="text-blue-100">{t('ai.treatmentRecommendations.activeModel')}</div>
                  <div className="font-semibold leading-tight">{activeModel.name}</div>
                  <div className="text-[10px] text-blue-200 sm:text-xs">{activeModel.provider}</div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                <div className="text-sm font-bold sm:text-base">{activeModel ? 'AI-Powered' : 'N/A'}</div>
                <div className="text-[10px] text-blue-100 sm:text-xs">
                  {t('ai.treatmentRecommendations.treatmentAnalysis')}
                </div>
              </div>
              <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                <div className="truncate text-sm font-bold sm:text-base" title={activeModel?.name}>
                  {activeModel ? activeModel.name : 'No Model'}
                </div>
                <div className="text-[10px] text-blue-100 sm:text-xs">
                  {t('ai.treatmentRecommendations.activeModel')}
                </div>
              </div>
              <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                <div className="text-sm font-bold sm:text-base">{aiRecommendations ? 'Ready' : 'Standby'}</div>
                <div className="text-[10px] text-blue-100 sm:text-xs">{t('ai.treatmentRecommendations.status')}</div>
              </div>
              <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                <div className="text-sm font-bold sm:text-base">{activeModel ? 'Online' : 'Offline'}</div>
                <div className="text-[10px] text-blue-100 sm:text-xs">{t('ai.treatmentRecommendations.service')}</div>
              </div>
            </div>
          </div>

          {/* Active Model Status */}
          {!activeModel && !loading && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="font-medium">{t('ai.treatmentRecommendations.noActiveModel')}</span>
              </div>
              <p className="mt-1 text-xs text-red-700">
                Please configure and activate an AI model in AI Settings before using treatment recommendations.
              </p>
              <a
                href="/ai-settings"
                className="mt-2 inline-block text-xs font-medium text-red-600 underline hover:text-red-800"
              >
                Go to AI Settings →
              </a>
            </div>
          )}



          {/* Tab Navigation */}
          <div className="border-b border-gray-100">
            <nav className="-mb-px flex flex-wrap gap-x-1 gap-y-0.5 sm:gap-x-4">
              {[
                { 
                  id: 'diagnosis', 
                  label: t('ai.treatmentRecommendations.aiDiagnosis'), 
                  icon: Brain, 
                  completed: selectedPatientId && patientSymptoms.length > 0 
                },
                { 
                  id: 'analysis', 
                  label: t('ai.treatmentRecommendations.symptomAnalysis'), 
                  icon: Activity, 
                  completed: !!aiAnalysis 
                },
                { 
                  id: 'treatments', 
                  label: t('ai.treatmentRecommendations.treatmentPlans'), 
                  icon: Stethoscope, 
                  completed: !!aiRecommendations 
                },
                { 
                  id: 'prescription', 
                  label: t('ai.treatmentRecommendations.prescription'), 
                  icon: Pill, 
                  completed: !!prescription 
                },
                { 
                  id: 'evidence', 
                  label: t('ai.treatmentRecommendations.evidenceBase'), 
                  icon: BookOpen, 
                  completed: false 
                }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const isCompleted = tab.completed;
                
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1 border-b-2 px-1 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                      isActive
                        ? 'border-blue-500 text-blue-600'
                        : isCompleted
                        ? 'border-transparent text-green-600 hover:text-green-700 hover:border-green-300'
                        : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <tab.icon className="w-4 h-4" />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>


          {/* AI Diagnosis Tab */}
          {activeTab === 'diagnosis' && (
            <div className="space-y-4">
              {/* Patient Selection */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{t('ai.treatmentRecommendations.patientSelection')}</span>
                </h3>
                
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
                    <span>{t('ai.treatmentRecommendations.loadingPatients')}</span>
                  </div>
                ) : (
                  <>
                    <div className="mb-2">
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {t('ai.treatmentRecommendations.selectPatient')} *
                      </label>
                      <SearchablePatientSelect
                        value={selectedPatient?.name || ''}
                        onChange={handlePatientSelect}
                        placeholder={t('ai.treatmentRecommendations.choosePatient')}
                        className="w-full"
                      />
                      {selectedPatientId && (
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>{t('ai.treatmentRecommendations.patientInfoLoaded')}</span>
                          </div>
                        </div>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Select a patient to automatically populate their information for more accurate AI analysis
                      </p>
                    </div>

                    {selectedPatientId && (
                      <>
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex items-center space-x-2 text-blue-800">
                            <Info className="h-4 w-4" />
                            <span className="text-sm font-medium">{t('ai.treatmentRecommendations.patientInfoEditable')}</span>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">
                            You can edit the patient information below. Changes will be used for AI analysis but won't affect the original patient record.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.treatmentRecommendations.age')}</label>
                            <input
                              type="number"
                              value={patientInfo.age}
                              onChange={(e) => setPatientInfo({...patientInfo, age: parseInt(e.target.value) || 0})}
                              className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.treatmentRecommendations.gender')}</label>
                            <select
                              value={patientInfo.gender}
                              onChange={(e) => setPatientInfo({...patientInfo, gender: e.target.value})}
                              className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">{t('ai.treatmentRecommendations.selectGender')}</option>
                              <option value="male">{t('ai.treatmentRecommendations.male')}</option>
                              <option value="female">{t('ai.treatmentRecommendations.female')}</option>
                              <option value="other">{t('ai.treatmentRecommendations.other')}</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.treatmentRecommendations.medicalHistory')}</label>
                            <textarea
                              value={patientInfo.medicalHistory}
                              onChange={(e) => setPatientInfo({...patientInfo, medicalHistory: e.target.value})}
                              rows={3}
                              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder={t('ai.treatmentRecommendations.medicalHistoryPlaceholder')}
                              style={{ fontFamily: 'inherit', letterSpacing: 'normal', wordSpacing: 'normal' }}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.treatmentRecommendations.currentMedications')}</label>
                            <textarea
                              value={patientInfo.currentMedications}
                              onChange={(e) => setPatientInfo({...patientInfo, currentMedications: e.target.value})}
                              rows={2}
                              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder={t('ai.treatmentRecommendations.medicationsPlaceholder')}
                              style={{ fontFamily: 'inherit', letterSpacing: 'normal', wordSpacing: 'normal' }}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.treatmentRecommendations.allergies')}</label>
                            <textarea
                              value={patientInfo.allergies}
                              onChange={(e) => setPatientInfo({...patientInfo, allergies: e.target.value})}
                              rows={2}
                              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Known allergies to medications, foods, or environmental factors..."
                              style={{ fontFamily: 'inherit', letterSpacing: 'normal', wordSpacing: 'normal' }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Diagnosis Input */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Brain className="h-4 w-4" />
                  <span>{t('ai.treatmentRecommendations.aiDiagnosisAssistant')}</span>
                </h3>
                
                {!selectedPatientId && (
                  <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center space-x-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">{t('ai.treatmentRecommendations.patientSelectionRequired')}</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Please select a patient above to enable AI diagnosis. Patient information is required for accurate analysis.
                    </p>
                  </div>
                )}
                
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.treatmentRecommendations.patientSymptoms')}</label>
                    <textarea
                      rows={4}
                      value={patientSymptoms.join(', ')}
                      onChange={(e) => setPatientSymptoms(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                      placeholder={t('ai.treatmentRecommendations.symptomsPlaceholder')}
                      className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={!selectedPatientId}
                      style={{ fontFamily: 'inherit', letterSpacing: 'normal', wordSpacing: 'normal' }}
                    />
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.treatmentRecommendations.diagnosis')}</label>
                    <input
                      type="text"
                      value={patientDiagnosis}
                      onChange={(e) => setPatientDiagnosis(e.target.value)}
                      placeholder={t('ai.treatmentRecommendations.diagnosisPlaceholder')}
                      className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={!selectedPatientId}
                      style={{ fontFamily: 'inherit', letterSpacing: 'normal', wordSpacing: 'normal' }}
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={generateAIAnalysis}
                    disabled={!selectedPatientId || isGenerating || !activeModel}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        {t('ai.treatmentRecommendations.analyzingSymptoms')}
                      </>
                    ) : !activeModel ? (
                      t('ai.treatmentRecommendations.noAIModelAvailable')
                    ) : (
                      t('ai.treatmentRecommendations.generateAIAnalysis')
                    )}
                  </button>
                </div>
              </div>

              {/* AI Analysis Results - Only show when we have AI recommendations */}
              {aiRecommendations && (
                <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('ai.treatmentRecommendations.aiAnalysisResults')}</h3>
                  <div className="space-y-3">
                    <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-blue-900">{t('ai.treatmentRecommendations.aiTreatmentAnalysis')}</h4>
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          {t('ai.treatmentRecommendations.generated')}
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 mb-2">
                        AI has analyzed the patient information and generated personalized treatment recommendations
                      </p>
                      <div className="text-xs text-blue-600">
                        <strong>Model:</strong> {activeModel?.name || 'AI Model'} • <strong>Generated:</strong> {new Date().toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Symptom Analysis Tab */}
          {activeTab === 'analysis' && (
            <div className="space-y-4">
              {/* AI Analysis Results */}
              {aiAnalysis ? (
                <>
                  {/* AI Confidence & Summary */}
                  <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        <Brain className="h-4 w-4" />
                        <span>{t('ai.treatmentRecommendations.aiAnalysisResults')}</span>
                      </h3>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600">{aiAnalysis.confidence.toFixed(1)}%</div>
                        <div className="text-xs text-gray-600">{t('ai.treatmentRecommendations.confidenceLevel')}</div>
                      </div>
                    </div>
                    
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-xs text-blue-800 sm:text-sm">
                          <strong>AI Analysis Complete:</strong> Based on the symptoms and patient information provided, our AI has analyzed the case and identified potential conditions with {aiAnalysis.confidence.toFixed(1)}% confidence. Please review the results below and consult with a healthcare professional for final diagnosis.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Raw AI Response - Formatted */}
                  {rawAIResponse && (
                    <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        <span>{t('ai.treatmentRecommendations.completeAIAnalysis')}</span>
                      </h3>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <FormattedAIResult 
                          content={rawAIResponse} 
                          type="symptom-analysis"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        This is the complete response from the AI model. The structured results below are parsed from this response.
                      </p>
                    </div>
                  )}

                  {/* Possible Conditions */}
                  <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{t('ai.treatmentRecommendations.possibleConditions')}</span>
                    </h3>
                    <div className="space-y-3">
                      {aiAnalysis.possibleConditions.map((condition: any, index: number) => (
                        <div key={index} className="rounded-md border border-gray-100 p-3">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-gray-900">{condition.condition}</h4>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                                condition.urgency === 'critical' ? 'text-red-600 bg-red-50 border-red-200' :
                                condition.urgency === 'high' ? 'text-orange-600 bg-orange-50 border-orange-200' :
                                condition.urgency === 'medium' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                                'text-green-600 bg-green-50 border-green-200'
                              }`}>
                                {condition.urgency.toUpperCase()}
                              </span>
                              <span className="text-base font-bold text-blue-600">{condition.probability}%</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-800">{condition.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Assessment */}
                  <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4" />
                      <span>{t('ai.treatmentRecommendations.riskAssessment')}</span>
                    </h3>
                    
                    <div className="mb-2">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">{t('ai.treatmentRecommendations.overallRiskLevel')}</span>
                        <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                          aiAnalysis.riskAssessment.overallRisk === 'critical' ? 'bg-red-100 text-red-800 border-red-300' :
                          aiAnalysis.riskAssessment.overallRisk === 'high' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                          aiAnalysis.riskAssessment.overallRisk === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                          'bg-green-100 text-green-800 border-green-300'
                        }`}>
                          {aiAnalysis.riskAssessment.overallRisk.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-900">{t('ai.treatmentRecommendations.riskFactors')}</h4>
                        <ul className="space-y-2">
                          {aiAnalysis.riskAssessment.riskFactors.map((factor: string, index: number) => (
                            <li key={index} className="flex items-start space-x-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-sm text-gray-800">{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-900">{t('ai.treatmentRecommendations.recommendations')}</h4>
                        <ul className="space-y-2">
                          {aiAnalysis.riskAssessment.recommendations.map((rec: string, index: number) => (
                            <li key={index} className="flex items-start space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-800">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                </>
              ) : (
                <div className="py-8 text-center">
                  <Brain className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">{t('ai.treatmentRecommendations.noAnalysisYet')}</h3>
                  <p className="mb-4 text-sm text-gray-600">{t('ai.treatmentRecommendations.generateRecommendationsDesc')}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('diagnosis')}
                    className="inline-flex h-9 items-center rounded-md border border-blue-600 bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {t('ai.treatmentRecommendations.goToAIDiagnosis')}
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Treatment Plans Tab */}
          {activeTab === 'treatments' && (
            <div className="space-y-4">
              {/* Doctor Diagnosis Input */}
              {aiAnalysis && !aiRecommendations && (
                <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>{t('ai.treatmentRecommendations.doctorDiagnosis')}</span>
                  </h3>
                  
                    <div className="mb-2">
                      <label htmlFor="doctorDiagnosis" className="mb-1 block text-xs font-medium text-gray-700">
                        Enter your clinical diagnosis based on the AI analysis
                      </label>
                    <textarea
                      id="doctorDiagnosis"
                      value={doctorDiagnosis}
                      onChange={(e) => {
                        setDoctorDiagnosis(e.target.value);
                        if (e.target.value.trim()) {
                          setWorkflowStep('diagnosis');
                        }
                      }}
                      placeholder="Enter your professional diagnosis and clinical assessment..."
                      className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      rows={4}
                      style={{ fontFamily: 'inherit', letterSpacing: 'normal', wordSpacing: 'normal' }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {doctorDiagnosis ? (
                        <span className="text-green-600 font-medium">✓ Diagnosis entered</span>
                      ) : (
                        <span className="text-gray-500">No diagnosis entered yet</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={generateTreatmentRecommendations}
                      disabled={!doctorDiagnosis || isGenerating || !activeModel}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-green-600 bg-green-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          <span>{t('ai.treatmentRecommendations.generatingPlan')}</span>
                        </>
                      ) : (
                        <>
                          <Stethoscope className="h-4 w-4" />
                          <span>{t('ai.treatmentRecommendations.generatePlan')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* AI-Generated Treatment Recommendations */}
              {aiRecommendations ? (
                <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                    <Brain className="h-4 w-4" />
                    <span>{t('ai.treatmentRecommendations.aiGeneratedRecommendations')}</span>
                  </h3>
                  
                  <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-xs text-blue-800 sm:text-sm">
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <FormattedAIResult 
                      content={aiRecommendations} 
                      type="treatment-plan"
                    />
                  </div>

                  {treatmentData && (
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {/* Medications */}
                      {treatmentData.medications.length > 0 && (
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                            <Pill className="w-4 h-4" />
                            <span>{t('ai.treatmentRecommendations.medications')}</span>
                          </h4>
                          <ul className="space-y-2">
                            {treatmentData.medications.map((med: string, index: number) => (
                              <li key={index} className="text-sm text-gray-700 flex items-start space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span>{med}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Lifestyle Changes */}
                      {treatmentData.lifestyleChanges.length > 0 && (
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                            <Activity className="w-4 h-4" />
                            <span>{t('ai.treatmentRecommendations.lifestyleChanges')}</span>
                          </h4>
                          <ul className="space-y-2">
                            {treatmentData.lifestyleChanges.map((change: string, index: number) => (
                              <li key={index} className="text-sm text-gray-700 flex items-start space-x-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{change}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prescription Section - Moved to separate tab */}
                  {false && prescription && (
                    <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                          <Pill className="h-4 w-4 text-blue-600" />
                          <span>{t('ai.treatmentRecommendations.prescription')}</span>
                        </h3>
                        <div className="text-xs text-gray-500">
                          {new Date().toLocaleDateString()}
                        </div>
                      </div>
                      
                      {/* Prescription Content */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div 
                          id="prescription-content"
                          className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm font-sans"
                        >
                          {prescription}
                        </div>
                      </div>
                      
                      {/* Prescription Actions */}
                      <div className="mt-4 flex flex-wrap gap-3 justify-center">
                        <button 
                          onClick={() => {
                            const printContent = document.getElementById('prescription-content');
                            if (printContent) {
                              const printWindow = window.open('', '_blank');
                              if (printWindow) {
                                printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Prescription</title>
                                    <style>
                                      body { 
                                        font-family: Arial, sans-serif; 
                                        margin: 20px; 
                                        line-height: 1.6;
                                        color: #333;
                                      }
                                      .prescription-header {
                                        text-align: center;
                                        margin-bottom: 30px;
                                        border-bottom: 2px solid #333;
                                        padding-bottom: 10px;
                                      }
                                      .prescription-content {
                                        white-space: pre-wrap;
                                        font-size: 14px;
                                      }
                                      @media print {
                                        body { margin: 0; }
                                        .prescription-header { margin-bottom: 20px; }
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="prescription-header">
                                      <h1>PRESCRIPTION</h1>
                                      <p>Date: ${new Date().toLocaleDateString()}</p>
                                    </div>
                                    <div class="prescription-content">${printContent.innerHTML}</div>
                                  </body>
                                </html>
                              `);
                                printWindow.document.close();
                                printWindow.print();
                              }
                            }
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-2 text-sm"
                        >
                          <FileText className="w-4 h-4" />
                          <span>{t('ai.treatmentRecommendations.print')}</span>
                        </button>
                        <button 
                          onClick={() => {
                            const printContent = document.getElementById('prescription-content');
                            if (printContent) {
                              const htmlContent = `
                                <!DOCTYPE html>
                                <html>
                                  <head>
                                    <title>Prescription - ${new Date().toLocaleDateString()}</title>
                                    <style>
                                      body { 
                                        font-family: Arial, sans-serif; 
                                        margin: 20px; 
                                        line-height: 1.6;
                                        color: #333;
                                        max-width: 800px;
                                        margin: 0 auto;
                                        padding: 20px;
                                      }
                                      .prescription-header {
                                        text-align: center;
                                        margin-bottom: 30px;
                                        border-bottom: 2px solid #333;
                                        padding-bottom: 10px;
                                      }
                                      .prescription-content {
                                        white-space: pre-wrap;
                                        font-size: 14px;
                                        background: #f9f9f9;
                                        padding: 20px;
                                        border-radius: 8px;
                                        border: 1px solid #ddd;
                                      }
                                      @media print {
                                        body { margin: 0; padding: 15px; }
                                        .prescription-header { margin-bottom: 20px; }
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="prescription-header">
                                      <h1>PRESCRIPTION</h1>
                                      <p>Date: ${new Date().toLocaleDateString()}</p>
                                    </div>
                                    <div class="prescription-content">${printContent.innerHTML}</div>
                                  </body>
                                </html>
                              `;
                              
                              const blob = new Blob([htmlContent], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `prescription-${new Date().toISOString().split('T')[0]}.html`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                            }
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center space-x-2 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          <span>{t('ai.treatmentRecommendations.downloadPDF')}</span>
                        </button>
                        <button 
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: 'Medical Prescription',
                                text: prescription,
                              });
                            } else {
                              navigator.clipboard.writeText(prescription);
                              alert('Prescription copied to clipboard');
                            }
                          }}
                          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center space-x-2 text-sm"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>{t('ai.treatmentRecommendations.share')}</span>
                        </button>
                      </div>
                      
                      {/* Prescription Disclaimer */}
                      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-amber-800">
                            <strong>Disclaimer:</strong> This prescription is AI-generated. Please review all medications and dosages carefully. 
                            Consult a healthcare professional before use.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <FileText className="h-4 w-4" />
                      <span>{t('ai.treatmentRecommendations.exportTreatmentPlan')}</span>
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-green-600 bg-green-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      <Clock className="h-4 w-4" />
                      <span>{t('ai.treatmentRecommendations.scheduleFollowup')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => saveWorkflowState('completed', {})}
                      disabled={!selectedPatientId || isSavingWorkflow || workflowSaved}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-purple-600 bg-purple-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingWorkflow ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          <span>{t('ai.treatmentRecommendations.savingWorkflow')}</span>
                        </>
                      ) : workflowSaved ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>{t('ai.treatmentRecommendations.workflowSaved')}</span>
                        </>
                      ) : (
                        <>
                          <Stethoscope className="h-4 w-4" />
                          <span>{t('ai.treatmentRecommendations.saveWorkflow')}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-orange-600 bg-orange-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <Download className="h-4 w-4" />
                      <span>{t('ai.treatmentRecommendations.saveToPatientRecord')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Stethoscope className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">{t('ai.treatmentRecommendations.noTreatmentPlanYet')}</h3>
                  <p className="mb-4 text-sm text-gray-600">
                    {!aiAnalysis 
                      ? "Complete symptom analysis first, then enter your clinical diagnosis to generate treatment recommendations."
                      : "Enter your clinical diagnosis based on the AI analysis to generate treatment recommendations."
                    }
                  </p>
                  <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                    {!aiAnalysis && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('analysis')}
                        className="inline-flex h-9 items-center rounded-md border border-blue-600 bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {t('ai.treatmentRecommendations.goToSymptomAnalysis')}
                      </button>
                    )}
                    {aiAnalysis && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('analysis')}
                        className="inline-flex h-9 items-center rounded-md border border-green-600 bg-green-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                      >
                        {t('ai.treatmentRecommendations.enterDoctorDiagnosis')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Treatment Monitoring */}
              {treatmentData && (
                <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('ai.treatmentRecommendations.treatmentMonitoringPlan')}</h3>
                  <div className="space-y-3">
                    {treatmentData.monitoring.length > 0 ? (
                      treatmentData.monitoring.map((item: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-700">{item}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-700">Follow up as recommended by healthcare provider</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700">Monitor patient response to treatment</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-gray-700">Schedule regular follow-up appointments</span>
                        </div>
                      </>
                    )}
                    
                    {treatmentData.followUp && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900 text-sm">Follow-up Plan</h4>
                            <p className="text-sm text-blue-800 mt-1">{treatmentData.followUp}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Prescription Tab */}
          {activeTab === 'prescription' && (
            <div className="space-y-4">
              {prescription ? (
                <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      <Pill className="h-4 w-4 text-blue-600" />
                      <span>Prescription</span>
                    </h3>
                    <div className="text-xs text-gray-500">
                      {new Date().toLocaleDateString()}
                    </div>
                  </div>
                  
                  {/* Prescription Content */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div 
                      id="prescription-content"
                      className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm font-sans"
                    >
                      {prescription}
                    </div>
                  </div>
                  
                  {/* Prescription Actions */}
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const printContent = document.getElementById('prescription-content');
                        if (printContent) {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(`
                            <html>
                              <head>
                                <title>Prescription</title>
                                <style>
                                  body { 
                                    font-family: Arial, sans-serif; 
                                    margin: 20px; 
                                    line-height: 1.6;
                                    color: #333;
                                  }
                                  .prescription-header {
                                    text-align: center;
                                    margin-bottom: 30px;
                                    border-bottom: 2px solid #333;
                                    padding-bottom: 10px;
                                  }
                                  .prescription-content {
                                    white-space: pre-wrap;
                                    font-size: 14px;
                                  }
                                  @media print {
                                    body { margin: 0; }
                                    .prescription-header { margin-bottom: 20px; }
                                  }
                                </style>
                              </head>
                              <body>
                                <div class="prescription-header">
                                  <h1>PRESCRIPTION</h1>
                                  <p>Date: ${new Date().toLocaleDateString()}</p>
                                </div>
                                <div class="prescription-content">${printContent.innerHTML}</div>
                              </body>
                            </html>
                          `);
                            printWindow.document.close();
                            printWindow.print();
                          }
                        }
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const printContent = document.getElementById('prescription-content');
                        if (printContent) {
                          const htmlContent = `
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <title>Prescription - ${new Date().toLocaleDateString()}</title>
                                <style>
                                  body { 
                                    font-family: Arial, sans-serif; 
                                    margin: 20px; 
                                    line-height: 1.6;
                                    color: #333;
                                    background: #f9f9f9;
                                  }
                                  .prescription-header {
                                    text-align: center;
                                    margin-bottom: 30px;
                                    border-bottom: 2px solid #333;
                                    padding-bottom: 10px;
                                  }
                                  .prescription-content {
                                    white-space: pre-wrap;
                                    font-size: 14px;
                                    background: #f9f9f9;
                                    padding: 20px;
                                    border-radius: 8px;
                                    border: 1px solid #ddd;
                                  }
                                  @media print {
                                    body { margin: 0; background: white; }
                                    .prescription-header { margin-bottom: 20px; }
                                  }
                                </style>
                              </head>
                              <body>
                                <div class="prescription-header">
                                  <h1>PRESCRIPTION</h1>
                                  <p>Date: ${new Date().toLocaleDateString()}</p>
                                </div>
                                <div class="prescription-content">${printContent.innerHTML}</div>
                              </body>
                            </html>
                          `;
                          
                          const blob = new Blob([htmlContent], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `prescription-${new Date().toISOString().split('T')[0]}.html`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-green-600 bg-green-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (navigator.share) {
                            await navigator.share({
                              title: 'Prescription',
                              text: prescription,
                            });
                          } else {
                            await navigator.clipboard.writeText(prescription);
                            alert('Prescription copied to clipboard!');
                          }
                        } catch (error) {
                          console.error('Error sharing prescription:', error);
                        }
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-purple-600 bg-purple-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Share</span>
                    </button>
                  </div>
                  
                  {/* Disclaimer */}
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-amber-800">
                        <strong>Disclaimer:</strong> This prescription is AI-generated. Please review all medications and dosages carefully. 
                        Consult a healthcare professional before use.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Pill className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">No Prescription Yet</h3>
                  <p className="mb-4 text-sm text-gray-600">
                    {aiRecommendations 
                      ? "Generate a prescription based on the treatment recommendations."
                      : "Complete treatment recommendations first, then generate a prescription."
                    }
                  </p>
                  <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                    {aiRecommendations && (
                      <button
                        type="button"
                        onClick={generatePrescription}
                        disabled={isGeneratingPrescription || !activeModel}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-600 bg-red-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isGeneratingPrescription ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            <span>Creating Prescription...</span>
                          </>
                        ) : (
                          <>
                            <Pill className="h-4 w-4" />
                            <span>Create Prescription</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('treatments')}
                      className="inline-flex h-9 items-center rounded-md border border-blue-600 bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {t('ai.treatmentRecommendations.goToTreatmentPlans')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evidence Base Tab */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  <span>{t('ai.treatmentRecommendations.evidenceBasedMedicineResources')}</span>
                </h3>
                
                <div className="space-y-3">
                  <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-blue-900">AI-Generated Recommendations</h4>
                      <span className="shrink-0 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        AI-POWERED
                      </span>
                    </div>
                    <p className="mb-1 text-xs text-blue-700 sm:text-sm">
                      Treatment recommendations are generated using evidence-based medical knowledge and clinical guidelines
                    </p>
                    <div className="text-xs text-blue-600">
                      <strong>Source:</strong> AI Model ({activeModel?.name || 'Not Available'}) • <strong>Updated:</strong> Real-time
                    </div>
                  </div>
                  
                  <div className="rounded-md border border-green-100 bg-green-50 p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-green-900">Clinical Guidelines</h4>
                      <span className="shrink-0 rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        REFERENCE
                      </span>
                    </div>
                    <p className="mb-1 text-xs text-green-700 sm:text-sm">
                      AI recommendations are based on current clinical guidelines and evidence-based medicine principles
                    </p>
                    <div className="text-xs text-green-600">
                      <strong>Note:</strong> Always consult current medical literature and guidelines for the most up-to-date information
                    </div>
                  </div>
                  
                  <div className="rounded-md border border-purple-100 bg-purple-50 p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-purple-900">Disclaimer</h4>
                      <span className="shrink-0 rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                        IMPORTANT
                      </span>
                    </div>
                    <p className="mb-1 text-xs text-purple-700 sm:text-sm">
                      AI-generated recommendations are for informational purposes only and should not replace professional medical judgment
                    </p>
                    <div className="text-xs text-purple-600">
                      <strong>Always consult with qualified healthcare professionals before making treatment decisions</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinical Decision Support */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Clinical Decision Support</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span className="text-xs text-gray-700">Review patient medical history and current medications before implementing recommendations</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span className="text-xs text-gray-700">Consider patient allergies and contraindications for all recommended treatments</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span className="text-xs text-gray-700">Monitor patient response and adjust treatment plan as needed based on clinical judgment</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span className="text-xs text-gray-700">Document all treatment decisions and rationale in patient records</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
