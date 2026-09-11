import { config } from './config';

export async function fetchTicket(mode: 'text' | 'video' | 'any' = 'any') {
  const res = await fetch(`${config.serverHttp}/api/ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'RATE_LIMITED');
  }
  if (!res.ok) throw new Error('Failed to get ticket');
  return res.json() as Promise<{ ticket: string; wsUrl: string }>;
}
