'use client';

import { useEffect, useState } from 'react';
import { config } from '../lib/config';

export function useOnlineCount() {
  const [online, setOnline] = useState(0);
  const [status, setStatus] = useState<'idle' | 'ready'>('idle');

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await fetch(`${config.serverHttp}/api/online`);
        const data = (await res.json()) as { count?: number };
        if (!cancelled && typeof data.count === 'number') {
          setOnline(data.count);
          setStatus('ready');
        }
      } catch {
        /* ignore */
      }
    };
    void pull();
    const id = setInterval(pull, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { online, status };
}
