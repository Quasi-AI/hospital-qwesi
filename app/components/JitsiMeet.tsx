'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface JitsiMeetProps {
  roomName: string;
  displayName: string;
  email?: string;
  subject?: string;
  onApiReady?: (api: any) => void;
  onReadyToClose?: () => void;
  onParticipantJoined?: (participant: any) => void;
  onParticipantLeft?: (participant: any) => void;
  onVideoConferenceJoined?: (data: any) => void;
  onVideoConferenceLeft?: (data: any) => void;
  height?: string | number;
  width?: string | number;
}

export default function JitsiMeet({
  roomName,
  displayName,
  email,
  subject,
  onApiReady,
  onReadyToClose,
  onParticipantJoined,
  onParticipantLeft,
  onVideoConferenceJoined,
  onVideoConferenceLeft,
  height = '100%',
  width = '100%',
}: JitsiMeetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    const loadJitsiScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Jitsi script'));
        document.head.appendChild(script);
      });
    };

    const initJitsi = async () => {
      try {
        await loadJitsiScript();

        if (!containerRef.current || apiRef.current) return;

        const sanitizedRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, '');

        const api = new window.JitsiMeetExternalAPI('jitsi.riot.im', {
          roomName: `aidochms${sanitizedRoomName}`,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            prejoinPageEnabled: false,
            enableClosePage: false,
            disableInviteFunctions: true,
            enableInsecureRoomNameWarning: false,
            enableLobbyChat: false,
            hideLobbyButton: true,
            disableLobbyPassword: true,
            toolbarButtons: [
              'camera',
              'chat',
              'desktop',
              'fullscreen',
              'hangup',
              'microphone',
              'participants-pane',
              'raisehand',
              'settings',
              'tileview',
              'toggle-camera',
              'videoquality',
            ],
            notifications: [],
            disableModeratorIndicator: true,
            disableReactionsModeration: true,
            breakoutRooms: { hideAddRoomButton: true, hideAutoAssignButton: true, hideJoinRoomButton: true },
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            DISABLE_PRESENCE_STATUS: true,
            GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
            DISPLAY_WELCOME_FOOTER: false,
            DISPLAY_WELCOME_PAGE_ADDITIONAL_CARD: false,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
          },
          userInfo: {
            displayName: displayName,
            email: email || '',
          },
        });

        apiRef.current = api;

        if (subject) {
          api.executeCommand('subject', subject);
        }

        api.addListener('readyToClose', () => {
          onReadyToClose?.();
        });

        api.addListener('participantJoined', (participant: any) => {
          onParticipantJoined?.(participant);
        });

        api.addListener('participantLeft', (participant: any) => {
          onParticipantLeft?.(participant);
        });

        api.addListener('videoConferenceJoined', (data: any) => {
          onVideoConferenceJoined?.(data);
        });

        api.addListener('videoConferenceLeft', (data: any) => {
          onVideoConferenceLeft?.(data);
        });

        onApiReady?.(api);
      } catch (error) {
        console.error('Failed to initialize Jitsi Meet:', error);
      }
    };

    initJitsi();

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName, displayName, email, subject]);

  return (
    <div
      ref={containerRef}
      style={{ height, width }}
      className="bg-gray-900 rounded-lg overflow-hidden"
    />
  );
}
