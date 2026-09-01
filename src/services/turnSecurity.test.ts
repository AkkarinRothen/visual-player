import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateTurnCredentials,
} from '../../api/turn-credentials';
import {
  signSessionToken,
  verifySessionToken,
  createRoomSession,
  joinRoomSession,
} from '../../api/session-token';
import { getSessionStore } from '../../api/session-store';
import {
  startTurnRenewalWatcher,
  getIceConfiguration,
} from './iceConfig';

describe('Cryptographic Session Security & Distributed Store Suite', () => {
  const SERVER_SECRET = 'test-server-cryptographic-secret-key-32b';

  beforeEach(async () => {
    vi.useFakeTimers();
    const store = getSessionStore();
    await store.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Bypass Elimination & Negative Pairing Tests', () => {
    it('strictly rejects joining a non-existent room even with a valid 32-char hex secret', async () => {
      // Attacker generates a random 128-bit hex secret and tries to join VP-FAKE
      const fakeSecret = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
      const result = await joinRoomSession('VP-NONEXISTENT', fakeSecret);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized: Invalid room or pairing secret');
      expect(result.sessionToken).toBeUndefined();
    });

    it('rejects legitimate room when master provides incorrect secret', async () => {
      const room = await createRoomSession('VP-TEST');
      expect(room.roomId).toBe('VP-TEST');
      const badJoin = await joinRoomSession('VP-TEST', '00000000000000000000000000000000');

      expect(badJoin.success).toBe(false);
      expect(badJoin.error).toContain('Unauthorized: Invalid room or pairing secret');
    });
  });

  describe('2. Cryptographic Secret Hash & Constant-Time Verification', () => {
    it('stores only the secure HMAC hash of the pairing secret in session store', async () => {
      const room = await createRoomSession('VP-SEC');
      const store = getSessionStore();
      const stored = await store.getRoom('VP-SEC');

      expect(stored).not.toBeNull();
      // Secret in plain text must NEVER be stored
      expect(stored?.secretHash).not.toBe(room.roomSecret);
      expect(stored?.secretHash.length).toBe(64); // SHA-256 hex length
    });

    it('authorizes master when providing exact matching 128-bit pairing secret', async () => {
      const room = await createRoomSession('VP-AUTH');
      const joinResult = await joinRoomSession('VP-AUTH', room.roomSecret);

      expect(joinResult.success).toBe(true);
      expect(joinResult.sessionToken).toBeTruthy();

      const verify = await verifySessionToken(joinResult.sessionToken!);
      expect(verify.valid).toBe(true);
      expect(verify.payload?.role).toBe('master');
      expect(verify.payload?.roomId).toBe('VP-AUTH');
      expect(verify.payload?.sessionVersion).toBe(1);
    });
  });

  describe('3. Session Version Rotation & Instant Token Revocation', () => {
    it('invalidates active session tokens when room sessionVersion is incremented (revocation)', async () => {
      const room = await createRoomSession('VP-REVOKE');
      const joinResult = await joinRoomSession('VP-REVOKE', room.roomSecret);
      const masterToken = joinResult.sessionToken!;

      // Token is valid initially
      const initialCheck = await verifySessionToken(masterToken);
      expect(initialCheck.valid).toBe(true);

      // Display rotates session / revokes master (incrementVersion)
      const store = getSessionStore();
      await store.incrementVersion('VP-REVOKE');

      // Previous token must now be rejected
      const revokedCheck = await verifySessionToken(masterToken);
      expect(revokedCheck.valid).toBe(false);
      expect(revokedCheck.error).toContain('Session token revoked');
    });
  });

  describe('4. Cryptographic JWT Integrity & Expiration', () => {
    it('detects tampering when payload (roomId/role) is altered after signing', async () => {
      const token = signSessionToken(
        {
          roomId: 'VP-ORIG',
          role: 'display',
          sessionVersion: 1,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          jti: 'nonce-1',
        },
        SERVER_SECRET
      );

      const [header, , signature] = token.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({ roomId: 'VP-HACK', role: 'master', sessionVersion: 1, exp: 9999999999, aud: 'visual-player-turn' })
      ).toString('base64url');

      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;
      const result = await verifySessionToken(tamperedToken, SERVER_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid cryptographic signature');
    });

    it('rejects legitimately signed tokens once exp timestamp is passed', async () => {
      const expiredToken = signSessionToken(
        {
          roomId: 'VP-EXP',
          role: 'master',
          sessionVersion: 1,
          iat: 1000,
          exp: 2000,
          jti: 'nonce-exp',
        },
        SERVER_SECRET
      );

      const result = await verifySessionToken(expiredToken, SERVER_SECRET, 3000 * 1000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Session token has expired');
    });
  });

  describe('5. Distributed Rate Limiting & Fail-Closed Behavior', () => {
    it('rate limits client requests in store and returns retryAfter', async () => {
      const store = getSessionStore();
      const key = 'test-client-distributed';

      for (let i = 0; i < 5; i++) {
        const res = await store.checkRateLimit(key, 5, 60);
        expect(res.allowed).toBe(true);
      }

      const blocked = await store.checkRateLimit(key, 5, 60);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfter).toBeGreaterThan(0);
    });

    it('throws error when secret is empty to prevent insecure dummy fallback in production', () => {
      expect(() => generateTurnCredentials(1800, '')).toThrow('TURN_SECRET is not configured');
    });
  });

  describe('6. Client Renewal Watcher Lifecycle', () => {
    it('initializes watcher bound to room code and cleans up on unmount', async () => {
      const stopWatcher = startTurnRenewalWatcher('VP-ABCD');
      expect(typeof stopWatcher).toBe('function');

      const config = await getIceConfiguration({ roomId: 'VP-ABCD' });
      expect(config.iceServers?.length).toBeGreaterThanOrEqual(1);

      stopWatcher();
    });
  });
});
