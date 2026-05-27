'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

type RealtimeEvent = {
  type: string;
  payload?: any;
  createdAt?: string;
};

function websocketUrl(token: string) {
  const configured = process.env.NEXT_PUBLIC_REALTIME_WS_URL;
  if (configured) {
    const url = new URL(configured);
    url.searchParams.set('token', token);
    return url.toString();
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = process.env.NEXT_PUBLIC_REALTIME_WS_PORT || '3001';
  return `${protocol}//${host}:${port}/ws?token=${encodeURIComponent(token)}`;
}

function dispatchRealtimeEvent(event: RealtimeEvent) {
  window.dispatchEvent(new CustomEvent('qwesi:realtime', { detail: event }));

  if (event.type.startsWith('notification.')) {
    window.dispatchEvent(new CustomEvent('qwesi:notifications-changed', { detail: event }));
  }
  if (event.type.startsWith('message.')) {
    window.dispatchEvent(new CustomEvent('qwesi:messages-changed', { detail: event }));
  }
  if (event.type.startsWith('telemedicine.')) {
    window.dispatchEvent(new CustomEvent('qwesi:sessions-changed', { detail: event }));
  }
  if (event.type.startsWith('telemedicine.chat.')) {
    window.dispatchEvent(new CustomEvent('qwesi:telemedicine-chat-changed', { detail: event }));
  }
}

function showToast(event: RealtimeEvent) {
  if (event.type === 'notification.created') {
    const title = event.payload?.title || 'New notification';
    const message = event.payload?.message;
    toast(`${title}${message ? `\n${message}` : ''}`);
  }

  if (event.type === 'telemedicine.session.updated' && event.payload?.status === 'waiting') {
    toast('A patient is waiting for a telemedicine session.');
  }
}

export default function RealtimeListener() {
  const { status } = useSession();
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;

    let cancelled = false;
    let reconnectDelay = 1000;

    const connect = async () => {
      try {
        const tokenRes = await fetch('/api/realtime/token', { cache: 'no-store' });
        if (!tokenRes.ok) return;
        const { token } = await tokenRes.json();
        if (!token || cancelled) return;

        const socket = new WebSocket(websocketUrl(token));
        socketRef.current = socket;

        socket.onopen = () => {
          reconnectDelay = 1000;
        };

        socket.onmessage = (message) => {
          try {
            const event = JSON.parse(message.data) as RealtimeEvent;
            if (event.type === 'connection.ready') return;
            dispatchRealtimeEvent(event);
            showToast(event);
          } catch (error) {
            console.warn('[realtime] invalid event:', error);
          }
        };

        socket.onclose = () => {
          if (cancelled) return;
          reconnectTimerRef.current = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
        };
      } catch (error) {
        if (!cancelled) {
          reconnectTimerRef.current = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [status]);

  return null;
}
