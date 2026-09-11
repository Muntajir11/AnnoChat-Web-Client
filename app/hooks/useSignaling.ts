'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTicket } from '../lib/ticket';
import { config } from '../lib/config';
import { isServerFrame, type ClientToServer, type ServerToClient } from '../lib/protocol';
import { createConnectionGuard } from '../lib/connectionGuard';

type Handler = (msg: ServerToClient) => void;
export type SignalingStatus = 'idle' | 'connecting' | 'ready' | 'closed' | 'reconnecting';

const BACKOFF_MS = [1000, 2000, 4000, 8000];

export function useSignaling() {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef<Handler | null>(null);
  const guardRef = useRef(createConnectionGuard());
  const wantedRef = useRef(false);
  const modeRef = useRef<'text' | 'video' | 'any'>('any');
  const attemptRef = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef = useRef<(mode: 'text' | 'video' | 'any', asReconnect: boolean) => Promise<void>>(
    async () => undefined,
  );
  const [status, setStatus] = useState<SignalingStatus>('idle');
  const [online, setOnline] = useState(0);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearReconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectTimer.current = null;
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!wantedRef.current) return;
    clearReconnect();
    const delay = BACKOFF_MS[Math.min(attemptRef.current, BACKOFF_MS.length - 1)];
    attemptRef.current += 1;
    setStatus('reconnecting');
    reconnectTimer.current = setTimeout(() => {
      void openRef.current(modeRef.current, true);
    }, delay);
  }, [clearReconnect]);

  openRef.current = async (mode, asReconnect) => {
    const gen = guardRef.current.begin();
    wsRef.current = null;
    setError(null);
    setStatus(asReconnect ? 'reconnecting' : 'connecting');
    try {
      const { ticket, wsUrl } = await fetchTicket(mode);
      if (!guardRef.current.isCurrent(gen) || !wantedRef.current) return;
      const url = wsUrl.includes('?')
        ? `${wsUrl}&ticket=${encodeURIComponent(ticket)}`
        : `${wsUrl}?ticket=${encodeURIComponent(ticket)}`;
      const ws = new WebSocket(url);
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = (err?: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (err) reject(err);
          else resolve();
        };
        const timer = setTimeout(() => finish(new Error('Timed out connecting')), 12_000);
        ws.onclose = () => {
          if (guardRef.current.isCurrent(gen)) {
            wsRef.current = null;
            setStatus('closed');
            if (wantedRef.current) scheduleReconnect();
          }
          finish(new Error('closed'));
        };
        ws.onerror = () => setError('Connection error');
        ws.onmessage = (ev) => {
          try {
            const parsed = JSON.parse(String(ev.data));
            if (!isServerFrame(parsed)) return;
            if (parsed.t === 'ready') {
              if (!guardRef.current.isCurrent(gen)) return;
              setSocketId(parsed.d.socketId);
              setOnline(parsed.d.online);
              setStatus('ready');
              setError(null);
              attemptRef.current = 0;
              finish();
            }
            if (parsed.t === 'online') setOnline(parsed.d.count);
            if (parsed.t === 'error') setError(parsed.d.message);
            handlerRef.current?.(parsed);
          } catch {
            /* ignore */
          }
        };
        if (!guardRef.current.attach(gen, ws)) {
          finish(new Error('superseded'));
          return;
        }
        wsRef.current = ws;
      });
    } catch {
      if (!guardRef.current.isCurrent(gen)) return;
      setStatus('closed');
      if (wantedRef.current) scheduleReconnect();
    }
  };

  const send = useCallback((msg: ClientToServer) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  const connect = useCallback(async (mode: 'text' | 'video' | 'any' = 'any') => {
    wantedRef.current = true;
    modeRef.current = mode;
    attemptRef.current = 0;
    clearReconnect();
    await openRef.current(mode, false);
  }, [clearReconnect]);

  const disconnect = useCallback(() => {
    wantedRef.current = false;
    clearReconnect();
    guardRef.current.close();
    wsRef.current = null;
    setStatus('idle');
  }, [clearReconnect]);

  const reconnect = useCallback(async () => {
    wantedRef.current = true;
    attemptRef.current = 0;
    clearReconnect();
    await openRef.current(modeRef.current, false);
  }, [clearReconnect]);

  const onFrame = useCallback((fn: Handler) => {
    handlerRef.current = fn;
  }, []);

  useEffect(() => () => {
    wantedRef.current = false;
    clearReconnect();
    guardRef.current.close();
  }, [clearReconnect]);

  return {
    status,
    online,
    socketId,
    error,
    send,
    connect,
    disconnect,
    reconnect,
    onFrame,
    serverHttp: config.serverHttp,
  };
}
