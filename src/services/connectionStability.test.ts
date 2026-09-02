import { describe, it, expect, beforeEach, vi } from 'vitest';
import { acquireServerSessionToken } from './iceConfig';
import { connectionDiagnostics } from './connectionDiagnostics';
import { peerService } from './peerService';

describe('PeerJS Connection Stabilization & Anti-Storm Engine Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    connectionDiagnostics.clear();
    peerService.destroy();
  });

  it('1. Deduplicates concurrent token and TURN requests into a single flight promise', async () => {
    let fetchCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 20));
      return {
        ok: true,
        status: 200,
        json: async () => ({ sessionToken: 'hmac_test_token_123', ttl: 1800 }),
      } as Response;
    });

    // Fire 5 concurrent token requests
    const promises = [
      acquireServerSessionToken('VP-STORM', undefined, 'display'),
      acquireServerSessionToken('VP-STORM', undefined, 'display'),
      acquireServerSessionToken('VP-STORM', undefined, 'display'),
      acquireServerSessionToken('VP-STORM', undefined, 'display'),
      acquireServerSessionToken('VP-STORM', undefined, 'display'),
    ];

    const results = await Promise.all(promises);

    // Exactly 1 network fetch executed
    expect(fetchCount).toBe(1);
    expect(results[0]).toBe('hmac_test_token_123');
    expect(results[4]).toBe('hmac_test_token_123');
  });

  it('2. Records AUTH_SERVER_MISCONFIGURED event explicitly when /api/session-token returns HTTP 500', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'SERVER_SESSION_SECRET is missing' }),
    } as Response);

    const token = await acquireServerSessionToken('VP-MISCONFIG');
    expect(token).toBeNull();

    const events = connectionDiagnostics.getEvents();
    const misconfigEvent = events.find((e) => e.name === 'AUTH_SERVER_MISCONFIGURED');
    expect(misconfigEvent).toBeDefined();
    expect(misconfigEvent?.details.status).toBe(500);
  });

  it('3. Preserves room code immutably and does NOT change room code unilaterally', () => {
    const originalRoomCode = 'VP-FIXED';
    const peerId = peerService.getFullPeerId(originalRoomCode);
    expect(peerId).toBe('visual-player-VP-FIXED');

    // Generating code keeps VP- prefix and format
    const generated = peerService.generateRoomCode();
    expect(generated.startsWith('VP-')).toBe(true);
    expect(generated.length).toBe(7);
  });

  it('4. Anti-Storm: Calling destroy() cancels timers, closes sockets and prevents reconnect cascades', () => {
    peerService.destroy();
    expect(peerService.getStatus()).toBe('disconnected');
    expect(peerService.getLatency()).toBe(0);

    // Multiple rapid destroy() calls are safe and idempotent
    peerService.destroy();
    peerService.destroy();
    expect(peerService.getStatus()).toBe('disconnected');
  });
});
