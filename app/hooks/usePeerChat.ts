'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPeer, type PeerHandle } from '../lib/peer';
import { iceServers } from '../lib/config';
import { armP2pFallback } from '../lib/fallback';
import {
  CONNECT_WATCHDOG_MS,
  TYPING_THROTTLE_MS,
  effectsForError,
  type ClientToServer,
  type ServerToClient,
} from '../lib/protocol';
import { nextMsgId } from '../lib/ids';

export type ChatMsg = { id: string; text: string; sender: 'you' | 'stranger' | 'system' };

export function usePeerChat({
  send,
  onFrame,
  mode,
  localStream,
  onRemoteStream,
}: {
  send: (msg: ClientToServer) => void;
  onFrame: (fn: (msg: ServerToClient) => void) => void;
  mode: 'text' | 'video';
  localStream?: MediaStream | null;
  onRemoteStream?: (s: MediaStream | null) => void;
}) {
  const [transport, setTransport] = useState<'none' | 'p2p' | 'relay'>('none');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [role, setRole] = useState<'caller' | 'callee' | null>(null);
  const [searching, setSearching] = useState(false);
  const [matched, setMatched] = useState(false);
  const [connectFailed, setConnectFailed] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [peerTyping, setPeerTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const peerRef = useRef<PeerHandle | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opened = useRef(false);
  const p2pFailedSent = useRef(false);
  const transportRef = useRef(transport);
  transportRef.current = transport;
  const sendRef = useRef(send);
  sendRef.current = send;
  const streamRef = useRef(localStream);
  streamRef.current = localStream;
  const remoteCb = useRef(onRemoteStream);
  remoteCb.current = onRemoteStream;
  const lastTypingAt = useRef(0);
  const lastTypingState = useRef(false);

  const emit = useCallback((msg: ClientToServer) => sendRef.current(msg), []);

  const requestP2pFailed = useCallback(() => {
    if (p2pFailedSent.current || transportRef.current === 'relay') return;
    p2pFailedSent.current = true;
    emit({ t: 'p2p-failed', d: {} });
  }, [emit]);

  const clearPeer = useCallback(() => {
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    fallbackTimer.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    opened.current = false;
    p2pFailedSent.current = false;
  }, []);

  const startPeer = useCallback(
    (isCaller: boolean) => {
      clearPeer();
      const peer = createPeer(iceServers(), isCaller, {
        onSignal: (kind, payload) => emit({ t: 'signal', d: { kind, payload } }),
        onChannelOpen: () => {
          opened.current = true;
          if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
          setTransport('p2p');
          setConnectFailed(false);
        },
        onChannelMessage: (data) => {
          const d = data as { type?: string; text?: string; isTyping?: boolean };
          if (d.type === 'message' && d.text) {
            setMessages((m) => [...m, { id: nextMsgId('s'), text: d.text as string, sender: 'stranger' }]);
          }
          if (d.type === 'typing') setPeerTyping(Boolean(d.isTyping));
        },
        onChannelClosed: () => {
          if (opened.current) requestP2pFailed();
        },
        onConnectionFailed: () => requestP2pFailed(),
        onRemoteStream: (s) => remoteCb.current?.(s),
      });
      if (streamRef.current) peer.addStream(streamRef.current);
      peerRef.current = peer;
      if (isCaller) void peer.createOffer();
      fallbackTimer.current = armP2pFallback(() => requestP2pFailed(), () => opened.current);
    },
    [clearPeer, emit, requestP2pFailed],
  );

  useEffect(() => {
    if (localStream) peerRef.current?.addStream(localStream);
  }, [localStream]);

  useEffect(() => {
    if (!matched || transport !== 'none') {
      if (transport !== 'none') setConnectFailed(false);
      return;
    }
    const timer = setTimeout(() => setConnectFailed(true), CONNECT_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, [matched, transport]);

  useEffect(() => {
    onFrame((msg) => {
      switch (msg.t) {
        case 'searching':
          setSearching(true);
          setMatched(false);
          setConnectFailed(false);
          setChatError(null);
          break;
        case 'search-canceled':
        case 'left':
          setSearching(false);
          setMatched(false);
          setConnectFailed(false);
          break;
        case 'matched':
          setSearching(false);
          setMatched(true);
          setConnectFailed(false);
          setChatError(null);
          setRoomId(msg.d.roomId);
          setRole(msg.d.role);
          setMessages([]);
          setPeerTyping(false);
          setTransport('none');
          startPeer(msg.d.role === 'caller');
          break;
        case 'signal':
          void peerRef.current?.accept(msg.d.kind, msg.d.payload);
          break;
        case 'relay-enabled':
          setTransport('relay');
          setConnectFailed(false);
          break;
        case 'relay-message':
          setMessages((m) => [...m, { id: nextMsgId('r'), text: msg.d.text, sender: 'stranger' }]);
          break;
        case 'relay-typing':
          setPeerTyping(msg.d.isTyping);
          break;
        case 'peer-left':
          setMatched(false);
          setSearching(false);
          setRoomId(null);
          setPeerTyping(false);
          setConnectFailed(false);
          clearPeer();
          setTransport('none');
          setMessages((m) => [
            ...m,
            { id: nextMsgId('sys'), text: 'Stranger disconnected', sender: 'system' },
          ]);
          break;
        case 'error': {
          setChatError(msg.d.message);
          const next = effectsForError(msg.d.code);
          if (next.searching === false) setSearching(false);
          if (next.matched === false) {
            setMatched(false);
            setRoomId(null);
            clearPeer();
          }
          if (next.transport === 'none') setTransport('none');
          break;
        }
        default:
          break;
      }
    });
  }, [onFrame, startPeer, clearPeer]);

  const sendMessage = useCallback(
    (text: string) => {
      if (transport === 'p2p') {
        const ok = peerRef.current?.send({ type: 'message', text });
        if (!ok) return false;
        setMessages((m) => [...m, { id: nextMsgId('y'), text, sender: 'you' }]);
        return true;
      }
      if (transport === 'relay') {
        emit({ t: 'relay-message', d: { text } });
        setMessages((m) => [...m, { id: nextMsgId('y'), text, sender: 'you' }]);
        return true;
      }
      return false;
    },
    [emit, transport],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const now = Date.now();
      if (
        isTyping &&
        lastTypingState.current === isTyping &&
        now - lastTypingAt.current < TYPING_THROTTLE_MS
      ) {
        return;
      }
      lastTypingState.current = isTyping;
      lastTypingAt.current = now;
      if (transport === 'p2p') peerRef.current?.send({ type: 'typing', isTyping });
      else if (transport === 'relay') emit({ t: 'relay-typing', d: { isTyping } });
    },
    [emit, transport],
  );

  const find = useCallback(() => {
    setSearching(true);
    setChatError(null);
    emit({ t: 'find', d: { mode } });
  }, [emit, mode]);

  const leave = useCallback(() => {
    emit({ t: 'leave', d: {} });
    setMatched(false);
    setSearching(false);
    setRoomId(null);
    setPeerTyping(false);
    setConnectFailed(false);
    clearPeer();
    setTransport('none');
  }, [emit, clearPeer]);

  const report = useCallback((reason: string) => emit({ t: 'report', d: { reason } }), [emit]);

  const attachStream = useCallback((stream: MediaStream) => {
    peerRef.current?.addStream(stream);
  }, []);

  const replaceTrack = useCallback(async (track: MediaStreamTrack) => {
    await peerRef.current?.replaceTrack(track);
  }, []);

  return {
    transport,
    roomId,
    role,
    searching,
    matched,
    connectFailed,
    messages,
    peerTyping,
    chatError,
    sendMessage,
    sendTyping,
    find,
    leave,
    report,
    attachStream,
    replaceTrack,
    cancel: () => {
      emit({ t: 'cancel', d: {} });
      setSearching(false);
    },
  };
}
