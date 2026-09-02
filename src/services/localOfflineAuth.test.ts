import { describe, it, expect, beforeEach } from 'vitest';
import { localOfflineAuthEngine } from './localOfflineAuthEngine';

describe('Local Offline Authority & Cryptographic Lease Engine Suite', () => {
  beforeEach(() => {
    localOfflineAuthEngine.revokeLocalAuthority();
  });

  it('1. Initializes local ephemeral authority and issues a signed offline lease', () => {
    const authSession = localOfflineAuthEngine.initLocalAuthority('VP-OFFLINE-ROOM', 'epoch-off-1');
    expect(authSession.sessionId).toBe('VP-OFFLINE-ROOM');
    expect(authSession.connectionEpoch).toBe('epoch-off-1');

    const lease = localOfflineAuthEngine.issueLocalLease('device-master-1', 'master', 60);
    expect(lease.sessionId).toBe('VP-OFFLINE-ROOM');
    expect(lease.deviceId).toBe('device-master-1');
    expect(lease.role).toBe('master');
    expect(lease.signature).toMatch(/^sig-loc-/);
    expect(lease.expiresAt).toBeGreaterThan(Date.now());
  });

  it('2. Successfully verifies a valid offline lease matching current session and device', () => {
    localOfflineAuthEngine.initLocalAuthority('VP-OFFLINE-ROOM', 'epoch-off-1');
    const lease = localOfflineAuthEngine.issueLocalLease('device-master-1', 'master', 60);

    const result = localOfflineAuthEngine.verifyLocalLease(lease, 'device-master-1');
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('3. Rejects lease on device mismatch or connection epoch mismatch', () => {
    localOfflineAuthEngine.initLocalAuthority('VP-OFFLINE-ROOM', 'epoch-off-1');
    const lease = localOfflineAuthEngine.issueLocalLease('device-master-1', 'master', 60);

    // Device mismatch
    const devMismatch = localOfflineAuthEngine.verifyLocalLease(lease, 'device-impostor-99');
    expect(devMismatch.valid).toBe(false);
    expect(devMismatch.reason).toBe('DEVICE_ID_MISMATCH');

    // New epoch (e.g. after network transition or reconnect)
    localOfflineAuthEngine.initLocalAuthority('VP-OFFLINE-ROOM', 'epoch-off-2');
    const epochMismatch = localOfflineAuthEngine.verifyLocalLease(lease, 'device-master-1');
    expect(epochMismatch.valid).toBe(false);
    expect(epochMismatch.reason).toBe('CONNECTION_EPOCH_MISMATCH');
  });

  it('4. Rejects expired leases and defends against replay attacks', () => {
    localOfflineAuthEngine.initLocalAuthority('VP-OFFLINE-ROOM', 'epoch-off-1');
    // Issue lease with 0s TTL (already expired)
    const expiredLease = localOfflineAuthEngine.issueLocalLease('device-master-1', 'master', -5);
    const expiredResult = localOfflineAuthEngine.verifyLocalLease(expiredLease, 'device-master-1');
    expect(expiredResult.valid).toBe(false);
    expect(expiredResult.reason).toBe('LEASE_EXPIRED');

    // Replay attack with same nonce
    const validLease = localOfflineAuthEngine.issueLocalLease('device-master-1', 'master', 60);
    const firstUse = localOfflineAuthEngine.verifyLocalLease(validLease, 'device-master-1');
    expect(firstUse.valid).toBe(true);

    const replayUse = localOfflineAuthEngine.verifyLocalLease(validLease, 'device-master-1');
    expect(replayUse.valid).toBe(false);
    expect(replayUse.reason).toBe('REPLAY_ATTACK_DETECTED');
  });
});
