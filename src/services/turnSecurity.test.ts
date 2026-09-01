import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isAllowedOrigin,
  checkRateLimit,
  generateTurnCredentials,
} from '../../api/turn-credentials';
import {
  signSessionToken,
  verifySessionToken,
  createRoomSession,
  joinRoomSession,
} from '../../api/session-token';
import {
  startTurnRenewalWatcher,
  getIceConfiguration,
} from './iceConfig';

describe('Cryptographic Session Token & Adversarial Security Suite', () => {
  const SERVER_SECRET = 'test-server-cryptographic-secret-key-32b';

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Adversarial Cryptographic Verification (Negative Tests)', () => {
    it('rejects forged Base64 tokens not signed with the server secret', () => {
      // Attacker creates an unsigned or fake JSON in base64
      const fakePayload = { roomId: 'VP-HACK', role: 'master', exp: 9999999999 };
      const fakeToken = `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(fakePayload))}.fake-signature`;

      const result = verifySessionToken(fakeToken, SERVER_SECRET);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid cryptographic signature');
    });

    it('detects tampering when payload (e.g. roomId or role) is altered after signing', () => {
      // Legitimate sign
      const token = signSessionToken(
        {
          roomId: 'VP-ORIG',
          role: 'display',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          jti: 'nonce-1',
        },
        SERVER_SECRET
      );

      const [header, , signature] = token.split('.');
      // Attacker tampers payload to VP-HACK
      const tamperedPayload = Buffer.from(
        JSON.stringify({ roomId: 'VP-HACK', role: 'master', exp: 9999999999, aud: 'visual-player-turn' })
      ).toString('base64url');

      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;
      const result = verifySessionToken(tamperedToken, SERVER_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid cryptographic signature');
    });

    it('rejects tokens signed with a different / attacker key', () => {
      const tokenSignedWithAttackerKey = signSessionToken(
        {
          roomId: 'VP-TEST',
          role: 'master',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          jti: 'nonce-2',
        },
        'attacker-secret-key'
      );

      const result = verifySessionToken(tokenSignedWithAttackerKey, SERVER_SECRET);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid cryptographic signature');
    });

    it('rejects legitimately signed tokens once they expire', () => {
      const expiredToken = signSessionToken(
        {
          roomId: 'VP-TEST',
          role: 'master',
          iat: 1000,
          exp: 2000, // Expired at timestamp 2000
          jti: 'nonce-expired',
        },
        SERVER_SECRET
      );

      const result = verifySessionToken(expiredToken, SERVER_SECRET, 3000 * 1000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Session token has expired');
    });
  });

  describe('2. Legitimate Cryptographic Issuance & Pairing Workflow', () => {
    it('creates room with 128-bit secret and verifiable display session token', () => {
      const room = createRoomSession('VP-PLAY');
      expect(room.roomId).toBe('VP-PLAY');
      expect(room.roomSecret.length).toBe(32); // 16 bytes = 32 hex chars (128 bits)

      const verify = verifySessionToken(room.sessionToken);
      expect(verify.valid).toBe(true);
      expect(verify.payload?.role).toBe('display');
      expect(verify.payload?.roomId).toBe('VP-PLAY');
    });

    it('authorizes master when providing correct 128-bit pairing secret', () => {
      const room = createRoomSession('VP-GAME');
      const joinResult = joinRoomSession('VP-GAME', room.roomSecret);

      expect(joinResult.success).toBe(true);
      expect(joinResult.sessionToken).toBeTruthy();

      const verify = verifySessionToken(joinResult.sessionToken!);
      expect(verify.valid).toBe(true);
      expect(verify.payload?.role).toBe('master');
      expect(verify.payload?.roomId).toBe('VP-GAME');
    });

    it('rejects master when providing wrong pairing secret', () => {
      createRoomSession('VP-LOCK');
      const badJoin = joinRoomSession('VP-LOCK', 'wrong-secret-1234');
      expect(badJoin.success).toBe(false);
      expect(badJoin.error).toBe('Invalid pairing secret');
    });
  });

  describe('3. Strict Allowlist & Project Origin Enforcement', () => {
    it('accepts exact Visual Player production and preview domains', () => {
      expect(isAllowedOrigin('https://visual-player.vercel.app')).toBe(true);
      expect(isAllowedOrigin('https://visual-player-akkarinrothens-projects.vercel.app')).toBe(true);
      expect(isAllowedOrigin('https://visual-player-git-feat-akkarinrothens-projects.vercel.app')).toBe(true);
      expect(isAllowedOrigin('https://visualplayer.app')).toBe(true);
      expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
    });

    it('strictly rejects unauthorized third-party apps on .vercel.app', () => {
      expect(isAllowedOrigin('https://another-project.vercel.app')).toBe(false);
      expect(isAllowedOrigin('https://malicious-app.vercel.app')).toBe(false);
      expect(isAllowedOrigin('https://attacker-site.com')).toBe(false);
    });
  });

  describe('4. Rate Limiting & Fail-Closed Behavior', () => {
    it('allows up to 5 requests in 1 minute and returns 429 Retry-After on 6th request', () => {
      const fingerprint = 'room-VP-CRYPTO-client-1';
      const baseTime = 1000000;

      for (let i = 0; i < 5; i++) {
        const res = checkRateLimit(fingerprint, baseTime);
        expect(res.allowed).toBe(true);
      }

      const blocked = checkRateLimit(fingerprint, baseTime);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('throws error when secret is empty to prevent insecure dummy fallback in production', () => {
      expect(() => generateTurnCredentials(1800, '')).toThrow('TURN_SECRET is not configured');
    });
  });

  describe('5. Client Renewal Watcher Lifecycle', () => {
    it('initializes watcher bound to room code and cleans up on unmount', async () => {
      const stopWatcher = startTurnRenewalWatcher('VP-ABCD');
      expect(typeof stopWatcher).toBe('function');

      const config = await getIceConfiguration({ roomId: 'VP-ABCD' });
      expect(config.iceServers?.length).toBeGreaterThanOrEqual(1);

      stopWatcher();
    });
  });
});
