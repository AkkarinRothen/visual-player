import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isAllowedOrigin, checkRateLimit, generateTurnCredentials } from '../../api/turn-credentials';
import { startTurnRenewalWatcher, getIceConfiguration } from './iceConfig';

describe('TURN Endpoint Hardening & Proactive Renewal Security Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Origin and Referer Authorization', () => {
    it('allows official Vercel domains and local dev origins', () => {
      expect(isAllowedOrigin('https://visual-player.vercel.app')).toBe(true);
      expect(isAllowedOrigin('https://visual-player-git-main-akkarinrothen.vercel.app')).toBe(true);
      expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:5173')).toBe(true);
      expect(isAllowedOrigin('https://visualplayer.app')).toBe(true);
    });

    it('rejects unauthorized third-party origins', () => {
      expect(isAllowedOrigin('https://malicious-site.com')).toBe(false);
      expect(isAllowedOrigin('https://attacker-app.xyz')).toBe(false);
      expect(isAllowedOrigin('https://fakepuzzle.vercel.app.attacker.com')).toBe(false);
    });
  });

  describe('Rate Limiting (Token Bucket)', () => {
    it('permits requests within quota and rejects bursts with HTTP 429 Retry-After', () => {
      const clientHash = 'test-client-fingerprint-123';
      const baseTime = 1000000;

      // First 10 requests should be allowed
      for (let i = 0; i < 10; i++) {
        const check = checkRateLimit(clientHash, baseTime);
        expect(check.allowed).toBe(true);
        expect(check.retryAfterSeconds).toBe(0);
      }

      // 11th request in the same window must be rejected with 429
      const blocked = checkRateLimit(clientHash, baseTime);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

      // After the 1-minute window passes, requests should be permitted again
      const afterWindow = checkRateLimit(clientHash, baseTime + 61000);
      expect(afterWindow.allowed).toBe(true);
    });
  });

  describe('HMAC-SHA1 Credential Generation & Dual Secret', () => {
    it('generates standard RFC-compliant ephemeral credentials with expiry timestamp', () => {
      const now = 1700000000000;
      const creds = generateTurnCredentials(1800, 'my-turn-secret', now);

      expect(creds.username).toContain(':visual-player-session');
      expect(creds.credential).toBeTruthy();
      expect(typeof creds.credential).toBe('string');
      expect(creds.expiryTimestamp).toBe(Math.floor(now / 1000) + 1800);
    });

    it('generates deterministic signatures with the same secret and timestamp', () => {
      const now = 1700000000000;
      const c1 = generateTurnCredentials(1800, 'secret-a', now);
      const c2 = generateTurnCredentials(1800, 'secret-a', now);
      const c3 = generateTurnCredentials(1800, 'secret-b', now);

      expect(c1.credential).toBe(c2.credential);
      expect(c1.credential).not.toBe(c3.credential);
    });
  });

  describe('Proactive Client Renewal Watcher', () => {
    it('initializes renewal watcher and cleans up on unmount', async () => {
      const stopWatcher = startTurnRenewalWatcher();
      expect(typeof stopWatcher).toBe('function');

      // Verify ICE configuration is obtainable
      const config = await getIceConfiguration();
      expect(config.iceServers?.length).toBeGreaterThanOrEqual(1);

      stopWatcher();
    });
  });
});
