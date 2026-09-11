import { config } from './config';
import { createCandidateBuffer } from './iceBuffer';

export type PeerHandlers = {
  onSignal: (kind: 'offer' | 'answer' | 'ice', payload: unknown) => void;
  onChannelOpen: () => void;
  onChannelMessage: (data: unknown) => void;
  onChannelClosed: () => void;
  onConnectionFailed?: () => void;
  onRemoteStream?: (stream: MediaStream) => void;
};

export function createPeer(ice: RTCIceServer[], isCaller: boolean, h: PeerHandlers) {
  const pc = new RTCPeerConnection({
    iceServers: ice,
    bundlePolicy: 'max-bundle',
    iceTransportPolicy: config.iceTransportPolicy,
  });
  let channel: RTCDataChannel | null = null;
  const iceBuf = createCandidateBuffer<RTCIceCandidateInit>();
  let failed = false;

  const fail = () => {
    if (failed) return;
    failed = true;
    h.onConnectionFailed?.();
  };

  const wire = (ch: RTCDataChannel) => {
    channel = ch;
    ch.onopen = () => h.onChannelOpen();
    ch.onclose = () => h.onChannelClosed();
    ch.onmessage = (e) => {
      try {
        h.onChannelMessage(JSON.parse(String(e.data)));
      } catch {
        /* ignore malformed peer frames */
      }
    };
  };

  if (isCaller) wire(pc.createDataChannel('chat', { ordered: true }));
  else pc.ondatachannel = (e) => wire(e.channel);

  pc.onicecandidate = (e) => {
    if (e.candidate) h.onSignal('ice', e.candidate);
  };
  pc.ontrack = (e) => h.onRemoteStream?.(e.streams[0]);
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') fail();
  };
  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'failed') fail();
  };

  const addIce = (payload: unknown) => pc.addIceCandidate(payload as RTCIceCandidateInit);

  return {
    pc,
    send: (obj: unknown) => {
      if (channel?.readyState !== 'open') return false;
      channel.send(JSON.stringify(obj));
      return true;
    },
    async createOffer() {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      h.onSignal('offer', offer);
    },
    async accept(kind: 'offer' | 'answer' | 'ice', payload: unknown) {
      if (kind === 'offer') {
        await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
        await iceBuf.markRemoteReady(addIce);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        h.onSignal('answer', answer);
      } else if (kind === 'answer') {
        await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
        await iceBuf.markRemoteReady(addIce);
      } else {
        await iceBuf.add(payload as RTCIceCandidateInit, addIce);
      }
    },
    addStream(stream: MediaStream) {
      for (const track of stream.getTracks()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
        if (sender) void sender.replaceTrack(track);
        else pc.addTrack(track, stream);
      }
    },
    async replaceTrack(track: MediaStreamTrack) {
      const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
      if (sender) await sender.replaceTrack(track);
      else pc.addTrack(track);
    },
    close() {
      channel?.close();
      pc.close();
    },
  };
}

export type PeerHandle = ReturnType<typeof createPeer>;
