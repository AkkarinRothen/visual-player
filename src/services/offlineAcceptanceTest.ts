/**
 * offlineAcceptanceTest.ts
 *
 * Orchestrator for the physical offline acceptance test:
 * Android Tablet (Display) ↔ Android Phone (Master) in airplane mode.
 *
 * This module drives the 10 acceptance criteria defined in the
 * Fase 1 implementation plan, records every step to offlineDiagnosticService,
 * and returns a structured result exportable as JSON.
 *
 * Usage:
 *   const result = await offlineAcceptanceTest.run(transport, authEngine, getState);
 *   if (result.allCriteriaMet) {
 *     await offlineDiagnosticService.exportAsJson();
 *   }
 *
 * SECURITY: This test never transmits data outside the device pair.
 * Internet connectivity check deliberately tries to reach an external host
 * to confirm zero Internet traffic.
 */

import { offlineDiagnosticService, type AcceptanceCriteriaResult } from './offlineDiagnosticService';
import { localOfflineAuthEngine } from './localOfflineAuthEngine';

export interface AcceptanceTestOptions {
  /** Session identifier (prefix only used in diagnostics) */
  sessionId: string;
  /** Shared correlation ID between the two devices */
  correlationId: string;
  /** Role of this device in the test */
  role: 'display' | 'master';
  /** Timeout per phase in ms */
  phaseTimeoutMs?: number;
}

export interface AcceptanceTestResult {
  sessionIdPrefix: string;
  correlationId: string;
  role: 'display' | 'master';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  criteria: AcceptanceCriteriaResult;
  phases: AcceptanceTestPhaseResult[];
  overallSuccess: boolean;
}

export interface AcceptanceTestPhaseResult {
  phase: string;
  success: boolean;
  durationMs: number;
  errorCode?: string;
  notes?: string;
}

// ─────────────────────────────────────────────
// Acceptance Test Runner
// ─────────────────────────────────────────────

class OfflineAcceptanceTest {
  private running = false;

