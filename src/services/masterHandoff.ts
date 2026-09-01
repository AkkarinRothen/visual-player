import type { MasterLease, HandoffToken } from '../types';

export const LEASE_TTL_MS = 30 * 1000; // 30 seconds renewable lease
export const HANDOFF_TTL_MS = 60 * 1000; // 60 seconds handoff timeout

/**
 * Service managing authoritative Master Leases, Split-Brain protection, and Two-Phase Transactional Handoff.
 */
export class MasterHandoffService {
  private activeLeases: Map<string, MasterLease> = new Map(); // sessionId -> MasterLease
  private pendingHandoffs: Map<string, HandoffToken> = new Map(); // token -> HandoffToken
  private frozenSessions: Set<string> = new Set(); // sessions frozen during handoff transfer

  /**
   * Issues an authoritative lease to a Master device for a specific session.
   */
  public createLease(sessionId: string, masterDeviceId: string, connectionEpoch: number): MasterLease {
    const now = Date.now();
    const lease: MasterLease = {
      leaseId: `lse_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      sessionId,
      masterDeviceId,
      connectionEpoch,
      acquiredAt: now,
      expiresAt: now + LEASE_TTL_MS,
      status: 'active',
    };

    this.activeLeases.set(sessionId, lease);
    return lease;
  }

  /**
   * Renews an active lease if not expired or revoked.
   */
  public renewLease(lease: MasterLease): MasterLease {
    const current = this.activeLeases.get(lease.sessionId);
    if (!current || current.leaseId !== lease.leaseId || current.status !== 'active') {
      throw new Error('Lease is expired, revoked, or replaced by another device.');
    }

    const renewed: MasterLease = {
      ...current,
      expiresAt: Date.now() + LEASE_TTL_MS,
    };
    this.activeLeases.set(lease.sessionId, renewed);
    return renewed;
  }

  /**
   * Checks if a lease is currently active and within its validity TTL.
   */
  public isLeaseValid(lease?: MasterLease | null): boolean {
    if (!lease) return false;
    return lease.status === 'active' && Date.now() < lease.expiresAt;
  }

  /**
   * Split-Brain Protection: Validates whether an incoming mutation command has authority to alter the Display.
   */
  public validateMutationLease(
    activeLease: MasterLease | null,
    incomingLeaseId?: string
  ): { allowed: boolean; reason?: string } {
    if (!activeLease) {
      // Legacy or open session without active lease enforcement
      return { allowed: true };
    }

    if (this.frozenSessions.has(activeLease.sessionId)) {
      return {
        allowed: false,
        reason: 'Mutations temporarily frozen during active handoff transfer.',
      };
    }

    if (!this.isLeaseValid(activeLease)) {
      return {
        allowed: false,
        reason: 'Active Master lease has expired or was revoked. Re-authentication required.',
      };
    }

    if (!incomingLeaseId || incomingLeaseId !== activeLease.leaseId) {
      return {
        allowed: false,
        reason: `Mutation rejected: Command lease (${incomingLeaseId || 'none'}) does not match authoritative lease (${activeLease.leaseId}).`,
      };
    }

    return { allowed: true };
  }

  /**
   * Phase 1: Prepares handoff on current Master, freezes mutations, and generates a one-time token.
   */
  public prepareHandoff(
    currentLease: MasterLease,
    stateChecksum: string,
    sessionRevision: number
  ): HandoffToken {
    if (!this.isLeaseValid(currentLease)) {
      throw new Error('Cannot initiate handoff with an invalid or expired lease.');
    }

    const now = Date.now();
    const tokenStr = `hnd_${now}_${Math.random().toString(36).substr(2, 8)}`;
    const handoffToken: HandoffToken = {
      token: tokenStr,
      sessionId: currentLease.sessionId,
      fromMasterDeviceId: currentLease.masterDeviceId,
      createdAt: now,
      expiresAt: now + HANDOFF_TTL_MS,
      stateChecksum,
      sessionRevision,
    };

    this.pendingHandoffs.set(tokenStr, handoffToken);
    this.frozenSessions.add(currentLease.sessionId);
    currentLease.status = 'transferring';

    return handoffToken;
  }

  /**
   * Phase 2: New device accepts handoff token and requests state transfer.
   */
  public acceptHandoff(tokenStr: string, newMasterDeviceId: string): { success: boolean; reason?: string } {
    const pending = this.pendingHandoffs.get(tokenStr);
    if (!pending) {
      return { success: false, reason: 'Invalid or unknown handoff token.' };
    }

    if (Date.now() > pending.expiresAt) {
      this.rollbackHandoff(tokenStr);
      return { success: false, reason: 'Handoff token has expired.' };
    }

    pending.toMasterDeviceId = newMasterDeviceId;
    return { success: true };
  }

  /**
   * Phase 3: Commits handoff, revokes previous Master lease, and grants new lease to target device.
   */
  public commitHandoff(
    tokenStr: string,
    newMasterDeviceId: string,
    connectionEpoch: number
  ): { newLease: MasterLease; revokedLeaseId: string } {
    const pending = this.pendingHandoffs.get(tokenStr);
    if (!pending) {
      throw new Error('Handoff token not found or already processed.');
    }

    if (Date.now() > pending.expiresAt) {
      this.rollbackHandoff(tokenStr);
      throw new Error('Handoff token has expired.');
    }

    const currentLease = this.activeLeases.get(pending.sessionId);
    const revokedLeaseId = currentLease?.leaseId || '';

    if (currentLease) {
      currentLease.status = 'revoked';
    }

    // Grant new authoritative lease
    const newLease = this.createLease(pending.sessionId, newMasterDeviceId, connectionEpoch);

    // Unfreeze session & clean up handoff token
    this.frozenSessions.delete(pending.sessionId);
    this.pendingHandoffs.delete(tokenStr);

    return { newLease, revokedLeaseId };
  }

  /**
   * Rollback: If handoff fails or times out, restores authority to original Master.
   */
  public rollbackHandoff(tokenStr: string): void {
    const pending = this.pendingHandoffs.get(tokenStr);
    if (pending) {
      const currentLease = this.activeLeases.get(pending.sessionId);
      if (currentLease && currentLease.status === 'transferring') {
        currentLease.status = 'active';
      }
      this.frozenSessions.delete(pending.sessionId);
      this.pendingHandoffs.delete(tokenStr);
    }
  }

  public isSessionFrozen(sessionId: string): boolean {
    return this.frozenSessions.has(sessionId);
  }
}

export const masterHandoffService = new MasterHandoffService();
