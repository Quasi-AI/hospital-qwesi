'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Video,
  Phone,
  MessageCircle,
  Send,
  ArrowLeft,
  FileText,
  Pill,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
} from 'lucide-react';
import SidebarLayout from '../../../components/sidebar-layout';
import VideoCall from '../../../components/VideoCall';

interface Session {
  _id: string;
  sessionNumber: string;
  patientId: {
    _id: string;
    name: string;
    patientId: string;
    email: string;
    phone: string;
    dateOfBirth?: string;
    gender?: string;
    profilePhoto?: string;
  };
  doctorId: {
    _id: string;
    name: string;
    specialization?: string;
    email: string;
    profilePhoto?: string;
  };
  consultationType: 'video' | 'audio' | 'chat';
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: string;
  roomId: string;
  chiefComplaint?: string;
  symptoms?: string[];
  diagnosis?: string;
  clinicalNotes?: string;
  vitalSigns?: any[];
  chatMessages: ChatMessage[];
  paymentStatus: string;
  consultationFee: number;
  currency: string;
  patientRating?: number;
  patientFeedback?: string;
}

interface ChatMessage {
  _id: string;
  senderId: string;
  senderType: 'doctor' | 'patient';
  senderName: string;
  message: string;
  messageType: 'text' | 'image' | 'file' | 'prescription';
  timestamp: string;
  read: boolean;
}

