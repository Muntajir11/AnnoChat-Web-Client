import { P2P_FALLBACK_MS } from './protocol';

export function armP2pFallback(onFail: () => void, isOpen: () => boolean, ms = P2P_FALLBACK_MS) {
  return setTimeout(() => {
    if (!isOpen()) onFail();
  }, ms);
}
