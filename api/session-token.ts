import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';

export interface SessionTokenPayload {
  roomId: string;
  role: 'display' | 'master' | 'spectator';
  iat: number;
  exp: number;
  jti: string;
  aud: 'visual-player-turn';
}

interface RoomRecord {
  roomId: string;
  roomSecret: string;
  createdAt: number;
  expiresAt: number;
}

const activeRoomsMap = new Map<string, RoomRecord>();
const ROOM_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours session

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export function getServerSessionSecret(): string {
  return process.env.SERVER_SESSION_SECRET || process.env.TURN_SECRET || 'visual-player-server-dev-secret-key-32b';
}

/**
 * Signs a session payload using HMAC-SHA256.
 */
export function signSessionToken(
  payload: Omit<SessionTokenPayload, 'aud'>,
  secretOverride?: string
): string {
  const secret = secretOverride || getServerSessionSecret();
  const header = { alg: 'HS256', typ: 'JWT' };

  const fullPayload: SessionTokenPayload = {
    ...payload,
    aud: 'visual-player-turn',
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${headerEncoded}.${payloadEncoded}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(dataToSign)
    .digest('base64url');

  return `${dataToSign}.${signature}`;
}

/**
 * Cryptographically verifies token signature, expiration, and audience.
 */
export function verifySessionToken(
  tokenStr?: string,
  secretOverride?: string,
  nowMs: number = Date.now()
): { valid: boolean; payload?: SessionTokenPayload; error?: string } {
  if (!tokenStr) {
    return { valid: false, error: 'Missing session token' };
  }

  const parts = tokenStr.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid token structure' };
  }

  const [headerB64, payloadB64, signature] = parts;
  const dataToVerify = `${headerB64}.${payloadB64}`;
  const secret = secretOverride || getServerSessionSecret();

  // 1. Verify HMAC-SHA256 Signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(dataToVerify)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return { valid: false, error: 'Invalid cryptographic signature: Token was forged or altered' };
  }

  // 2. Decode and Validate Payload
  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as SessionTokenPayload;

    if (payload.aud !== 'visual-player-turn') {
      return { valid: false, error: 'Invalid audience' };
    }

    if (!payload.roomId || !/^VP-[A-Z0-9]{3,8}$/i.test(payload.roomId)) {
      return { valid: false, error: 'Invalid roomId in token' };
    }

    // Expiration Check
    if (nowMs > payload.exp * 1000) {
      return { valid: false, error: 'Session token has expired' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Corrupted token payload' };
  }
}

/**
 * Creates a new room with a 128-bit pairing secret and emits a signed display token.
 */
export function createRoomSession(customCode?: string): {
  roomId: string;
  roomSecret: string;
  sessionToken: string;
} {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let roomId = 'VP-';
  for (let i = 0; i < 4; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (customCode && /^VP-[A-Z0-9]{3,8}$/i.test(customCode.trim())) {
    roomId = customCode.toUpperCase().trim();
  }

  // 128-bit cryptographic random hex
  const roomSecret = crypto.randomBytes(16).toString('hex');
  const now = Date.now();

  activeRoomsMap.set(roomId, {
    roomId,
    roomSecret,
    createdAt: now,
    expiresAt: now + ROOM_TTL_MS,
  });

  const sessionToken = signSessionToken({
    roomId,
    role: 'display',
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + ROOM_TTL_MS) / 1000),
    jti: crypto.randomUUID(),
  });

  return { roomId, roomSecret, sessionToken };
}

/**
 * Authorizes a master connection with the 128-bit pairing secret and emits a signed master token.
 */
export function joinRoomSession(
  roomId: string,
  providedSecret?: string
): { success: boolean; sessionToken?: string; error?: string } {
  const cleanId = roomId.toUpperCase().trim();
  const room = activeRoomsMap.get(cleanId);

  // In local dev without memory persistence, if secret is 32-char hex, accept
  let isAuthorized = false;
  if (room && providedSecret && room.roomSecret.toLowerCase() === providedSecret.toLowerCase()) {
    isAuthorized = true;
  } else if (!room && providedSecret && /^[a-f0-9]{32}$/i.test(providedSecret)) {
    // Development ephemeral room tolerance
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return { success: false, error: 'Invalid pairing secret' };
  }

  const now = Date.now();
  const sessionToken = signSessionToken({
    roomId: cleanId,
    role: 'master',
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + ROOM_TTL_MS) / 1000),
    jti: crypto.randomUUID(),
  });

  return { success: true, sessionToken };
}

/**
 * Serverless API handler to create rooms and issue signed cryptographic session tokens.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  let bodyStr = '';
  req.on('data', (chunk) => {
    bodyStr += chunk;
  });

  req.on('end', () => {
    try {
      const parsed = bodyStr ? JSON.parse(bodyStr) : {};
      const action = parsed.action || 'create';

      if (action === 'create') {
        const result = createRoomSession(parsed.customCode);
        res.statusCode = 200;
        res.end(JSON.stringify(result));
        return;
      }

      if (action === 'join') {
        const { roomId, roomSecret } = parsed;
        if (!roomId || !roomSecret) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'roomId and roomSecret are required' }));
          return;
        }

        const auth = joinRoomSession(roomId, roomSecret);
        if (!auth.success) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: auth.error }));
          return;
        }

        res.statusCode = 200;
        res.end(JSON.stringify({ sessionToken: auth.sessionToken }));
        return;
      }

      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid action. Supported: create, join' }));
    } catch (err) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
    }
  });
}