export default function SessionDetailPage() {
  const { data: authSession } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  // Chat state
  const [showChat, setShowChat] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageTimestampRef = useRef<string>('');
  
  // Clinical notes
  const [showNotes, setShowNotes] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/telemedicine/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch session');
      const data = await res.json();
      setSession(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pollMessages = useCallback(async () => {
    try {
      const since = lastMessageTimestampRef.current;
      const res = await fetch(`/api/telemedicine/sessions/${sessionId}/chat${since ? `?since=${since}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m._id));
            const newMessages = data.messages.filter((m: ChatMessage) => !existingIds.has(m._id));
            if (newMessages.length > 0) {
              const lastNew = newMessages[newMessages.length - 1];
              lastMessageTimestampRef.current = lastNew.timestamp;
              return [...prev, ...newMessages];
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
    
    const messageInterval = setInterval(pollMessages, 3000);
    
    return () => {
      clearInterval(messageInterval);
    };
  }, [sessionId, pollMessages]);

  useEffect(() => {
    if (searchParams.get('start') === 'true' && session && !isCallActive) {
      startCall();
    }
  }, [session, searchParams]);

  useEffect(() => {
    if (session) {
      const chatMessages = session.chatMessages || [];
      setMessages(chatMessages);
      if (chatMessages.length > 0) {
        lastMessageTimestampRef.current = chatMessages[chatMessages.length - 1].timestamp;
      }
      setClinicalNotes(session.clinicalNotes || '');
      setDiagnosis(session.diagnosis || '');
      setSymptoms(session.symptoms || []);
    }
  }, [session]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const startCall = async () => {
    try {
      await fetch(`/api/telemedicine/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in-progress' }),
      });

      setIsCallActive(true);
      setCallDuration(0);
      fetchSession();
    } catch (error: any) {
      console.error('Error starting call:', error);
      setError('Failed to start call.');
    }
  };

  const endCall = async () => {
    setIsCallActive(false);

    await fetch(`/api/telemedicine/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        clinicalNotes,
        diagnosis,
        symptoms,
      }),
    });

    fetchSession();
  };

  const handleJitsiReadyToClose = () => {
    endCall();
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const res = await fetch(`/api/telemedicine/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          senderType: 'doctor',
          senderName: authSession?.user?.name || 'Doctor',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => {
          const exists = prev.some(m => m._id === data.message._id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        if (data.message.timestamp) {
          lastMessageTimestampRef.current = data.message.timestamp;
        }
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const addSymptom = () => {
    if (newSymptom.trim() && !symptoms.includes(newSymptom.trim())) {
      setSymptoms([...symptoms, newSymptom.trim()]);
      setNewSymptom('');
    }
  };

  const removeSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter(s => s !== symptom));
  };

  const saveNotes = async () => {
    try {
      await fetch(`/api/telemedicine/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalNotes,
          diagnosis,
          symptoms,
        }),
      });
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'waiting': 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-green-100 text-green-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const updateSessionStatus = async (newStatus: string) => {
    if (updatingStatus) return;
    if (newStatus === 'completed' && !confirm('End this session and mark as completed?')) return;
    if (newStatus === 'cancelled' && !confirm('Cancel this session? The consultation will be marked as cancelled.')) return;
    setUpdatingStatus(true);
    try {
      const payload: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'completed') {
        payload.clinicalNotes = clinicalNotes;
        payload.diagnosis = diagnosis;
        payload.symptoms = symptoms;
      }
      const res = await fetch(`/api/telemedicine/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchSession();
        if (newStatus === 'completed') {
          setIsCallActive(false);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to update status');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout dense>
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      </SidebarLayout>
    );
  }

  if (error || !session) {
    return (
      <SidebarLayout dense>
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-gray-600">{error || 'Session not found'}</p>
          <Link
            href="/telemedicine"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Telemedicine
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout dense>
      <div className="h-screen flex flex-col bg-gray-900">
        {/* Header */}
        <div className="bg-gray-800 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/telemedicine"
              className="shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-white">{session.sessionNumber}</h1>
              <p className="truncate text-xs text-gray-400">
                {session.patientId.name} with Dr. {session.doctorId.name}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium capitalize ${getStatusBadge(session.status)}`}>
              {session.status.replace('-', ' ')}
            </span>
            {session.status === 'in-progress' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateSessionStatus('completed')}
                  disabled={updatingStatus}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-green-600 px-2.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  End session
                </button>
                <button
                  type="button"
                  onClick={() => updateSessionStatus('cancelled')}
                  disabled={updatingStatus}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-gray-600 px-2.5 text-xs font-medium text-white hover:bg-gray-500 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel session
                </button>
              </div>
            )}
            {isCallActive && (
              <span className="flex items-center gap-1.5 text-xs text-white">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                {formatDuration(callDuration)}
              </span>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video/Audio Area */}
          <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
            {isCallActive ? (
              <div className="w-full h-full relative">
                <VideoCall
                  roomId={session.roomId}
                  participantName={authSession?.user?.name || 'Doctor'}
                  participantRole="doctor"
                  sessionStatus={session.status}
                  onCallEnd={handleJitsiReadyToClose}
                />
                {/* Side panel toggle buttons */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setShowChat(!showChat); setShowNotes(false); }}
                    className={`rounded-md p-2 transition-colors ${
                      showChat ? 'bg-blue-500 text-white' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
                    }`}
                    title="Toggle Chat"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNotes(!showNotes); setShowChat(false); }}
                    className={`rounded-md p-2 transition-colors ${
                      showNotes ? 'bg-purple-500 text-white' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
                    }`}
                    title="Toggle Notes"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Pre-call Screen */
              <div className="px-4 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-700">
                  {session.consultationType === 'video' ? (
                    <Video className="h-8 w-8 text-blue-500" />
                  ) : session.consultationType === 'audio' ? (
                    <Phone className="h-8 w-8 text-green-500" />
                  ) : (
                    <MessageCircle className="h-8 w-8 text-purple-500" />
                  )}
                </div>
                <h2 className="mb-1 text-lg font-semibold text-white">
                  {session.consultationType.charAt(0).toUpperCase() + session.consultationType.slice(1)} Consultation
                </h2>
                <p className="text-sm text-gray-400">
                  Patient: {session.patientId.name}
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Scheduled: {new Date(session.scheduledStartTime).toLocaleString()}
                </p>
                {session.chiefComplaint && (
                  <p className="mb-4 text-sm text-gray-400">
                    Chief Complaint: {session.chiefComplaint}
                  </p>
                )}
                
                {session.status === 'completed' ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-500">
                    <CheckCircle className="h-4 w-4" />
                    Session Completed
                  </div>
                ) : session.status === 'cancelled' ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-red-500">
                    <XCircle className="h-4 w-4" />
                    Session Cancelled
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startCall}
                    className="mx-auto flex items-center gap-2 rounded-full bg-green-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                  >
                    {session.consultationType === 'video' ? (
                      <>
                        <Video className="h-4 w-4" />
                        Start Video Call
                      </>
                    ) : session.consultationType === 'audio' ? (
                      <>
                        <Phone className="h-4 w-4" />
                        Start Audio Call
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4" />
                        Start Chat
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Side Panel - Chat or Notes */}
          {(showChat || showNotes) && (
            <div className="flex w-80 shrink-0 flex-col border-l border-gray-100 bg-white">
              {/* Tabs */}
              <div className="flex border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowChat(true); setShowNotes(false); }}
                  className={`flex-1 px-3 py-2 text-xs font-medium ${
                    showChat && !showNotes
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNotes(true); setShowChat(false); }}
                  className={`flex-1 px-3 py-2 text-xs font-medium ${
                    showNotes
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Clinical Notes
                </button>
              </div>

              {showChat && !showNotes && (
                <>
                  {/* Messages */}
                  <div ref={chatContainerRef} className="flex-1 space-y-2 overflow-y-auto p-3">
                    {messages.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-500">
                        <MessageCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                        <p>No messages yet</p>
                      </div>
                    ) : (
                      messages.map(msg => (
                        <div
                          key={msg._id}
                          className={`flex ${msg.senderType === 'doctor' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-md px-3 py-1.5 ${
                              msg.senderType === 'doctor'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-xs">{msg.message}</p>
                            <p className={`mt-0.5 text-[10px] ${
                              msg.senderType === 'doctor' ? 'text-blue-200' : 'text-gray-500'
                            }`}>
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-gray-100 p-3">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        className="h-9 flex-1 rounded-md border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={sendMessage}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {showNotes && (
                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {/* Patient Info */}
                  <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
                    <h3 className="mb-1.5 text-xs font-semibold text-gray-900">Patient Information</h3>
                    <div className="space-y-0.5 text-xs">
                      <p><span className="text-gray-500">Name:</span> {session.patientId.name}</p>
                      <p><span className="text-gray-500">ID:</span> {session.patientId.patientId}</p>
                      {session.patientId.dateOfBirth && (
                        <p><span className="text-gray-500">DOB:</span> {new Date(session.patientId.dateOfBirth).toLocaleDateString()}</p>
                      )}
                      {session.patientId.gender && (
                        <p><span className="text-gray-500">Gender:</span> {session.patientId.gender}</p>
                      )}
                    </div>
                  </div>

                  {/* Symptoms */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">Symptoms</label>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {symptoms.map(symptom => (
                        <span
                          key={symptom}
                          className="inline-flex items-center gap-0.5 rounded-md bg-orange-100 px-2 py-0.5 text-xs text-orange-800"
                        >
                          {symptom}
                          <button type="button" onClick={() => removeSymptom(symptom)} className="hover:text-orange-600">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newSymptom}
                        onChange={(e) => setNewSymptom(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
                        placeholder="Add symptom..."
                        className="h-9 flex-1 rounded-md border border-gray-200 px-2.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={addSymptom}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange-500 text-white hover:bg-orange-600"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">Diagnosis</label>
                    <input
                      type="text"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="Enter diagnosis..."
                      className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-xs"
                    />
                  </div>

                  {/* Clinical Notes */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">Clinical Notes</label>
                    <textarea
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      placeholder="Enter clinical notes..."
                      rows={5}
                      className="w-full rounded-md border border-gray-200 px-2.5 py-2 text-xs"
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    type="button"
                    onClick={saveNotes}
                    className="h-9 w-full rounded-md bg-blue-500 text-sm font-medium text-white hover:bg-blue-600"
                  >
                    Save Notes
                  </button>

                  {/* Create Prescription */}
                  <Link
                    href={`/telemedicine/sessions/${sessionId}/prescription`}
                    className="flex h-9 items-center justify-center gap-2 rounded-md border border-green-500 text-sm font-medium text-green-600 hover:bg-green-50"
                  >
                    <Pill className="h-3.5 w-3.5" />
                    Create Prescription
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
