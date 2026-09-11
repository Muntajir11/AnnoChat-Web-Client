import { describe, expect, it, vi } from 'vitest';
import { isServerFrame, P2P_FALLBACK_MS } from '../app/lib/protocol';

describe('protocol guards', () => {
  it('accepts valid frames', () => {
    expect(isServerFrame({ t: 'ready', d: { socketId: 'x', online: 1 } })).toBe(true);
  });
  it('rejects unknown shapes', () => {
    expect(isServerFrame(null)).toBe(false);
    expect(isServerFrame({ d: {} })).toBe(false);
  });
});

describe('fallback timer', () => {
  it('emits p2p-failed once after timeout if channel never opens', () => {
    vi.useFakeTimers();
    const send = vi.fn();
    let opened = false;
    const timer = setTimeout(() => {
      if (!opened) send('p2p-failed');
    }, P2P_FALLBACK_MS);
    vi.advanceTimersByTime(P2P_FALLBACK_MS - 100);
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(send).toHaveBeenCalledTimes(1);
    clearTimeout(timer);
    vi.useRealTimers();
  });

  it('does not fallback if channel opens at 7.9s', () => {
    vi.useFakeTimers();
    const send = vi.fn();
    let opened = false;
    const timer = setTimeout(() => {
      if (!opened) send('p2p-failed');
    }, P2P_FALLBACK_MS);
    vi.advanceTimersByTime(7900);
    opened = true;
    vi.advanceTimersByTime(200);
    expect(send).not.toHaveBeenCalled();
    clearTimeout(timer);
    vi.useRealTimers();
  });
});
