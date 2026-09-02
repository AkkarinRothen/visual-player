import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { verifySessionToken } from './session-token.js';
import { getSessionStore } from './session-store.js';

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

const RATE_LIMIT_WINDOW_SEC = 60; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // Strict: 5 requests per minute

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

      // 2. Allow any visual-player preview/production deployment on Vercel
      if (host.startsWith('visual-player') && host.endsWith('.vercel.app')) {
        return true;
      }

      // 3. Strict Project Suffix Match (Previews under akkarinrothen account)
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
 * Serverless API handler to issue ephemeral TURN credentials with strict cryptographic session verification.
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

  // 1. Fallback gracefully to STUN if TURN is not configured on this deployment
  const turnSecret = process.env.TURN_SECRET;
  const turnDomain = process.env.TURN_DOMAIN;

  if (!turnSecret || !turnDomain) {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        mode: 'stun_only',
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' },
        ],
        ttl: 1800,
        warning: 'TURN server credentials not configured; operating in direct STUN mode.',
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

  // 3. Cryptographic Server-Signed Token Authorization Check (HEADERS ONLY, NEVER QUERY STRING)
  let rawToken = req.headers['x-session-token'] as string | undefined;
  const authHeader = req.headers['authorization'] as string | undefined;

  if (!rawToken && authHeader && authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.substring(7).trim();
  }

  if (!rawToken) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: 'Unauthorized: Missing required session authorization header' }));
    return;
  }

  const sessionAuth = await verifySessionToken(rawToken);
  if (!sessionAuth.valid || !sessionAuth.payload) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: `Unauthorized: ${sessionAuth.error}` }));
    return;
  }

  const { roomId } = sessionAuth.payload;

  // 4. Distributed Rate Limiting Check (by roomId + client fingerprint)
  const forwardedFor = (req.headers['x-forwarded-for'] as string) || '';
  const clientIp = forwardedFor.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const userAgent = (req.headers['user-agent'] as string) || '';
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${roomId}-${clientIp}-${userAgent}`)
    .digest('hex');

  const store = getSessionStore();
  const rateCheck = await store.checkRateLimit(fingerprint, MAX_REQUESTS_PER_WINDOW, RATE_LIMIT_WINDOW_SEC);
  if (!rateCheck.allowed) {
    res.statusCode = 429;
    res.setHeader('Retry-After', String(rateCheck.retryAfter));
    res.end(
      JSON.stringify({
        error: 'Too Many Requests: Rate limit exceeded for this room session.',
        retryAfter: rateCheck.retryAfter,
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
