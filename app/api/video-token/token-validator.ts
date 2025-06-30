import crypto from 'crypto';

// In-memory storage for rate limiting and token validation
// In production, consider using Redis or a database
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const tokenStore = new Map<string, { ip: string; expiresAt: number; createdAt: number }>();

// Configuration
const CONFIG = {
  RATE_LIMIT: {
    MAX_REQUESTS: 10, // Max tokens per IP per window
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  },
  TOKEN: {
    EXPIRES_MS: 60 * 60 * 1000, // 1 hour
    SECRET: process.env.VIDEO_TOKEN_SECRET || 'your-secret-key-change-in-production',
  },
};

// Clean up expired tokens and rate limit entries periodically
function cleanup() {
  const now = Date.now();
  
  // Clean expired tokens
  for (const [token, data] of tokenStore.entries()) {
    if (data.expiresAt < now) {
      tokenStore.delete(token);
    }
  }
  
  // Clean expired rate limit entries
  for (const [ip, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(ip);
    }
  }
}

// Token validation function for use in video chat server
export function validateToken(token: string, signature: string, clientIP: string): boolean {
  try {
    cleanup();
    
    const tokenData = tokenStore.get(token);
    if (!tokenData) {
      return false;
    }
    
    // Check expiration
    if (tokenData.expiresAt < Date.now()) {
      tokenStore.delete(token);
      return false;
    }
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', CONFIG.TOKEN.SECRET)
      .update(token + clientIP)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return false;
    }
    
    // Optional: Check if IP matches (for additional security)
    // if (tokenData.ip !== clientIP) {
    //   return false;
    // }
    
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

// Export stores and CONFIG for use in route handler
export { tokenStore, rateLimitStore, CONFIG };