  async run(opts: AcceptanceTestOptions): Promise<AcceptanceTestResult> {
    if (this.running) {
      throw new Error('[OfflineAcceptanceTest] A test is already running');
    }
    this.running = true;

    const startedAt = new Date().toISOString();
    const startMs = performance.now();
    const phaseTimeout = opts.phaseTimeoutMs ?? 30_000;
    const phases: AcceptanceTestPhaseResult[] = [];

    // Configure diagnostic service
    offlineDiagnosticService.configure({
      sessionId: opts.sessionId,
      correlationId: opts.correlationId,
      role: opts.role,
    });

    // ── Phase 1: Verify No Internet ─────────────────────────
    const p1 = await this.runPhase('VERIFY_NO_INTERNET', phaseTimeout, async () => {
      offlineDiagnosticService.record({ type: 'INTERNET_CHECK', transport: 'none' });
      const hasInternet = await this.checkInternetReachability();
      if (hasInternet) {
        offlineDiagnosticService.record({
          type: 'INTERNET_CHECK',
          transport: 'none',
          success: false,
          errorCode: 'INTERNET_REACHABLE',
          meta: { note: 'Disable Internet for offline test validity' },
        });
        throw new Error('INTERNET_REACHABLE: disable Wi-Fi/mobile data for this test');
      }
      offlineDiagnosticService.record({
        type: 'INTERNET_CHECK',
        transport: 'none',
        success: false, // false = confirmed unreachable (what we want)
        meta: { confirmed: 'no_internet_traffic' },
      });
    });
    phases.push(p1);

    // ── Phase 2: Advertising / Discovery ────────────────────
    const p2 = await this.runPhase('NEARBY_ADVERTISING_DISCOVERY', phaseTimeout, async () => {
      offlineDiagnosticService.record({ type: 'ADVERTISING_STARTED', transport: 'nearby' });
      // Actual transport start happens outside this orchestrator;
      // this phase waits for the discovery event to be recorded.
      await this.waitForEvent('ENDPOINT_FOUND', phaseTimeout);
    });
    phases.push(p2);

    // ── Phase 3: Authentication ──────────────────────────────
    const p3 = await this.runPhase('AUTHENTICATION', phaseTimeout, async () => {
      await this.waitForEvent('AUTH_APPROVED', phaseTimeout);
    });
    phases.push(p3);

    // ── Phase 4: Handshake → Lease → CONTROL_READY ──────────
    const p4 = await this.runPhase('HANDSHAKE_AND_LEASE', phaseTimeout, async () => {
      await this.waitForEvent('LEASE_ISSUED', phaseTimeout);
      await this.waitForEvent('FULL_STATE_RECEIVED', phaseTimeout);
      await this.waitForEvent('CONTROL_READY', phaseTimeout);
    });
    phases.push(p4);

    // ── Phase 5: Mutation → ACK → Checksum Match ────────────
    const p5 = await this.runPhase('MUTATION_AND_ACK', phaseTimeout, async () => {
      await this.waitForEvent('ACK_RECEIVED', phaseTimeout);
      await this.waitForEvent('CHECKSUM_MATCH', phaseTimeout);
    });
    phases.push(p5);

    // ── Phase 6: Simulate Loss → READ_ONLY ──────────────────
    const p6 = await this.runPhase('CONNECTION_LOSS_DETECTION', phaseTimeout, async () => {
      await this.waitForEvent('CONNECTION_LOST', phaseTimeout);
      await this.waitForEvent('READ_ONLY_ENTERED', phaseTimeout);
    });
    phases.push(p6);

    // ── Phase 7: Reconnect → New Epoch ──────────────────────
    const p7 = await this.runPhase('RECONNECT_AND_RESUMPTION', phaseTimeout, async () => {
      await this.waitForEvent('RECONNECT_STARTED', phaseTimeout);
      await this.waitForEvent('NEW_EPOCH_ISSUED', phaseTimeout);
    });
    phases.push(p7);

    // ── Phase 8: FULL_STATE Sync After Reconnect ─────────────
    const p8 = await this.runPhase('POST_RECONNECT_SYNC', phaseTimeout, async () => {
      await this.waitForEvent('FULL_STATE_RECEIVED', phaseTimeout);
      await this.waitForEvent('CHECKSUM_MATCH', phaseTimeout);
      await this.waitForEvent('CONTROL_READY', phaseTimeout);
    });
    phases.push(p8);

    // ── Phase 9: Second Mutation After Reconnect ─────────────
    const p9 = await this.runPhase('SECOND_MUTATION', phaseTimeout, async () => {
      // Wait for 2nd ACK_RECEIVED (first was in phase 5)
      const acks = offlineDiagnosticService.getBuffer().filter((e) => e.type === 'ACK_RECEIVED');
      if (acks.length < 2) {
        await this.waitForEvent('ACK_RECEIVED', phaseTimeout);
      }
    });
    phases.push(p9);

    // ── Phase 10: Stale Lease Rejection ──────────────────────
    const p10 = await this.runPhase('STALE_LEASE_REJECTION', phaseTimeout, async () => {
      await this.waitForEvent('STALE_LEASE_REJECTED', phaseTimeout);
    });
    phases.push(p10);

    // ── Evaluate ─────────────────────────────────────────────
    const criteria = offlineDiagnosticService.evaluateAcceptanceCriteria();
    const completedAt = new Date().toISOString();
    const durationMs = Math.round(performance.now() - startMs);
    const overallSuccess = criteria.allCriteriaMet && phases.every((p) => p.success);

    this.running = false;

    return {
      sessionIdPrefix: opts.sessionId.slice(0, 8),
      correlationId: opts.correlationId,
      role: opts.role,
      startedAt,
      completedAt,
      durationMs,
      criteria,
      phases,
      overallSuccess,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────

  private async runPhase(
    name: string,
    timeoutMs: number,
    work: () => Promise<void>
  ): Promise<AcceptanceTestPhaseResult> {
    const start = performance.now();
    try {
      await Promise.race([work(), this.timeout(timeoutMs, name)]);
      return {
        phase: name,
        success: true,
        durationMs: Math.round(performance.now() - start),
      };
    } catch (err) {
      const errorCode =
        err instanceof Error ? err.message.split(':')[0] : 'UNKNOWN_ERROR';
      return {
        phase: name,
        success: false,
        durationMs: Math.round(performance.now() - start),
        errorCode,
        notes: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private timeout(ms: number, phase: string): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT:${phase} exceeded ${ms}ms`)), ms)
    );
  }

  /**
   * Polls the diagnostic buffer until an event of the given type appears
   * that was recorded after the call to waitForEvent was made.
   */
  private waitForEvent(
    type: Parameters<typeof offlineDiagnosticService.record>[0]['type'],
    timeoutMs: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const initialCount = offlineDiagnosticService.getBuffer().length;
      const interval = setInterval(() => {
        const events = offlineDiagnosticService.getBuffer();
        const found = events.slice(initialCount).some((e) => e.type === type);
        if (found) {
          clearInterval(interval);
          resolve();
        }
      }, 200);

      setTimeout(() => {
        clearInterval(interval);
        reject(new Error(`WAIT_TIMEOUT:${type} not observed within ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Tries to reach an external host to confirm no Internet is available.
   * Returns true if Internet IS reachable (test should abort or warn).
   */
  private async checkInternetReachability(): Promise<boolean> {
    try {
      const response = await fetch(
        'https://dns.google/resolve?name=test.invalid&type=A',
        { signal: AbortSignal.timeout(4000) }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}

export const offlineAcceptanceTest = new OfflineAcceptanceTest();

// ─────────────────────────────────────────────
// Utility: verify a lease is properly rejected
// ─────────────────────────────────────────────

export function verifyStaleLeaseRejected(
  staleLeaseConnectionEpoch: string,
  currentConnectionEpoch: string
): boolean {
  if (staleLeaseConnectionEpoch === currentConnectionEpoch) return false;

  const result = localOfflineAuthEngine.verifyLocalLease({
    sessionId: 'test',
    deviceId: 'test-device',
    role: 'master',
    connectionEpoch: staleLeaseConnectionEpoch, // intentionally stale
    issuedAt: Date.now() - 70_000, // issued 70 seconds ago
    expiresAt: Date.now() - 10_000, // already expired
    nonce: `stale-nonce-${Date.now()}`,
    signature: 'invalid-stale-sig',
  });

  const rejected = !result.valid;
  offlineDiagnosticService.record({
    type: 'STALE_LEASE_REJECTED',
    transport: 'nearby',
    success: rejected,
    errorCode: result.reason,
  });
  return rejected;
}
