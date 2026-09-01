import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';

// In-Memory Rate Limiter (Sliding Window per client fingerprint)
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

/**
 * Checks and updates rate limit for a client hash.
 */
export function checkRateLimit(clientFingerprint: string, now: number = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
  // Periodic cleanup of stale entries
  if (rateLimitMap.size > 1000) {
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  const record = rateLimitMap.get(clientFingerprint);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientFingerprint, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  record.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Validates request origin/referer against allowed domain patterns.
 */
export function isAllowedOrigin(originHeader?: string, refererHeader?: string): boolean {
  const check = (urlStr?: string): boolean => {
    if (!urlStr) return false;
    try {
      const parsed = new URL(urlStr);
      const host = parsed.hostname.toLowerCase();
      // Allow localhost / loopback
      if (host === 'localhost' || host === '127.0.0.1') return true;
      // Allow Vercel preview & production deployments
      if (host.endsWith('.vercel.app')) return true;
      // Allow custom domain
      if (host === 'visualplayer.app' || host.endsWith('.visualplayer.app')) return true;
      return false;
    } catch {
      return false;
    }
  };

  // If both are present, either valid origin or referer is accepted
  if (originHeader && check(originHeader)) return true;
  if (refererHeader && check(refererHeader)) return true;
  // If neither is present (e.g. non-browser direct curl in dev), allow only in local DEV mode
  if (!originHeader && !refererHeader && process.env.NODE_ENV !== 'production') return true;

  return false;
}

/**
 * Generates HMAC-SHA1 credentials for Coturn / standard REST TURN servers.
 */
export function generateTurnCredentials(
  ttlSeconds: number = 1800,
  secretOverride?: string,
  nowMs: number = Date.now()
): { username: string; credential: string; expiryTimestamp: number } {
  const expiryTimestamp = Math.floor(nowMs / 1000) + ttlSeconds;
  const username = `${expiryTimestamp}:visual-player-session`;
  const turnSecret = secretOverride || process.env.TURN_SECRET || 'visual-player-turn-dev-credential';

  const hmac = crypto.createHmac('sha1', turnSecret);
  hmac.update(username);
  const credential = hmac.digest('base64');

  return { username, credential, expiryTimestamp };
}

/**
 * Serverless API handler to issue ephemeral TURN credentials with rate limiting and origin authorization.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Only GET allowed
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // Set Strict Security & No-Store Headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const originHeader = req.headers['origin'] as string | undefined;
  const refererHeader = req.headers['referer'] as string | undefined;

  // 1. Origin Authorization Check
  if (!isAllowedOrigin(originHeader, refererHeader)) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: 'Forbidden: Unauthorized Origin' }));
    return;
  }

  // 2. Client Fingerprint & Rate Limiting Check
  const forwardedFor = (req.headers['x-forwarded-for'] as string) || '';
  const clientIp = forwardedFor.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const userAgent = (req.headers['user-agent'] as string) || '';
  const fingerprint = crypto.createHash('sha256').update(`${clientIp}-${userAgent}`).digest('hex');

  const rateCheck = checkRateLimit(fingerprint);
  if (!rateCheck.allowed) {
    res.statusCode = 429;
    res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
    res.end(
      JSON.stringify({
        error: 'Too Many Requests',
        retryAfter: rateCheck.retryAfterSeconds,
      })
    );
    return;
  }

  // 3. Generate Ephemeral HMAC Credentials
  const ttlSeconds = 1800; // 30 minutes
  const { username, credential, expiryTimestamp } = generateTurnCredentials(ttlSeconds);
  const turnDomain = process.env.TURN_DOMAIN || 'turn.visualplayer.app';

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: [
        `turn:${turnDomain}:3478?transport=udp`,
        `turn:${turnDomain}:3478?transport=tcp`,
        `turns:${turnDomain}:5349?transport=tcp`,
      ],
      username,
      credential,
    },
  ];

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      iceServers,
      ttl: ttlSeconds,
      expiresAt: expiryTimestamp * 1000,
      timestamp: Date.now(),
    })
  );
}
