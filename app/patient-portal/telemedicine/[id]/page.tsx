'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Video,
  Phone,
  MessageCircle,
  Send,
  ArrowLeft,
  Clock,
  Calendar,
  AlertCircle,
  XCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import VideoCall from '../../../components/VideoCall';

interface TelemedicineSession {
  _id: string;
  sessionNumber: string;
  patientId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
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
  status: string;
  roomId: string;
  chiefComplaint?: string;
  symptoms?: string[];
  chatMessages: ChatMessage[];
  consultationFee: number;
  currency: string;
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

export default function PatientTelemedicineSessionPage() {
  const { data: authSession } = useSession();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Chat state
  const [showChat, setShowChat] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageTimestampRef = useRef<string>('');

  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/patient-portal/telemedicine/${sessionId}`);
      if (!res.ok) {
        if (res.status === 403) {
          setError('You do not have access to this session');
        } else if (res.status === 404) {
          setError('Session not found');
        } else {
          throw new Error('Failed to fetch session');
        }
        return;
      }
      const data = await res.json();
      setSession(data);
      const chatMessages = data.chatMessages || [];
      setMessages(chatMessages);
      if (chatMessages.length > 0) {
        lastMessageTimestampRef.current = chatMessages[chatMessages.length - 1].timestamp;
      }
    } catch (err) {
      setError('Failed to load session');
      console.error('Error fetching session:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const pollMessages = useCallback(async () => {
    if (!session) return;
    try {
      const since = lastMessageTimestampRef.current;
      const res = await fetch(
        `/api/patient-portal/telemedicine/${sessionId}/chat${since ? `?since=${since}` : ''}`
      );
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
    } catch (err) {
      console.error('Error polling messages:', err);
    }
  }, [session, sessionId]);

  useEffect(() => {
    fetchSession();
    const messageInterval = setInterval(pollMessages, 3000);
    return () => {
      clearInterval(messageInterval);
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [sessionId, fetchSession, pollMessages]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const startCall = async () => {
    try {
      await fetch(`/api/patient-portal/telemedicine/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join' }),
      });

      setIsCallActive(true);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting call:', err);
      setError('Failed to join the call.');
    }
  };

  const endCall = async () => {
    setIsCallActive(false);
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    
    await fetch(`/api/patient-portal/telemedicine/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave' }),
    });
  };

  const handleJitsiReadyToClose = () => {
    endCall();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !authSession?.user) return;

    try {
      const res = await fetch(`/api/patient-portal/telemedicine/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage.trim(),
          messageType: 'text',
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
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeOnly = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'waiting': return 'bg-yellow-100 text-yellow-700';
      case 'in-progress': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-gray-100 text-gray-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const canJoinCall = () => {
    if (!session) return false;
    const now = new Date();
    const scheduledStart = new Date(session.scheduledStartTime);
    const scheduledEnd = new Date(session.scheduledEndTime);
    const joinWindowStart = new Date(scheduledStart.getTime() - 15 * 60 * 1000);
    return (
      now >= joinWindowStart && 
      now <= scheduledEnd && 
      ['scheduled', 'waiting', 'in-progress'].includes(session.status)
    );
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-teal-600" />
          <p className="mt-2 text-xs text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 bg-gray-50 py-12">
        <XCircle className="h-10 w-10 text-red-400" />
        <h2 className="text-sm font-semibold text-gray-900">Error</h2>
        <p className="max-w-sm text-center text-xs text-gray-600">{error}</p>
        <Link
          href="/patient-portal/telemedicine"
          className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Telemedicine
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 bg-gray-50 py-12">
        <AlertCircle className="h-10 w-10 text-yellow-400" />
        <h2 className="text-sm font-semibold text-gray-900">Session Not Found</h2>
        <p className="text-xs text-gray-600">The requested session could not be found.</p>
        <Link
          href="/patient-portal/telemedicine"
          className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Telemedicine
        </Link>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800 px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/patient-portal/telemedicine"
              className="shrink-0 text-gray-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-white">
                {session.consultationType === 'video' ? 'Video' : session.consultationType === 'audio' ? 'Audio' : 'Chat'} Consultation
              </h1>
              <p className="truncate text-xs text-gray-400">
                with Dr. {session.doctorId.name}
                {session.doctorId.specialization && ` • ${session.doctorId.specialization}`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium capitalize ${getStatusColor(session.status)}`}>
              {session.status.replace('-', ' ')}
            </span>
            {isCallActive && (
              <span className="rounded-md bg-red-500 px-2 py-0.5 font-mono text-xs text-white tabular-nums">
                {formatTime(callDuration)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-2.75rem)]">
        {/* Main Video/Call Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Container */}
          <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
            {isCallActive ? (
              <div className="w-full h-full relative">
                <VideoCall
                  roomId={session.roomId}
                  participantName={authSession?.user?.name || 'Patient'}
                  participantRole="patient"
                  sessionStatus={session.status}
                  onCallEnd={handleJitsiReadyToClose}
                />
                {/* Chat toggle button */}
                <div className="absolute top-3 left-3 z-10">
                  <button
                    type="button"
                    onClick={() => setShowChat(!showChat)}
                    className={`rounded-md p-2 transition-colors ${
                      showChat ? 'bg-teal-600 text-white' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
                    }`}
                    title="Toggle Chat"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-700">
                  <Video className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="mb-2 text-base font-semibold text-white">
                  Ready to join your consultation?
                </h2>
                <div className="mb-4 space-y-1 text-xs text-gray-400">
                  <p className="flex items-center justify-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(session.scheduledStartTime)}
                  </p>
                  <p className="flex items-center justify-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTimeOnly(session.scheduledStartTime)} - {formatTimeOnly(session.scheduledEndTime)}
                  </p>
                </div>
                {canJoinCall() ? (
                  <button
                    type="button"
                    onClick={startCall}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-green-600 px-4 text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    {session.consultationType === 'video' ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <Phone className="h-4 w-4" />
                    )}
                    Join {session.consultationType === 'video' ? 'Video' : 'Audio'} Call
                  </button>
                ) : (
                  <div className="text-center">
                    <p className="mb-1 text-sm text-yellow-400">
                      {session.status === 'completed' || session.status === 'cancelled'
                        ? 'This session has ended'
                        : 'You can join 15 minutes before the scheduled time'}
                    </p>
                    {session.status === 'scheduled' && (
                      <p className="text-xs text-gray-500">
                        Session starts at {formatTimeOnly(session.scheduledStartTime)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Call info bar - Jitsi has its own controls */}
          {isCallActive && (
            <div className="border-t border-gray-700 bg-gray-800 px-3 py-1.5">
              <p className="text-center text-xs text-gray-400">
                Use the controls in the video window to manage your call. Click the red hang-up button to end.
              </p>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="flex w-64 shrink-0 flex-col border-l border-gray-100 bg-white">
            <div className="border-b border-gray-100 p-2.5">
              <h3 className="text-sm font-semibold text-gray-900">Chat</h3>
              <p className="text-xs text-gray-500">Send messages to your doctor</p>
            </div>

            {/* Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 space-y-1.5 overflow-y-auto p-2.5"
            >
              {messages.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">
                  <MessageCircle className="mx-auto mb-2 h-7 w-7 text-gray-300" />
                  <p>No messages yet</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${msg.senderType === 'patient' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-md px-3 py-1.5 ${
                        msg.senderType === 'patient'
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="mb-0.5 text-[10px] font-medium opacity-75">
                        {msg.senderName}
                      </p>
                      <p className="text-xs">{msg.message}</p>
                      <p className="mt-0.5 text-[10px] opacity-50">
                        {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-100 p-2.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-1.5"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="h-9 flex-1 rounded-md border border-gray-200 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
