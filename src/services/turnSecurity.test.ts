import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isAllowedOrigin,
  checkRateLimit,
  validateSessionToken,
  generateTurnCredentials,
} from '../../api/turn-credentials';
import {
  createClientSessionToken,
  startTurnRenewalWatcher,
  getIceConfiguration,
} from './iceConfig';

describe('Strict TURN Endpoint Hardening & Session Security Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Strict Allowlist & Project Origin Enforcement', () => {
    it('accepts exact Visual Player production and preview domains', () => {
      expect(isAllowedOrigin('https://visual-player.vercel.app')).toBe(true);
      expect(isAllowedOrigin('https://visual-player-akkarinrothens-projects.vercel.app')).toBe(true);
      expect(isAllowedOrigin('https://visual-player-git-feat-akkarinrothens-projects.vercel.app')).toBe(true);
      expect(isAllowedOrigin('https://visualplayer.app')).toBe(true);
      expect(isAllowedOrigin('https://app.visualplayer.app')).toBe(true);
      expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:5173')).toBe(true);
    });

    it('strictly rejects unauthorized third-party apps on .vercel.app', () => {
      expect(isAllowedOrigin('https://another-project.vercel.app')).toBe(false);
      expect(isAllowedOrigin('https://malicious-app.vercel.app')).toBe(false);
      expect(isAllowedOrigin('https://random-user-projects.vercel.app')).toBe(false);
      expect(isAllowedOrigin('https://attacker-site.com')).toBe(false);
    });
  });

  describe('2. Room Session Token Authentication & Anti-Replay', () => {
    it('validates legitimate client session tokens within 5-minute window', () => {
      const now = 1700000000000;
      const validToken = btoa(JSON.stringify({ roomId: 'VP-ABCD', timestamp: now, nonce: 'xyz123' }));

      const auth = validateSessionToken(validToken, now);
      expect(auth.valid).toBe(true);
      expect(auth.roomId).toBe('VP-ABCD');
    });

    it('rejects session tokens with desynchronized/expired timestamps (> 5 minutes)', () => {
      const serverNow = 1700000000000;
      const oldTime = serverNow - 6 * 60 * 1000; // 6 minutes ago
      const expiredToken = btoa(JSON.stringify({ roomId: 'VP-ABCD', timestamp: oldTime }));

      const auth = validateSessionToken(expiredToken, serverNow);
      expect(auth.valid).toBe(false);
      expect(auth.error).toContain('expired or desynchronized');
    });

    it('rejects malformed room codes and corrupted tokens', () => {
      const badRoomToken = btoa(JSON.stringify({ roomId: 'INVALID_CODE_123', timestamp: Date.now() }));
      expect(validateSessionToken(badRoomToken).valid).toBe(false);
      expect(validateSessionToken('not-a-base64-token').valid).toBe(false);
      expect(validateSessionToken(undefined).valid).toBe(false);
    });

    it('creates properly structured client session tokens in iceConfig', () => {
      const token = createClientSessionToken('VP-K7X9');
      const validation = validateSessionToken(token);
      expect(validation.valid).toBe(true);
      expect(validation.roomId).toBe('VP-K7X9');
    });
  });

  describe('3. Strict Rate Limiting (5 requests/min per room fingerprint)', () => {
    it('allows up to 5 requests in 1 minute and returns 429 Retry-After on 6th request', () => {
      const fingerprint = 'room-VP-TEST-client-1';
      const baseTime = 1000000;

      // Requests 1 through 5 are allowed
      for (let i = 0; i < 5; i++) {
        const res = checkRateLimit(fingerprint, baseTime);
        expect(res.allowed).toBe(true);
      }

      // 6th request within the same minute is blocked
      const blocked = checkRateLimit(fingerprint, baseTime);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

      // Next window permits requests again
      const nextWindow = checkRateLimit(fingerprint, baseTime + 61000);
      expect(nextWindow.allowed).toBe(true);
    });
  });

  describe('4. Cryptographic HMAC Generation & Fail-Closed Behavior', () => {
    it('throws error when secret is empty to prevent insecure dummy fallback in production', () => {
      expect(() => generateTurnCredentials(1800, '')).toThrow('TURN_SECRET is not configured');
    });

    it('generates deterministic RFC-compliant credentials with valid secret', () => {
      const now = 1700000000000;
      const creds = generateTurnCredentials(1800, 'prod-secret-abc', now);

      expect(creds.username).toContain(':visual-player-session');
      expect(creds.credential).toBeTruthy();
      expect(creds.expiryTimestamp).toBe(Math.floor(now / 1000) + 1800);
    });
  });

  describe('5. Proactive Client Renewal Watcher Lifecycle', () => {
    it('initializes watcher bound to room code and cleans up on unmount', async () => {
      const stopWatcher = startTurnRenewalWatcher('VP-ABCD');
      expect(typeof stopWatcher).toBe('function');

      const config = await getIceConfiguration({ roomId: 'VP-ABCD' });
      expect(config.iceServers?.length).toBeGreaterThanOrEqual(1);

      stopWatcher();
    });
  });
});
