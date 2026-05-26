'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface VideoCallProps {
  roomId: string;
  participantName: string;
  participantRole: 'doctor' | 'patient';
  sessionStatus?: string;
  onCallEnd?: () => void;
}

export default function VideoCall({
  roomId,
  participantName,
  participantRole,
  sessionStatus,
  onCallEnd,
}: VideoCallProps) {
  const [peerId, setPeerId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');
  const [callEnded, setCallEnded] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentCallRef = useRef<MediaConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);

  const sanitizedRoomId = roomId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  const myPeerId = useRef(`hms${sanitizedRoomId}${participantRole}`);
  const targetPeerId = `hms${sanitizedRoomId}${participantRole === 'doctor' ? 'patient' : 'doctor'}`;
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initAttemptRef = useRef(0);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Could not access camera/microphone. Please check permissions.');
      throw err;
    }
  }, []);

  const attachRemoteStream = useCallback((remoteStream: MediaStream) => {
    console.log('Attaching remote stream, tracks:', remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
    
    const videoElement = remoteVideoRef.current;
    if (!videoElement) {
      console.error('Remote video element not found');
      return;
    }

    videoElement.srcObject = remoteStream;
    
    videoElement.onloadedmetadata = () => {
      console.log('Remote video metadata loaded, attempting to play...');
      videoElement.play()
        .then(() => console.log('Remote video playing'))
        .catch((e) => console.log('Autoplay issue:', e));
    };

    videoElement.onplaying = () => {
      console.log('Remote video is now playing');
    };

    setIsConnected(true);
    isConnectedRef.current = true;
    setIsConnecting(false);
    setConnectionStatus('Connected');
    setError(null);

    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }

    if (!callTimerRef.current) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  const handleCall = useCallback((call: MediaConnection) => {
    console.log('handleCall invoked for peer:', call.peer);
    
    if (currentCallRef.current && currentCallRef.current !== call) {
      console.log('Closing existing call');
      currentCallRef.current.close();
    }
    currentCallRef.current = call;

    call.on('stream', (remoteStream) => {
      console.log('Stream event received');
      attachRemoteStream(remoteStream);
    });

    call.on('close', () => {
      console.log('Call closed');
      setIsConnected(false);
      isConnectedRef.current = false;
      setConnectionStatus('Call ended');
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    });

    call.on('error', (err) => {
      console.error('Call error:', err);
    });

    call.peerConnection?.addEventListener('track', (event) => {
      console.log('Track event on peerConnection:', event.track.kind);
      if (event.streams && event.streams[0]) {
        attachRemoteStream(event.streams[0]);
      }
    });
  }, [attachRemoteStream]);

  const tryConnectToPeer = useCallback(() => {
    if (!peerRef.current || !localStreamRef.current || isConnectedRef.current) {
      return;
    }

    if (peerRef.current.disconnected) {
      console.log('Peer disconnected, attempting reconnect...');
      peerRef.current.reconnect();
      return;
    }

    setConnectionStatus(`Connecting to ${participantRole === 'doctor' ? 'patient' : 'doctor'}...`);

    const peerIdsToTry = [
      targetPeerId,
      `${targetPeerId}2`,
      `${targetPeerId}3`,
    ];

    for (const peerId of peerIdsToTry) {
      try {
        console.log('Attempting to call:', peerId);
        const call = peerRef.current.call(peerId, localStreamRef.current, {
          metadata: { caller: participantRole, name: participantName },
        });
        if (call) {
          console.log('Call initiated to:', peerId);
          handleCall(call);
          break;
        }
      } catch (err) {
        console.log('Call attempt to', peerId, 'failed:', err);
      }
    }
  }, [targetPeerId, participantRole, participantName, handleCall]);

  const initializePeer = useCallback(async () => {
    try {
      setError(null);
      setIsConnecting(true);
      setConnectionStatus('Getting camera access...');

      await getLocalStream();
      setConnectionStatus('Connecting to server...');

      if (peerRef.current) {
        peerRef.current.destroy();
      }

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }

      initAttemptRef.current += 1;
      const currentPeerId = initAttemptRef.current > 1 
        ? `${myPeerId.current}${initAttemptRef.current}` 
        : myPeerId.current;
      
      console.log('Initializing peer with ID:', currentPeerId);
      
      const peer = new Peer(currentPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      connectionTimeoutRef.current = setTimeout(() => {
        if (!peerId) {
          console.log('Connection timeout, retrying...');
          setConnectionStatus('Connection slow, retrying...');
          peer.destroy();
          setTimeout(() => initializePeer(), 1000);
        }
      }, 8000);

      peer.on('open', (id) => {
        console.log('Peer connected with ID:', id);
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        setPeerId(id);
        setIsConnecting(false);
        setConnectionStatus(`Waiting for ${participantRole === 'doctor' ? 'patient' : 'doctor'}...`);

        setTimeout(() => {
          tryConnectToPeer();
        }, 1000);

        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
        }
        retryIntervalRef.current = setInterval(() => {
          if (!isConnectedRef.current) {
            tryConnectToPeer();
          }
        }, 3000);
      });

      peer.on('call', (call) => {
        console.log('Receiving call from:', call.peer);
        setConnectionStatus('Incoming call...');
        if (localStreamRef.current) {
          call.answer(localStreamRef.current);
          handleCall(call);
        }
      });

      peer.on('error', (err: any) => {
        console.error('Peer error:', err);
        if (err.type === 'unavailable-id') {
          setConnectionStatus('ID conflict, reconnecting...');
          setTimeout(() => {
            peer.destroy();
            initializePeer();
          }, 1000);
        } else if (err.type === 'peer-unavailable') {
          setConnectionStatus(`Waiting for ${participantRole === 'doctor' ? 'patient' : 'doctor'} to join...`);
        } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
          setConnectionStatus('Network issue, reconnecting...');
          setTimeout(() => {
            peer.destroy();
            initializePeer();
          }, 2000);
        }
      });

      peer.on('disconnected', () => {
        console.log('Peer disconnected, reconnecting...');
        setConnectionStatus('Reconnecting...');
        if (!peer.destroyed) {
          peer.reconnect();
        }
      });

      peer.on('close', () => {
        console.log('Peer connection closed');
      });

      peerRef.current = peer;
    } catch (err) {
      setIsConnecting(false);
      setError('Failed to start video call. Please check your camera permissions.');
      console.error('Failed to initialize peer:', err);
    }
  }, [getLocalStream, participantRole, handleCall, tryConnectToPeer, peerId]);

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const endCall = () => {
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    setIsConnected(false);
    isConnectedRef.current = false;
    setPeerId('');
    setCallEnded(true);
    setConnectionStatus('Call ended');
    setCallDuration(0);
  };

  const reconnect = async () => {
    setCallEnded(false);
    setError(null);
    setConnectionStatus('Reconnecting...');
    initAttemptRef.current = 0;
    await initializePeer();
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const manualConnect = () => {
    tryConnectToPeer();
  };

  const retryConnection = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
    }
    setPeerId('');
    setIsConnected(false);
    isConnectedRef.current = false;
    initializePeer();
  };

  useEffect(() => {
    initializePeer();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Video Container */}
      <div className="flex-1 relative">
        {/* Remote Video (large) - always rendered but hidden when not connected */}
        <div className="absolute inset-0 bg-gray-800">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={false}
            className={`w-full h-full object-cover ${isConnected ? 'block' : 'hidden'}`}
          />
          
          {/* Waiting screen overlay */}
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  {isConnecting ? (
                    <RefreshCw className="w-12 h-12 text-blue-400 animate-spin" />
                  ) : callEnded ? (
                    <PhoneOff className="w-12 h-12 text-red-400" />
                  ) : (
                    <Phone className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <p className="text-white text-lg mb-2">{connectionStatus}</p>
                <p className="text-gray-400 text-sm mb-4">
                  Room: {roomId.slice(0, 16)}...
                </p>
                
                {/* Call ended - show reconnect option if session not completed */}
                {callEnded && sessionStatus !== 'completed' && (
                  <button
                    onClick={reconnect}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    Reconnect
                  </button>
                )}
                
                {/* Call ended and session completed - no reconnect */}
                {callEnded && sessionStatus === 'completed' && (
                  <p className="text-gray-400">Session has been completed.</p>
                )}
                
                {/* Not ended yet, show connect button */}
                {!callEnded && peerId && !isConnecting && (
                  <button
                    onClick={manualConnect}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    Connect Now
                  </button>
                )}
                
                {error && (
                  <p className="text-yellow-400 text-sm mt-4 max-w-md mx-auto">{error}</p>
                )}
                
                {!callEnded && (
                  <p className="text-gray-500 text-xs mt-6">
                    Both participants must have joined for the connection to establish.
                  </p>
                )}
                
                {connectionStatus.includes('server') && !callEnded && (
                  <button
                    onClick={retryConnection}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Connection
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Local Video (PiP) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${!isVideoOn ? 'hidden' : ''}`}
          />
          {!isVideoOn && (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <VideoOff className="w-8 h-8 text-gray-500" />
            </div>
          )}
          <div className="absolute bottom-1 left-1 bg-black/50 px-2 py-0.5 rounded text-xs text-white">
            You
          </div>
        </div>

        {/* Call Duration */}
        {isConnected && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full">
            <span className="text-white font-mono flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              {formatDuration(callDuration)}
            </span>
          </div>
        )}

        {/* Room Info */}
        <div className="absolute top-4 right-4 bg-black/60 px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Room:</span>
            <span className="text-white font-mono text-xs">{roomId.slice(0, 12)}...</span>
            <button
              onClick={copyRoomId}
              className="text-gray-400 hover:text-white transition-colors"
              title="Copy Room ID"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-colors ${
              isVideoOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 text-white'
            }`}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </button>
          <button
            onClick={toggleMic}
            className={`p-4 rounded-full transition-colors ${
              isMicOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 text-white'
            }`}
            title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </button>
          <button
            onClick={endCall}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
            title="End call"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
