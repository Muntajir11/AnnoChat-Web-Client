export const MAX_RELAY_TEXT = 2048;
export const MAX_INPUT_CHARS = 4096;
export const P2P_FALLBACK_MS = 8000;
export const CONNECT_WATCHDOG_MS = 12_000;
export const TYPING_THROTTLE_MS = 1000;

export type ClientToServer =
  | { t: 'find'; d: { mode: 'text' | 'video' } }
  | { t: 'cancel'; d: Record<string, never> }
  | { t: 'signal'; d: { kind: 'offer' | 'answer' | 'ice'; payload: unknown } }
  | { t: 'leave'; d: Record<string, never> }
  | { t: 'p2p-failed'; d: Record<string, never> }
  | { t: 'relay-message'; d: { text: string } }
  | { t: 'relay-typing'; d: { isTyping: boolean } }
  | { t: 'report'; d: { reason: string } };

export type ServerToClient =
  | { t: 'ready'; d: { socketId: string; online: number } }
  | { t: 'online'; d: { count: number } }
  | { t: 'searching'; d: Record<string, never> }
  | { t: 'search-canceled'; d: Record<string, never> }
  | { t: 'matched'; d: { roomId: string; role: 'caller' | 'callee' } }
  | { t: 'signal'; d: { kind: 'offer' | 'answer' | 'ice'; payload: unknown } }
  | { t: 'relay-enabled'; d: Record<string, never> }
  | { t: 'relay-message'; d: { text: string; at: number } }
  | { t: 'relay-typing'; d: { isTyping: boolean } }
  | { t: 'peer-left'; d: Record<string, never> }
  | { t: 'left'; d: Record<string, never> }
  | { t: 'error'; d: { code: string; message: string } };

export function isServerFrame(x: unknown): x is ServerToClient {
  return Boolean(x && typeof x === 'object' && typeof (x as { t?: unknown }).t === 'string');
}

export function effectsForError(code: string): {
  searching?: boolean;
  matched?: boolean;
  transport?: 'none';
} {
  if (code === 'COOLDOWN' || code === 'BAD_PAYLOAD') {
    return { searching: false };
  }
  if (code === 'NOT_MATCHED') {
    return { searching: false, matched: false, transport: 'none' };
  }
  return {};
}
