'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import SearchablePatientSelect from '../components/SearchablePatientSelect';
import { useTranslations } from '../hooks/useTranslations';
import { aiService } from '../../lib/ai-service';
import { aiConfigManager } from '../../lib/ai-config';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Download, 
  Share2, 
  FileText,
  Brain,
  BarChart3,
  Target,
  Zap,
  CheckCircle,
  AlertTriangle,
  Volume2,
  Settings,
  Headphones,
  MessageSquare,
  Users,
  Save
} from 'lucide-react';
import FormattedAIResult from '../components/FormattedAIResult';

export default function AIVoiceInputPage() {
  const { t, translationsLoaded } = useTranslations();
  const [activeTab, setActiveTab] = useState<'voice' | 'commands' | 'transcription' | 'settings'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [activeModel, setActiveModel] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Load active AI model on component mount
  useEffect(() => {
    const loadActiveModel = async () => {
      try {
        const model = await aiConfigManager.getActiveModel();
        setActiveModel(model);
        console.log('Active AI model loaded for voice input:', model);
      } catch (error) {
        console.error('Error loading active model:', error);
      }
    };

    loadActiveModel();
  }, []);

  // Check microphone permission and setup media recorder
  useEffect(() => {
    const setupMediaRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
        setAudioStream(stream);
        
        // Try to find a supported mime type
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
        
        const recorder = new MediaRecorder(stream, {
          mimeType: mimeType
        });
        
        let chunks: Blob[] = [];
        
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
            setAudioChunks([...chunks]);
          }
        };
        
        recorder.onstart = () => {
          console.log('MediaRecorder started');
          chunks = []; // Reset chunks when starting
          setAudioChunks([]);
          setIsRecording(true);
          setTranscription(''); // Clear previous transcription
          setInterimTranscript(''); // Clear interim transcript
          
          // Start speech recognition if available
          // @ts-ignore - Web Speech API types may not be available
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (SpeechRecognition) {
            // @ts-ignore
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            let isStillRecording = true; // Track recording state locally

            recognition.onresult = (event: any) => {
              let interim = '';
              let final = '';

              for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                  final += transcript + ' ';
                } else {
                  interim += transcript;
                }
              }

              // Update interim transcript for real-time display
              setInterimTranscript(interim);
              
              // Update final transcript
              if (final) {
                setTranscription(prev => prev + final);
              }
            };

            recognition.onerror = (event: any) => {
              console.error('Speech recognition error:', event.error);
              // Don't show error for 'no-speech' as it's common
            };

            recognition.onend = () => {
              // Restart recognition if still recording
              if (isStillRecording) {
                try {
                  recognition.start();
                } catch (error) {
                  console.error('Error restarting recognition:', error);
                }
              }
            };

            setSpeechRecognition(recognition);
            
            // Update isStillRecording when recording stops
            const originalStop = recorder.stop.bind(recorder);
            recorder.stop = () => {
              isStillRecording = false;
              if (recognition) {
                try {
                  recognition.stop();
                } catch (error) {
                  console.error('Error stopping recognition:', error);
                }
              }
              originalStop();
            };
            
            try {
              recognition.start();
            } catch (error) {
              console.error('Error starting speech recognition:', error);
            }
          }
        };
        
        recorder.onstop = async () => {
          console.log('MediaRecorder stopped');
          setIsRecording(false);
          
          // Automatically switch to transcription tab
          setActiveTab('transcription');
          
          // Stop speech recognition
          if (speechRecognition) {
            try {
              speechRecognition.stop();
            } catch (error) {
              console.error('Error stopping speech recognition:', error);
            }
          }
          
          // Get current transcription (use state updater to get latest values)
          setTranscription(currentTranscription => {
            setInterimTranscript(currentInterim => {
              const fullTranscript = (currentTranscription + currentInterim).trim();
              
              // If we have transcription from speech recognition, format it with AI
              if (fullTranscript) {
                formatTranscriptionWithAI(fullTranscript);
              } else {
                // Fallback: Process audio if no transcription available
                if (chunks.length > 0) {
                  const audioBlob = new Blob(chunks, { type: mimeType });
                  const reader = new FileReader();
                  reader.onloadend = async () => {
                    const base64Audio = reader.result as string;
                    await processAudioTranscription(base64Audio);
                  };
                  reader.onerror = (error) => {
                    console.error('Error reading audio blob:', error);
                    setTranscription('Error processing audio recording. Please try again.');
                    setIsProcessing(false);
                  };
                  reader.readAsDataURL(audioBlob);
                } else {
                  setTranscription('No audio data recorded. Please try recording again.');
                  setIsProcessing(false);
                }
              }
              
              return ''; // Clear interim transcript
            });
            
            return currentTranscription; // Return unchanged for now
          });
          
          chunks = []; // Clear chunks after processing
          setAudioChunks([]);
        };
        
        recorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          setIsRecording(false);
          setTranscription('Error during recording. Please try again.');
        };
        
        setMediaRecorder(recorder);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        setHasPermission(false);
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            alert('Microphone permission denied. Please allow microphone access in your browser settings and refresh the page.');
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            alert('No microphone found. Please connect a microphone and try again.');
          } else {
            alert(`Error accessing microphone: ${error.message}`);
          }
        }
      }
    };

    setupMediaRecorder();
    
    // Cleanup function to stop the stream when component unmounts
    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      if (speechRecognition) {
        try {
          speechRecognition.stop();
        } catch (error) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  // Format transcribed text with AI
  const formatTranscriptionWithAI = async (transcribedText: string) => {
    setIsProcessing(true);
    try {
      // Get active model - try state first, then fetch if needed
      let model = activeModel;
      if (!model) {
        try {
          model = await aiConfigManager.getActiveModel();
          if (model) {
            setActiveModel(model); // Update state for future use
          }
        } catch (error) {
          console.error('Error fetching active model:', error);
        }
      }

      if (!model) {
        // If no model, show raw transcription
        setTranscription(transcribedText || 'No speech detected.');
        setIsProcessing(false);
        return;
      }

      // Format the transcribed text with AI
      const result = await aiService.generateText({
        prompt: `Please format the following transcribed medical voice note into a well-structured medical documentation. Make it professional and organized. Keep all important medical information:\n\n${transcribedText}`,
        modelId: model.id,
        maxTokens: 500
      });
      
      if (result.success && result.content) {
        setTranscription(result.content);
      } else {
        // If AI formatting fails, show raw transcription
        setTranscription(transcribedText || 'No speech detected. Please try again.');
      }
    } catch (error) {
      console.error('Error formatting transcription:', error);
      // If AI formatting fails, show raw transcription
      setTranscription(transcribedText || 'Transcription completed but formatting failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Fallback function for when Web Speech API is not available
  const processAudioTranscription = async (base64Audio: string) => {
    setIsProcessing(true);
    try {
      // Get active model - try state first, then fetch if needed
      let model = activeModel;
      if (!model) {
        try {
          model = await aiConfigManager.getActiveModel();
          if (model) {
            setActiveModel(model); // Update state for future use
          }
        } catch (error) {
          console.error('Error fetching active model:', error);
        }
      }

      if (!model) {
        setTranscription('No active AI model found. Please configure an AI model in Settings first.');
        setIsProcessing(false);
        return;
      }

      // Note: Web Speech API is not available, show message
      setTranscription('Speech recognition is not available in this browser. Please use Chrome, Edge, or Safari for voice transcription. The audio was recorded but cannot be transcribed without browser speech recognition support.');
      setIsProcessing(false);
    } catch (error) {
      console.error('Error during audio transcription:', error);
      setTranscription(`Transcription error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your AI model configuration.`);
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (!activeModel) {
      alert('No active AI model found. Please configure an AI model in Settings first.');
      return;
    }

    if (!hasPermission) {
      alert('Microphone permission is required for voice recording. Please allow microphone access and refresh the page.');
      return;
    }

    if (!mediaRecorder) {
      alert('Media recorder not available. Please refresh the page and try again.');
      return;
    }

    console.log('Current recorder state:', mediaRecorder.state, 'isRecording:', isRecording);

    try {
      if (mediaRecorder.state === 'inactive' || mediaRecorder.state === 'paused') {
        // Start recording
        console.log('Starting recording...');
        setAudioChunks([]);
        setTranscription(''); // Clear previous transcription
        mediaRecorder.start(1000); // Collect data every second
      } else if (mediaRecorder.state === 'recording') {
        // Stop recording
        console.log('Stopping recording...');
        mediaRecorder.stop();
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      alert(`Error ${mediaRecorder.state === 'recording' ? 'stopping' : 'starting'} recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Show loading state if translations aren't loaded yet
  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('ai.voiceInput.title')} description={t('ai.voiceInput.description')} dense>
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
            <p className="text-xs text-gray-600">Loading translations...</p>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('ai.voiceInput.title')} 
        description={t('ai.voiceInput.description')} dense>
        <div className="space-y-4">
          {/* Header with AI Stats */}
          <div className="rounded-lg border border-violet-500/20 bg-gradient-to-r from-violet-600 to-purple-600 p-3 text-white shadow-sm">
            <div className="mb-2 flex min-w-0 items-center gap-2">
              <Mic className="h-6 w-6 shrink-0" />
              <h2 className="truncate text-base font-semibold sm:text-lg">{t('ai.voiceInput.title')}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                <div className="text-sm font-bold sm:text-base">{activeModel ? 'AI' : '—'}</div>
                <div className="text-[10px] text-violet-100 sm:text-xs">{t('ai.voiceInput.voiceRecognition')}</div>
              </div>
              <div className="min-w-0 rounded-md bg-white/10 px-2 py-1.5 text-center">
                <div className="truncate text-sm font-bold sm:text-base" title={activeModel?.name}>
                  {activeModel ? activeModel.name : t('ai.voiceInput.noModel')}
                </div>
                <div className="text-[10px] text-violet-100 sm:text-xs">{t('ai.voiceInput.activeModel')}</div>
              </div>
              <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                <div className="line-clamp-2 min-h-[2.5rem] text-xs font-bold leading-tight sm:text-sm">
                  {isRecording ? t('ai.voiceInput.recording') : isProcessing ? t('ai.voiceInput.processing') : transcription ? t('ai.voiceInput.ready') : t('ai.voiceInput.standby')}
                </div>
                <div className="text-[10px] text-violet-100 sm:text-xs">{t('ai.voiceInput.status')}</div>
              </div>
              <div className="rounded-md bg-white/10 px-2 py-1.5 text-center">
                <div className="text-sm font-bold sm:text-base">
                  {hasPermission === false ? t('ai.voiceInput.noMic') : activeModel ? t('ai.voiceInput.online') : t('ai.voiceInput.offline')}
                </div>
                <div className="text-[10px] text-violet-100 sm:text-xs">{t('ai.voiceInput.service')}</div>
              </div>
            </div>

            {/* Status Information */}
            {activeModel ? (
              <div className="mt-3 rounded-md bg-white/10 p-2.5">
                <div className="flex items-start gap-2 text-xs sm:text-sm">
                  <Brain className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="text-violet-50">
                    {t('ai.voiceInput.activeModelInfo')} <strong className="text-white">{activeModel.name}</strong> ({activeModel.provider})
                  </span>
                </div>
                {hasPermission === false && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-yellow-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
                    <span>{t('ai.voiceInput.microphonePermissionRequired')}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 rounded-md border border-yellow-400/30 bg-yellow-500/20 p-2.5">
                <div className="flex items-start gap-2 text-xs sm:text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {t('ai.voiceInput.noActiveModelFound')}{' '}
                    <a href="/ai-settings" className="font-medium text-white underline hover:text-violet-100">
                      {t('ai.voiceInput.configureModelInSettings')}
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
                { id: 'voice', label: t('ai.voiceInput.voiceInput'), icon: Mic },
                { id: 'transcription', label: t('ai.voiceInput.transcription'), icon: FileText },
                { id: 'commands', label: t('ai.voiceInput.voiceCommands'), icon: MessageSquare },
                { id: 'settings', label: t('ai.voiceInput.settings'), icon: Settings }
              ].map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1 border-b-2 px-1 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                    activeTab === tab.id
                      ? 'border-violet-500 text-violet-600'
                      : 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Voice Input Tab */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              {/* Patient Selection */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Users className="h-4 w-4" />
                  <span>Select Patient</span>
                </h3>
                <SearchablePatientSelect
                  value={selectedPatient?.name || selectedPatientId || ''}
                  onChange={(patient) => {
                    if (patient) {
                      setSelectedPatientId(patient._id);
                      setSelectedPatient(patient);
                    } else {
                      setSelectedPatientId('');
                      setSelectedPatient(null);
                    }
                  }}
                />
              </div>

              {/* Voice Recording Interface */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Mic className="h-4 w-4" />
                  <span>{t('ai.voiceInput.voiceRecording')}</span>
                </h3>

                <div className="py-8 text-center">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={isProcessing || !activeModel || !hasPermission}
                    className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isRecording
                        ? 'animate-pulse bg-red-600 hover:bg-red-700 focus:ring-red-300'
                        : isProcessing
                        ? 'animate-pulse cursor-not-allowed bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-300'
                        : !activeModel || !hasPermission
                        ? 'cursor-not-allowed bg-gray-400'
                        : 'bg-violet-600 hover:bg-violet-700 focus:ring-violet-300'
                    }`}
                  >
                    {isProcessing ? (
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : isRecording ? (
                      <MicOff className="h-8 w-8" />
                    ) : (
                      <Mic className="h-8 w-8" />
                    )}
                  </button>

                  <div className="mt-4 px-2">
                    <h4 className="mb-1 text-sm font-medium text-gray-900 sm:text-base">
                      {isProcessing
                        ? t('ai.voiceInput.processingAudio')
                        : isRecording
                        ? t('ai.voiceInput.recording')
                        : !activeModel
                        ? t('ai.voiceInput.noAIModelAvailable')
                        : !hasPermission
                        ? t('ai.voiceInput.microphonePermissionRequiredTitle')
                        : t('ai.voiceInput.clickToStartRecording')
                      }
                    </h4>
                    <p className="text-xs text-gray-500 sm:text-sm">
                      {isProcessing
                        ? t('ai.voiceInput.aiProcessingVoiceRecording')
                        : isRecording
                        ? t('ai.voiceInput.recordingYourVoice')
                        : !activeModel
                        ? t('ai.voiceInput.configureAIModelFirst')
                        : !hasPermission
                        ? t('ai.voiceInput.allowMicrophoneAccess')
                        : t('ai.voiceInput.clickMicrophoneToStart')
                      }
                    </p>
                  </div>

                  {isRecording && (
                    <div className="mt-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-500" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-500" style={{ animationDelay: '0.1s' }} />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-500" style={{ animationDelay: '0.2s' }} />
                      </div>
                      <p className="mt-2 text-xs text-red-600">{t('ai.voiceInput.recordingInProgress')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Voice Features */}
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">{t('ai.voiceInput.voiceFeatures')}</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.voiceInput.realTimeTranscription')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.voiceInput.medicalTerminologyRecognition')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.voiceInput.multiLanguageSupport')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.voiceInput.noiseCancellation')}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.voiceInput.voiceCommands')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.voiceInput.autoFormatting')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.voiceInput.secureRecording')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-xs text-gray-700 sm:text-sm">{t('ai.voiceInput.cloudSync')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Voice Commands Tab */}
          {activeTab === 'commands' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <MessageSquare className="h-4 w-4" />
                  <span>{t('ai.voiceInput.voiceCommands')}</span>
                </h3>

                <div className="space-y-3">
                  <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
                    <h4 className="mb-2 text-xs font-semibold text-blue-900">{t('ai.voiceInput.documentationCommands')}</h4>
                    <div className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2 sm:text-sm">
                      <div className="font-medium text-gray-900">"{t('ai.voiceInput.newPatientNote')}"</div>
                      <div className="font-medium text-gray-900">"{t('ai.voiceInput.startConsultation')}"</div>
                      <div className="font-medium text-gray-900">"{t('ai.voiceInput.endNote')}"</div>
                      <div className="font-medium text-gray-900">"{t('ai.voiceInput.saveDocument')}"</div>
                    </div>
                  </div>

                  <div className="rounded-md border border-green-100 bg-green-50 p-3">
                    <h4 className="mb-2 text-xs font-semibold text-green-900">{t('ai.voiceInput.formattingCommands')}</h4>
                    <div className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2 sm:text-sm">
                      <div className="font-medium text-gray-900">"{t('ai.voiceInput.newParagraph')}"</div>
                      <div className="font-medium text-gray-900">"{t('ai.voiceInput.bulletPoint')}"</div>
                      <div className="font-medium text-gray-900">"{t('ai.voiceInput.numberedList')}"</div>
                      <div className="font-medium text-gray-900">"{t('ai.voiceInput.boldText')}"</div>
                    </div>
                  </div>

                  <div className="rounded-md border border-purple-100 bg-purple-50 p-3">
                    <h4 className="mb-2 text-xs font-semibold text-purple-900">{t('ai.voiceInput.navigationCommands')}</h4>
                    <div className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2 sm:text-sm">
                      <div className="font-medium text-gray-900">"{t('ai.voiceInput.goToPatients')}"</div>
                      <div className="font-medium text-gray-900">"{t('ai.voiceInput.openAppointments')}"</div>
                      <div className="font-medium text-gray-900">"{t('ai.voiceInput.showDashboard')}"</div>
                      <div className="font-medium text-gray-900">"{t('ai.voiceInput.searchRecords')}"</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transcription Tab */}
          {activeTab === 'transcription' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <FileText className="h-4 w-4" />
                  <span>{t('ai.voiceInput.transcriptionResults')}</span>
                </h3>

                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                    <p className="text-sm font-medium text-gray-700">{t('ai.voiceInput.processingAudio')}</p>
                    <p className="text-xs text-gray-500">Formatting transcription with AI...</p>
                  </div>
                ) : (transcription || interimTranscript) ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                      <h4 className="mb-1.5 text-xs font-semibold text-blue-900">{t('ai.voiceInput.voiceTranscription')}</h4>
                      <p className="mb-2 text-xs text-blue-800 sm:text-sm">
                        <strong>{t('ai.voiceInput.aiProcessed')}</strong> {t('ai.voiceInput.voiceRecordingTranscribed')}
                      </p>
                      <div className="text-gray-700">
                        {transcription ? (
                          <div className="rounded-md border border-gray-200 bg-white p-3">
                            <FormattedAIResult
                              content={transcription}
                              type="voice-transcription"
                            />
                          </div>
                        ) : null}
                        {interimTranscript && (
                          <p className="mt-2 text-xs italic text-gray-500 sm:text-sm">{interimTranscript}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!transcription) {
                            alert('No transcription to save.');
                            return;
                          }
                          if (!selectedPatientId) {
                            alert('Please select a patient first.');
                            return;
                          }

                          try {
                            const response = await fetch('/api/ai-results', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                patientId: selectedPatientId,
                                type: 'voice-transcription',
                                title: `Voice Transcription - ${new Date().toLocaleDateString()}`,
                                content: transcription,
                                aiModel: activeModel ? {
                                  id: activeModel.id,
                                  name: activeModel.name,
                                  provider: activeModel.provider,
                                } : undefined,
                              }),
                            });

                            if (response.ok) {
                              alert('Transcription saved successfully!');
                            } else {
                              const errorData = await response.json();
                              alert(`Failed to save transcription: ${errorData.error || 'Unknown error'}`);
                            }
                          } catch (error) {
                            console.error('Error saving transcription:', error);
                            alert('Error saving transcription. Please try again.');
                          }
                        }}
                        disabled={!transcription || !selectedPatientId}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-green-600 bg-green-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save Transcription</span>
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-violet-600 bg-violet-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <Download className="h-4 w-4" />
                        <span>{t('ai.voiceInput.download')}</span>
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>{t('ai.voiceInput.share')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Mic className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                    <h3 className="mb-1 text-sm font-medium text-gray-900">{t('ai.voiceInput.noVoiceRecordingYet')}</h3>
                    <p className="mb-3 text-xs text-gray-500 sm:text-sm">{t('ai.voiceInput.clickRecordButtonToStart')}</p>
                    <div className="mx-auto max-w-md rounded-md border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs text-blue-800 sm:text-sm">
                        <strong>{t('ai.voiceInput.liveRecording')}</strong> {t('ai.voiceInput.voiceWillBeRecorded')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Settings className="h-4 w-4" />
                  <span>{t('ai.voiceInput.voiceSettings')}</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.voiceInput.language')}</label>
                    <select className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500">
                      <option>{t('ai.voiceInput.englishUS')}</option>
                      <option>{t('ai.voiceInput.spanish')}</option>
                      <option>{t('ai.voiceInput.french')}</option>
                      <option>{t('ai.voiceInput.german')}</option>
                      <option>{t('ai.voiceInput.arabic')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.voiceInput.microphone')}</label>
                    <select className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500">
                      <option>{t('ai.voiceInput.defaultMicrophone')}</option>
                      <option>{t('ai.voiceInput.builtInMicrophone')}</option>
                      <option>{t('ai.voiceInput.externalMicrophone')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.voiceInput.noiseReduction')}</label>
                    <select className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500">
                      <option>{t('ai.voiceInput.high')}</option>
                      <option>{t('ai.voiceInput.medium')}</option>
                      <option>{t('ai.voiceInput.low')}</option>
                      <option>{t('ai.voiceInput.off')}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="auto-save" className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                    <label htmlFor="auto-save" className="text-xs text-gray-700 sm:text-sm">{t('ai.voiceInput.autoSaveTranscriptions')}</label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="voice-commands" className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                    <label htmlFor="voice-commands" className="text-xs text-gray-700 sm:text-sm">{t('ai.voiceInput.enableVoiceCommands')}</label>
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
