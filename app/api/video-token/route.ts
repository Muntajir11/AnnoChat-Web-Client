import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { tokenStore, rateLimitStore, CONFIG } from './token-validator';

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

// Get client IP address
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback for local development
  return '127.0.0.1';
}

// Check rate limit for an IP
function checkRateLimit(ip: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  
  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired entry
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + CONFIG.RATE_LIMIT.WINDOW_MS,
    });
    return { allowed: true };
  }
  
  if (entry.count >= CONFIG.RATE_LIMIT.MAX_REQUESTS) {
    return { allowed: false, resetTime: entry.resetTime };
  }
  
  // Increment count
  entry.count++;
  return { allowed: true };
}

// Generate a secure token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create JWT-like signature for token validation
function createTokenSignature(token: string, ip: string, expiresAt: number): string {
  const payload = `${token}:${ip}:${expiresAt}`;
  return crypto
    .createHmac('sha256', CONFIG.TOKEN.SECRET)
    .update(payload)
    .digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    // Clean up expired entries
    cleanup();
    
    const clientIP = getClientIP(request);
    
    // Check rate limit
    const rateLimit = checkRateLimit(clientIP);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = Math.ceil((rateLimit.resetTime! - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many token requests. Try again in ${resetTimeSeconds} seconds.`,
          retryAfter: resetTimeSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': resetTimeSeconds.toString(),
          },
        }
      );
    }
    
    // Generate token
    const token = generateToken();
    const now = Date.now();
    const expiresAt = now + CONFIG.TOKEN.EXPIRES_MS;
    
    // Create signature
    const signature = createTokenSignature(token, clientIP, expiresAt);
    
    // Store token
    tokenStore.set(token, {
      ip: clientIP,
      expiresAt,
      createdAt: now,
    });
    
    // Return token with metadata
    return NextResponse.json({
      success: true,
      token,
      signature,
      expiresAt,
      expiresIn: CONFIG.TOKEN.EXPIRES_MS / 1000, // seconds
    });
    
  } catch (error) {
    console.error('Error generating video token:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to generate token',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Use POST to generate a token',
    },
    { status: 405 }
  );
}