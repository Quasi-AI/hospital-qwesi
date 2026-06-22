'use client';

import { useState, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles,
  MessageSquare,
  Brain,
  Zap
} from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { aiService } from '../../lib/ai-service';
import { aiConfigManager } from '../../lib/ai-config';
import { useTranslations } from '../hooks/useTranslations';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function AIAssistantPage() {
  const { t, translationsLoaded } = useTranslations();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Add welcome message when translations are loaded
  useEffect(() => {
    if (translationsLoaded && messages.length === 0) {
      setMessages([
        {
          id: '1',
          content: t('ai.assistant.welcomeMessage'),
          sender: 'ai',
          timestamp: new Date()
        }
      ]);
    }
  }, [translationsLoaded, t, messages.length]);

  // Function to detect if query is about database data
  const detectDataQuery = (query: string): { type: 'patient' | 'appointment' | 'prescription' | 'general', patientName?: string } => {
    const lowerQuery = query.toLowerCase();
    
    // Enhanced patient name extraction - try multiple patterns
    const extractPatientName = (query: string): string | undefined => {
      // Pattern 1: "patient [Name]" or "for [Name]" or "about [Name]"
      let match = query.match(/(?:patient|for|about|of|details?|information|medical|history|medications?|allergies?|appointments?|prescription)\s+(?:patient\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (match && match[1]) return match[1];
      
      // Pattern 2: "[Name]'s" (possessive)
      match = query.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'s/);
      if (match && match[1]) return match[1];
      
      // Pattern 3: "tell me about [Name]" or "show me [Name]"
      match = query.match(/(?:tell\s+me\s+about|show\s+me|what\s+about|information\s+about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (match && match[1]) return match[1];
      
      // Pattern 4: Just a name at the start (if query is short and contains a capitalized name)
      const words = query.split(/\s+/);
      if (words.length <= 5) {
        const capitalizedWords = words.filter(w => /^[A-Z][a-z]+$/.test(w));
        if (capitalizedWords.length >= 2) {
          return capitalizedWords.slice(0, 2).join(' ');
        } else if (capitalizedWords.length === 1 && words.length <= 3) {
          return capitalizedWords[0];
        }
      }
      
      return undefined;
    };
    
    // Check for prescription-related queries
    if (lowerQuery.includes('prescription') || lowerQuery.includes('prescribed') || 
        lowerQuery.includes('latest prescription') || lowerQuery.includes('last prescription') ||
        lowerQuery.includes('recent prescription') || lowerQuery.includes('medication prescribed')) {
      const patientName = extractPatientName(query);
      return { type: 'prescription', patientName };
    }
    
    // Check for patient-related queries
    if (lowerQuery.includes('patient') || lowerQuery.includes('patient\'s') || 
        lowerQuery.includes('medical') || lowerQuery.includes('medication') || 
        lowerQuery.includes('allergy') || lowerQuery.includes('history') ||
        lowerQuery.includes('details') || lowerQuery.includes('information') ||
        lowerQuery.includes('tell me about') || lowerQuery.includes('show me')) {
      const patientName = extractPatientName(query);
      if (patientName) {
        return { type: 'patient', patientName };
      }
      // If no name extracted but query seems patient-related, still try to search
      return { type: 'patient' };
    }
    
    // Check for appointment-related queries
    if (lowerQuery.includes('appointment') || lowerQuery.includes('schedule') || lowerQuery.includes('booking')) {
      return { type: 'appointment' };
    }
    
    // Check if query contains a capitalized name (potential patient name)
    const potentialName = extractPatientName(query);
    if (potentialName && potentialName.split(' ').length <= 3) {
      return { type: 'patient', patientName: potentialName };
    }
    
    return { type: 'general' };
  };

  // Function to fetch patient data
  const fetchPatientData = async (patientName?: string) => {
    try {
      let response;
      if (patientName) {
        // Search for specific patient
        response = await fetch(`/api/patients/search?q=${encodeURIComponent(patientName)}&limit=5`);
        if (response.ok) {
          const searchResults = await response.json();
          if (searchResults && searchResults.length > 0) {
            // Fetch full patient details using the patient ID
            const patientId = searchResults[0]._id;
            const fullResponse = await fetch(`/api/patients/${patientId}`);
            if (fullResponse.ok) {
              return await fullResponse.json();
            }
            // Fallback to search result if full fetch fails
            return searchResults[0];
          }
        }
        return null;
      } else {
        // Get all patients
        response = await fetch('/api/patients');
        if (response.ok) {
          const data = await response.json();
          return Array.isArray(data) ? data : (data.patients || []);
        }
        return [];
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
      return null;
    }
  };

  // Function to fetch appointment data
  const fetchAppointmentData = async (patientId?: string) => {
    try {
      const url = patientId 
        ? `/api/appointments?patientId=${patientId}`
        : '/api/appointments';
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        return data.appointments || data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching appointment data:', error);
      return [];
    }
  };

  // Function to fetch prescription data
  const fetchPrescriptionData = async (patientId?: string) => {
    try {
      const url = patientId 
        ? `/api/ai-results?patientId=${patientId}&type=prescription`
        : '/api/ai-results/debug?type=prescription';
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        // Handle both response formats
        if (data.results) {
          return data.results;
        } else if (data.allResults) {
          return data.allResults;
        } else if (Array.isArray(data)) {
          return data;
        }
        return [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching prescription data:', error);
      return [];
    }
  };

  const buildLocalAssistantResponse = (
    queryInfo: { type: 'patient' | 'appointment' | 'prescription' | 'general'; patientName?: string },
    contextData: string
  ) => {
    const trimmedContext = contextData.trim();
    if (trimmedContext) {
      const compactContext =
        trimmedContext.length > 2600
          ? `${trimmedContext.slice(0, 2600)}\n\n...additional records were found. Open the patient chart for the full details.`
          : trimmedContext;

      return [
        'I could not find an active AI model configuration, so I searched the platform records directly.',
        '',
        compactContext,
        '',
        'Please review the source chart before making clinical decisions. For emergency symptoms, direct the patient to urgent or emergency care immediately.',
      ].join('\n');
    }

    if (queryInfo.type === 'patient') {
      return queryInfo.patientName
        ? `I could not find patient records for ${queryInfo.patientName}. Check the spelling or search by patient ID, email, or phone number.`
        : 'I could not find matching patient records. Try asking with a patient name, patient ID, email, or phone number.';
    }

    if (queryInfo.type === 'appointment') {
      return 'I could not find appointment records matching that request. Try asking for appointments by patient name or open the appointments page for filtering.';
    }

    if (queryInfo.type === 'prescription') {
      return 'I could not find prescription records for that request. Try including the patient name or patient ID.';
    }

    return [
      'No active AI model is configured, so I cannot generate a full clinical AI answer yet.',
      'I can still help search patient, appointment, and prescription records from this assistant.',
      'For clinical safety: chest pain, severe bleeding, trouble breathing, stroke symptoms, seizures, fainting, confusion, or suicidal thoughts need urgent emergency care.',
      'Configure an active model in AI Settings to enable full AI responses.',
    ].join('\n');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get the active AI model
      const activeModel = await aiConfigManager.getActiveModel();
      
      // Detect if query is about database data
      const queryInfo = detectDataQuery(currentInput);
      let contextData = '';
      
      if (queryInfo.type === 'patient') {
        // Fetch patient data
        let patientData = null;
        if (queryInfo.patientName) {
          // Try to find the patient by name
          patientData = await fetchPatientData(queryInfo.patientName);
          
          // If not found, try searching without the name to show available patients
          if (!patientData || (Array.isArray(patientData) && patientData.length === 0)) {
            // Try alternative search - maybe the name format is different
            const nameParts = queryInfo.patientName.split(' ');
            if (nameParts.length > 1) {
              // Try searching with just first name
              patientData = await fetchPatientData(nameParts[0]);
            }
            // If still not found, get all patients to show available options
            if (!patientData || (Array.isArray(patientData) && patientData.length === 0)) {
              patientData = await fetchPatientData(); // Get all patients
            }
          }
        } else {
          // No specific patient name, get all patients
          patientData = await fetchPatientData();
        }
        
        if (patientData) {
          if (Array.isArray(patientData)) {
            contextData = `\n\nAvailable Patients (${patientData.length} total):\n${patientData.slice(0, 10).map((p: any) => 
              `- ${p.name} (ID: ${p.patientId}, Age: ${p.age || 'N/A'}, Email: ${p.email || 'N/A'})`
            ).join('\n')}`;
          } else {
            // Single patient - fetch full medical details
            const appointments = await fetchAppointmentData(patientData._id);
            
            // Fetch AI results for this patient (treatment plans, risk assessments, etc.)
            let aiResults = [];
            try {
              const aiResponse = await fetch(`/api/ai-results?patientId=${patientData._id}`);
              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                aiResults = aiData.results || [];
              }
            } catch (error) {
              console.error('Error fetching AI results:', error);
            }
            
            // Build comprehensive medical information
            const medicalHistory = Array.isArray(patientData.medicalHistory) 
              ? patientData.medicalHistory.join(', ') 
              : (patientData.medicalHistory || 'None recorded');
            
            const medications = Array.isArray(patientData.currentMedications)
              ? patientData.currentMedications.join(', ')
              : (patientData.currentMedications || 'None');
            
            const allergies = Array.isArray(patientData.allergies)
              ? patientData.allergies.join(', ')
              : (patientData.allergies || 'None');
            
            const bloodType = patientData.bloodType || 'Not recorded';
            const address = patientData.address || 'Not provided';
            const emergencyContact = patientData.emergencyContact 
              ? `${patientData.emergencyContact.name || 'N/A'} (${patientData.emergencyContact.phone || 'N/A'})`
              : 'Not provided';
            
            // Format AI results summary
            const aiResultsSummary = aiResults.length > 0
              ? `\n\nAI Analysis Results (${aiResults.length}):\n${aiResults.slice(0, 5).map((result: any) => 
                  `- ${result.type}: ${result.title} (${new Date(result.createdAt).toLocaleDateString()})`
                ).join('\n')}`
              : '';
            
            contextData = `\n\nCOMPREHENSIVE PATIENT MEDICAL INFORMATION:\n\nBasic Information:\n- Name: ${patientData.name}\n- Patient ID: ${patientData.patientId}\n- Age: ${patientData.age || 'N/A'}\n- Gender: ${patientData.gender || 'N/A'}\n- Date of Birth: ${patientData.dateOfBirth ? new Date(patientData.dateOfBirth).toLocaleDateString() : 'N/A'}\n- Blood Type: ${bloodType}\n\nContact Information:\n- Email: ${patientData.email || 'N/A'}\n- Phone: ${patientData.phone || 'N/A'}\n- Address: ${address}\n- Emergency Contact: ${emergencyContact}\n\nMedical History:\n- Medical History: ${medicalHistory}\n- Current Medications: ${medications}\n- Allergies: ${allergies}\n\nAppointments (${appointments.length} total):\n${appointments.slice(0, 10).map((apt: any) => 
              `- Date: ${new Date(apt.appointmentDate).toLocaleDateString()}, Time: ${apt.appointmentTime || 'N/A'}, Status: ${apt.status || 'N/A'}, Diagnosis: ${apt.diagnosis || 'No diagnosis'}, Notes: ${apt.notes || 'None'}`
            ).join('\n')}${aiResultsSummary}`;
          }
        }
      } else if (queryInfo.type === 'appointment') {
        // Fetch appointment data
        const appointments = await fetchAppointmentData();
        if (appointments.length > 0) {
          contextData = `\n\nAppointments (${appointments.length} total):\n${appointments.slice(0, 10).map((apt: any) => 
            `- Patient: ${apt.patientName || 'Unknown'}, Date: ${new Date(apt.appointmentDate).toLocaleDateString()}, Time: ${apt.appointmentTime || 'N/A'}, Status: ${apt.status || 'N/A'}`
          ).join('\n')}`;
        }
      } else if (queryInfo.type === 'prescription') {
        // Fetch prescription data
        let prescriptions = [];
        if (queryInfo.patientName) {
          // First find the patient
          const patientData = await fetchPatientData(queryInfo.patientName);
          if (patientData && !Array.isArray(patientData)) {
            // Fetch prescriptions for this specific patient
            prescriptions = await fetchPrescriptionData(patientData._id);
          } else if (Array.isArray(patientData) && patientData.length > 0) {
            // Try with first matching patient
            prescriptions = await fetchPrescriptionData(patientData[0]._id);
          }
        } else {
          // Fetch all prescriptions
          prescriptions = await fetchPrescriptionData();
        }
        
        if (prescriptions.length > 0) {
          // Sort by date (newest first)
          prescriptions.sort((a: any, b: any) => 
            new Date(b.createdAt || b.createdAt).getTime() - new Date(a.createdAt || a.createdAt).getTime()
          );
          
          const latestPrescription = prescriptions[0];
          const patientName = queryInfo.patientName || 'the patient';
          
          contextData = `\n\nPRESCRIPTION INFORMATION:\n\nLatest Prescription for ${patientName}:\n- Title: ${latestPrescription.title || 'Prescription'}\n- Date: ${new Date(latestPrescription.createdAt).toLocaleDateString()}\n- Prescription Details:\n${latestPrescription.content || 'No details available'}\n\n${prescriptions.length > 1 ? `\nTotal Prescriptions: ${prescriptions.length}\nRecent Prescriptions:\n${prescriptions.slice(0, 5).map((presc: any, idx: number) => 
            `${idx + 1}. ${presc.title || 'Prescription'} - ${new Date(presc.createdAt).toLocaleDateString()}`
          ).join('\n')}` : ''}`;
        } else {
          contextData = `\n\nNo prescriptions found${queryInfo.patientName ? ` for ${queryInfo.patientName}` : ''} in the database.`;
        }
      }
      
      // Build enhanced prompt with context
      const enhancedPrompt = `${t('ai.assistant.aiPrompt')} "${currentInput}". ${t('ai.assistant.aiPromptInstruction')}${contextData ? `\n\nUse the following information from the database to answer the question:${contextData}` : ''}\n\nPlease provide a helpful and accurate response based on the available information.`;

      if (!activeModel) {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: buildLocalAssistantResponse(queryInfo, contextData),
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
        return;
      }
      
      // Call the real AI service
      const result = await aiService.generateText({
        prompt: enhancedPrompt,
        modelId: activeModel.id,
        maxTokens: 800,
        temperature: 0.7
      });

      if (result.success && result.content) {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: result.content,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
      } else {
        // Fallback response if AI service fails
        const fallbackResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: t('ai.assistant.fallbackResponse'),
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, fallbackResponse]);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Error response
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: t('ai.assistant.errorResponse'),
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };



  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Show loading state if translations aren't loaded yet
  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title={t('ai.assistant.title')}
          description={t('ai.assistant.description')}
          dense
        >
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
            <p className="text-xs text-gray-600">{t('ai.assistant.loadingTranslations')}</p>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('ai.assistant.title')} 
        description={t('ai.assistant.description')} dense>
        {/* AI Assistant Header */}
        <div className="mb-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight">{t('ai.assistant.headerTitle')}</h2>
              <p className="text-xs text-blue-100/95">{t('ai.assistant.headerDescription')}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-white/15 pt-3 md:grid-cols-3 md:gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-yellow-300" />
              <span className="text-xs">{t('ai.assistant.symptomAnalysis')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 shrink-0 text-green-300" />
              <span className="text-xs">{t('ai.assistant.treatmentSuggestions')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 shrink-0 text-blue-300" />
              <span className="text-xs">{t('ai.assistant.medicalResearch')}</span>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
          {/* Chat Header */}
          <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-gray-900">{t('ai.assistant.chatTitle')}</h3>
                  <p className="text-xs text-gray-500">{t('ai.assistant.chatStatus')}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500">{t('ai.assistant.active')}</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto space-y-3 bg-gradient-to-b from-gray-50 to-white p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-xs rounded-xl px-3 py-2 shadow-sm lg:max-w-2xl ${
                    message.sender === 'user'
                      ? 'rounded-br-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                      : 'rounded-bl-sm border border-gray-100 bg-white text-gray-900'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.sender === 'ai' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm">
                        <Bot className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {message.sender === 'ai' ? (
                        <div className="space-y-2">
                          <div className="text-sm leading-relaxed">
                            {message.content.split('\n').map((line, idx) => {
                              const trimmed = line.trim();
                              
                              // Format headers
                              if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
                                const headerText = trimmed.replace(/\*\*/g, '');
                                return (
                                  <h4 key={idx} className="mt-2 mb-1.5 text-sm font-semibold text-gray-900 first:mt-0">
                                    {headerText}
                                  </h4>
                                );
                              }
                              
                              // Format bullet points
                              if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                                const bulletText = trimmed.replace(/^[-•]\s+/, '');
                                return (
                                  <div key={idx} className="flex items-start space-x-2 ml-2 my-1">
                                    <span className="text-blue-600 mt-1.5">•</span>
                                    <span className="flex-1">{bulletText}</span>
                                  </div>
                                );
                              }
                              
                              // Format numbered lists
                              if (/^\d+\.\s/.test(trimmed)) {
                                return (
                                  <div key={idx} className="flex items-start space-x-2 ml-2 my-1">
                                    <span className="text-blue-600 font-medium mt-0.5">{trimmed.match(/^\d+\./)?.[0]}</span>
                                    <span className="flex-1">{trimmed.replace(/^\d+\.\s+/, '')}</span>
                                  </div>
                                );
                              }
                              
                              // Regular paragraph
                              if (trimmed) {
                                return (
                                  <p key={idx} className="my-1.5 leading-relaxed">
                                    {trimmed}
                                  </p>
                                );
                              }
                              
                              return <br key={idx} />;
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      )}
                      <p className={`text-xs mt-2 opacity-70 ${
                        message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                    {message.sender === 'user' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
                        <User className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                <div className="max-w-xs rounded-xl rounded-bl-sm border border-gray-100 bg-white px-3 py-2 text-gray-900 shadow-sm lg:max-w-md">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"
                        aria-hidden
                      />
                      <span className="text-xs text-gray-600">{t('ai.assistant.aiThinking')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <div className="border-t border-gray-100 p-3">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={t('ai.assistant.placeholder')}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{t('ai.assistant.send')}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setInputMessage(t('ai.assistant.symptomCheckExample'))}
            className="rounded-lg border border-gray-100 bg-white p-3 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow"
          >
            <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-blue-100">
              <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h4 className="text-sm font-medium text-gray-900">{t('ai.assistant.symptomCheck')}</h4>
            <p className="text-xs text-gray-500">{t('ai.assistant.symptomCheckDesc')}</p>
          </button>

          <button
            type="button"
            onClick={() => setInputMessage(t('ai.assistant.treatmentInfoExample'))}
            className="rounded-lg border border-gray-100 bg-white p-3 text-left shadow-sm transition-all hover:border-green-200 hover:shadow"
          >
            <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-green-100">
              <Brain className="h-3.5 w-3.5 text-green-600" />
            </div>
            <h4 className="text-sm font-medium text-gray-900">{t('ai.assistant.treatmentInfo')}</h4>
            <p className="text-xs text-gray-500">{t('ai.assistant.treatmentInfoDesc')}</p>
          </button>

          <button
            type="button"
            onClick={() => setInputMessage(t('ai.assistant.lifestyleTipsExample'))}
            className="rounded-lg border border-gray-100 bg-white p-3 text-left shadow-sm transition-all hover:border-purple-200 hover:shadow"
          >
            <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-purple-100">
              <Zap className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <h4 className="text-sm font-medium text-gray-900">{t('ai.assistant.lifestyleTips')}</h4>
            <p className="text-xs text-gray-500">{t('ai.assistant.lifestyleTipsDesc')}</p>
          </button>

          <button
            type="button"
            onClick={() => setInputMessage(t('ai.assistant.medicationInfoExample'))}
            className="rounded-lg border border-gray-100 bg-white p-3 text-left shadow-sm transition-all hover:border-orange-200 hover:shadow"
          >
            <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-orange-100">
              <Bot className="h-3.5 w-3.5 text-orange-600" />
            </div>
            <h4 className="text-sm font-medium text-gray-900">{t('ai.assistant.medicationInfo')}</h4>
            <p className="text-xs text-gray-500">{t('ai.assistant.medicationInfoDesc')}</p>
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 rounded-lg border border-yellow-200/80 bg-yellow-50/90 p-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-yellow-400">
              <span className="text-[10px] font-bold text-white">!</span>
            </div>
            <div>
              <h4 className="text-xs font-medium text-yellow-900">{t('ai.assistant.disclaimerTitle')}</h4>
              <p className="mt-1 text-xs leading-relaxed text-yellow-800">{t('ai.assistant.disclaimerText')}</p>
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
