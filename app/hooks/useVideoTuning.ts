'use client';

import { useEffect } from 'react';

export function useVideoTuning(stream: MediaStream | null) {
  useEffect(() => {
    const track = stream?.getVideoTracks()[0];
    if (!track?.applyConstraints) return;
    void track.applyConstraints({ width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } }).catch(() => {
      /* constraints are best-effort */
    });
  }, [stream]);
}
