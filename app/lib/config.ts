const isDev = process.env.NODE_ENV !== 'production';

export const config = {
  isDev,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || (isDev ? 'http://localhost:3000' : 'https://annnochat.me'),
  serverHttp: process.env.NEXT_PUBLIC_SERVER_HTTP || (isDev ? 'http://localhost:5000' : 'https://api.annnochat.me'),
  serverWs: process.env.NEXT_PUBLIC_SERVER_WS || (isDev ? 'ws://localhost:5000' : 'wss://api.annnochat.me'),
  enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  turnUrl: process.env.NEXT_PUBLIC_TURN_URL || '',
  turnUser: process.env.NEXT_PUBLIC_TURN_USER || '',
  turnPass: process.env.NEXT_PUBLIC_TURN_PASS || '',
  iceTransportPolicy: (process.env.NEXT_PUBLIC_ICE_TRANSPORT_POLICY === 'relay' ? 'relay' : 'all') as
    | 'all'
    | 'relay',
};

export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  if (config.turnUrl) {
    servers.push({
      urls: config.turnUrl,
      username: config.turnUser,
      credential: config.turnPass,
    });
  }
  return servers;
}

export default config;
