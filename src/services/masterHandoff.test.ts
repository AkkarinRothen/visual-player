import { describe, it, expect, beforeEach } from 'vitest';
import { MasterHandoffService } from './masterHandoff';

describe('Master Authority, Split-Brain Protection & Two-Phase Handoff Suite', () => {
  let service: MasterHandoffService;

  beforeEach(() => {
    service = new MasterHandoffService();
  });

  it('1. Creates and renews an authoritative Master Lease with active TTL', () => {
    const lease = service.createLease('sess-100', 'dev-master-phone', 1700000000);

    expect(lease.leaseId.startsWith('lse_')).toBe(true);
    expect(lease.masterDeviceId).toBe('dev-master-phone');
    expect(lease.status).toBe('active');
    expect(service.isLeaseValid(lease)).toBe(true);

    const renewed = service.renewLease(lease);
    expect(renewed.expiresAt).toBeGreaterThanOrEqual(lease.expiresAt);
    expect(service.isLeaseValid(renewed)).toBe(true);
  });

  it('2. Split-Brain Protection: Rejects mutations from outdated or unauthenticated lease IDs', () => {
    const authoritativeLease = service.createLease('sess-100', 'dev-master-phone', 1700000000);

    // Same lease ID -> Allowed
    const validCheck = service.validateMutationLease(authoritativeLease, authoritativeLease.leaseId);
    expect(validCheck.allowed).toBe(true);

    // Impostor / Old Master with different lease ID -> Rejected
    const rogueCheck = service.validateMutationLease(authoritativeLease, 'lse_old_impostor_999');
    expect(rogueCheck.allowed).toBe(false);
    expect(rogueCheck.reason).toContain('does not match authoritative lease');

    // Missing lease ID -> Rejected
    const emptyCheck = service.validateMutationLease(authoritativeLease, undefined);
    expect(emptyCheck.allowed).toBe(false);
  });

  it('3. Two-Phase Handoff: Transfers authority seamlessly from Phone A to Phone B with atomic revocation', () => {
    const leaseA = service.createLease('sess-rpg', 'phone-master-A', 1700000000);

    // Phase 1: Master A prepares handoff & freezes mutations
    const handoffToken = service.prepareHandoff(leaseA, 'sha256:dungeon_state', 14);
    expect(handoffToken.token.startsWith('hnd_')).toBe(true);
    expect(service.isSessionFrozen('sess-rpg')).toBe(true);

    // Mutations during handoff are frozen
    const freezeCheck = service.validateMutationLease(leaseA, leaseA.leaseId);
    expect(freezeCheck.allowed).toBe(false);
    expect(freezeCheck.reason).toContain('temporarily frozen');

    // Phase 2: Master B accepts token
    const acceptRes = service.acceptHandoff(handoffToken.token, 'tablet-master-B');
    expect(acceptRes.success).toBe(true);

    // Phase 3: Commit handoff
    const { newLease, revokedLeaseId } = service.commitHandoff(
      handoffToken.token,
      'tablet-master-B',
      1700000050
    );

    expect(revokedLeaseId).toBe(leaseA.leaseId);
    expect(newLease.masterDeviceId).toBe('tablet-master-B');
    expect(newLease.status).toBe('active');
    expect(service.isSessionFrozen('sess-rpg')).toBe(false);

    // Master B now has full authority to mutate Display
    const masterBCheck = service.validateMutationLease(newLease, newLease.leaseId);
    expect(masterBCheck.allowed).toBe(true);

    // Master A is now revoked and rejected
    const masterACheck = service.validateMutationLease(newLease, leaseA.leaseId);
    expect(masterACheck.allowed).toBe(false);
  });

  it('4. Rollback: Restores authority to original Master if handoff times out or fails', () => {
    const leaseA = service.createLease('sess-rollback', 'phone-master-A', 1700000000);

    const handoffToken = service.prepareHandoff(leaseA, 'sha256:camp_state', 5);
    expect(service.isSessionFrozen('sess-rollback')).toBe(true);

    // Rollback is triggered (e.g. user cancelled or target device disconnected)
    service.rollbackHandoff(handoffToken.token);

    expect(service.isSessionFrozen('sess-rollback')).toBe(false);
    expect(leaseA.status).toBe('active');

    // Master A retains authority
    const checkA = service.validateMutationLease(leaseA, leaseA.leaseId);
    expect(checkA.allowed).toBe(true);
  });

  it('5. Rejects handoff attempts on expired leases', () => {
    const leaseA = service.createLease('sess-expired', 'phone-master-A', 1700000000);
    leaseA.expiresAt = Date.now() - 1000; // Expired

    expect(() => {
      service.prepareHandoff(leaseA, 'sha256:state', 1);
    }).toThrow('Cannot initiate handoff with an invalid or expired lease');
  });
});
