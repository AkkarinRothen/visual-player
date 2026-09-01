import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';

// Strict Allowed Host Patterns for Visual Player Project
const ALLOWED_EXACT_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'visual-player.vercel.app',
  'visual-player-akkarinrothens-projects.vercel.app',
  'visualplayer.app',
]);

const ALLOWED_HOST_SUFFIXES = [
  '-akkarinrothens-projects.vercel.app',
  '.visualplayer.app',
];

// In-Memory Rate Limiter (Sliding Window per client fingerprint / room)
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // Strict: 5 requests per minute

/**
 * Checks and updates rate limit for a client fingerprint or room ID.
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
 * Validates request origin/referer strictly against Visual Player domain allowlist.
 */
export function isAllowedOrigin(originHeader?: string, refererHeader?: string): boolean {
  const check = (urlStr?: string): boolean => {
    if (!urlStr) return false;
    try {
      const parsed = new URL(urlStr);
      const host = parsed.hostname.toLowerCase();
      
      // 1. Exact Host Match
      if (ALLOWED_EXACT_HOSTS.has(host)) return true;

      // 2. Strict Project Suffix Match (Previews under akkarinrothen account)
      for (const suffix of ALLOWED_HOST_SUFFIXES) {
        if (host.endsWith(suffix) && (host.startsWith('visual-player') || suffix === '.visualplayer.app')) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  };

  if (originHeader && check(originHeader)) return true;
  if (refererHeader && check(refererHeader)) return true;
  if (!originHeader && !refererHeader && process.env.NODE_ENV !== 'production') return true;

  return false;
}

/**
 * Validates session token payload (Room ID, Timestamp, Anti-Replay window <= 5 min).
 */
export function validateSessionToken(
  tokenStr?: string,
  nowMs: number = Date.now()
): { valid: boolean; roomId?: string; error?: string } {
  if (!tokenStr) {
    return { valid: false, error: 'Missing session token' };
  }

  try {
    const decoded = Buffer.from(tokenStr, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as { roomId?: string; timestamp?: number; nonce?: string };

    if (!parsed.roomId || typeof parsed.roomId !== 'string') {
      return { valid: false, error: 'Invalid room format' };
    }

    // Validate room code format (e.g. VP-ABCD or custom alphanumeric)
    if (!/^VP-[A-Z0-9]{3,8}$/i.test(parsed.roomId.trim())) {
      return { valid: false, error: 'Invalid room code structure' };
    }

    if (!parsed.timestamp || typeof parsed.timestamp !== 'number') {
      return { valid: false, error: 'Invalid timestamp' };
    }

    // Clock skew / anti-replay window: maximum 5 minutes (300,000 ms) difference
    const diff = Math.abs(nowMs - parsed.timestamp);
    if (diff > 5 * 60 * 1000) {
      return { valid: false, error: 'Session token timestamp expired or desynchronized (> 5 minutes)' };
    }

    return { valid: true, roomId: parsed.roomId.toUpperCase().trim() };
  } catch (err) {
    return { valid: false, error: 'Corrupted session token' };
  }
}

/**
 * Generates HMAC-SHA1 credentials for Coturn / RFC 5766 standard REST TURN servers.
 */
export function generateTurnCredentials(
  ttlSeconds: number = 1800,
  secretOverride?: string,
  nowMs: number = Date.now()
): { username: string; credential: string; expiryTimestamp: number } {
  const expiryTimestamp = Math.floor(nowMs / 1000) + ttlSeconds;
  const username = `${expiryTimestamp}:visual-player-session`;
  const turnSecret = secretOverride || process.env.TURN_SECRET || '';

  if (!turnSecret) {
    throw new Error('TURN_SECRET is not configured');
  }

  const hmac = crypto.createHmac('sha1', turnSecret);
  hmac.update(username);
  const credential = hmac.digest('base64');

  return { username, credential, expiryTimestamp };
}

/**
 * Serverless API handler to issue ephemeral TURN credentials with strict security hardening.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // Strict No-Store Security Headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 1. Fail-Closed Check in Production
  const isProd = process.env.NODE_ENV === 'production';
  const turnSecret = process.env.TURN_SECRET;
  const turnDomain = process.env.TURN_DOMAIN;

  if (isProd && (!turnSecret || !turnDomain)) {
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: 'Server Configuration Error: TURN credentials service is not configured on this deployment.',
      })
    );
    return;
  }

  // 2. Strict Origin / Referer Allowlist Check
  const originHeader = req.headers['origin'] as string | undefined;
  const refererHeader = req.headers['referer'] as string | undefined;

  if (!isAllowedOrigin(originHeader, refererHeader)) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: 'Forbidden: Unauthorized Origin' }));
    return;
  }

  // 3. Session Token Authorization Check
  const authHeader = (req.headers['x-session-token'] as string | undefined) ||
    new URL(req.url || '/', 'http://localhost').searchParams.get('token') || undefined;

  const sessionAuth = validateSessionToken(authHeader);
  if (!sessionAuth.valid) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: `Unauthorized: ${sessionAuth.error}` }));
    return;
  }

  // 4. Rate Limiting Check (by roomId + client fingerprint)
  const forwardedFor = (req.headers['x-forwarded-for'] as string) || '';
  const clientIp = forwardedFor.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const userAgent = (req.headers['user-agent'] as string) || '';
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${sessionAuth.roomId}-${clientIp}-${userAgent}`)
    .digest('hex');

  const rateCheck = checkRateLimit(fingerprint);
  if (!rateCheck.allowed) {
    res.statusCode = 429;
    res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
    res.end(
      JSON.stringify({
        error: 'Too Many Requests: Rate limit exceeded for this room session.',
        retryAfter: rateCheck.retryAfterSeconds,
      })
    );
    return;
  }

  // 5. Generate Ephemeral RFC 5766 HMAC Credentials
  const ttlSeconds = 1800; // 30 minutes
  try {
    const activeSecret = turnSecret || 'visual-player-turn-dev-credential';
    const activeDomain = turnDomain || 'turn.visualplayer.app';
    const { username, credential, expiryTimestamp } = generateTurnCredentials(ttlSeconds, activeSecret);

    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      {
        urls: [
          `turn:${activeDomain}:3478?transport=udp`,
          `turn:${activeDomain}:3478?transport=tcp`,
          `turns:${activeDomain}:5349?transport=tcp`,
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
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to generate cryptographic credentials' }));
  }
}
