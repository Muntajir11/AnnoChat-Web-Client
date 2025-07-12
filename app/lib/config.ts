// Environment-based configuration utility
const isDevelopment = process.env.NEXT_PUBLIC_NODE_ENV === 'dev';

export const config = {
  isDevelopment,
  environment: isDevelopment ? 'development' : 'production',
  
  // WebSocket URLs
  websocketUrl: isDevelopment 
    ? (process.env.NEXT_PUBLIC_DEV_WS_URL || 'ws://localhost:5000')
    : (process.env.NEXT_PUBLIC_PROD_WS_URL || 'wss://muntajir.me'),
    
  presenceUrl: isDevelopment 
    ? (process.env.NEXT_PUBLIC_DEV_PRESENCE_URL || 'ws://localhost:5000/presence')
    : (process.env.NEXT_PUBLIC_PROD_PRESENCE_URL || 'wss://muntajir.me/presence'),
    
  videoUrl: isDevelopment 
    ? (process.env.NEXT_PUBLIC_DEV_VIDEO_URL || 'ws://localhost:5000/video')
    : (process.env.NEXT_PUBLIC_PROD_VIDEO_URL || 'wss://muntajir.me/video'),
};

// Log configuration on client side (only in development)
if (typeof window !== 'undefined' && isDevelopment) {
  console.log('🌍 Client Environment:', config.environment);
  console.log('🔗 WebSocket URLs:', {
    main: config.websocketUrl,
    presence: config.presenceUrl,
    video: config.videoUrl
  });
}

export default config;
