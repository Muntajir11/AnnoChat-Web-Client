import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCandidateBuffer } from '../app/lib/iceBuffer';
import { createConnectionGuard } from '../app/lib/connectionGuard';
import { effectsForError, P2P_FALLBACK_MS } from '../app/lib/protocol';
import { armP2pFallback } from '../app/lib/fallback';

describe('effectsForError', () => {
  it('clears searching on COOLDOWN', () => {
    expect(effectsForError('COOLDOWN')).toEqual({ searching: false });
  });
  it('clears matched on NOT_MATCHED', () => {
    expect(effectsForError('NOT_MATCHED')).toEqual({
      searching: false,
      matched: false,
      transport: 'none',
    });
  });
});

describe('createCandidateBuffer', () => {
  it('holds ICE until remote description is set, then flushes in order', async () => {
    const buf = createCandidateBuffer<string>();
    const flushed: string[] = [];
    const flush = async (c: string) => {
      flushed.push(c);
    };
    await buf.add('c1', flush);
    await buf.add('c2', flush);
    expect(buf.size).toBe(2);
    expect(flushed).toEqual([]);
    await buf.markRemoteReady(flush);
    expect(flushed).toEqual(['c1', 'c2']);
    await buf.add('c3', flush);
    expect(flushed).toEqual(['c1', 'c2', 'c3']);
  });
});

describe('createConnectionGuard', () => {
  it('connect twice yields one live socket', () => {
    const guard = createConnectionGuard();
    const closed: string[] = [];
    const first = { close: () => closed.push('first') };
    const second = { close: () => closed.push('second') };
    const g1 = guard.begin();
    expect(guard.attach(g1, first)).toBe(true);
    const g2 = guard.begin();
    expect(closed).toContain('first');
    expect(guard.attach(g1, first)).toBe(false);
    expect(closed.filter((x) => x === 'first').length).toBeGreaterThanOrEqual(2);
    expect(guard.attach(g2, second)).toBe(true);
    expect(guard.socket).toBe(second);
  });
});

describe('usePeerChat fallback state machine', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits exactly one p2p-failed when the channel never opens', () => {
    vi.useFakeTimers();
    const send = vi.fn();
    let opened = false;
    const timer = armP2pFallback(() => send('p2p-failed'), () => opened);
    vi.advanceTimersByTime(P2P_FALLBACK_MS - 100);
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('p2p-failed');
    clearTimeout(timer);
  });

  it('does not fallback if the channel opens at 7.9s', () => {
    vi.useFakeTimers();
    const send = vi.fn();
    let opened = false;
    const timer = armP2pFallback(() => send('p2p-failed'), () => opened);
    vi.advanceTimersByTime(7900);
    opened = true;
    vi.advanceTimersByTime(200);
    expect(send).not.toHaveBeenCalled();
    clearTimeout(timer);
  });
});
