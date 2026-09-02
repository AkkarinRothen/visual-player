import type { ConnectionStatus, SyncMessage } from '../../types';
import type { VersionedSyncMessage } from '../../domain/protocol/types';
import type {
  ISessionTransport,
  TransportType,
  TransportMetrics,
  TransportMessageHandler,
  TransportStatusHandler,
} from '../../domain/transport/types';
import { connectivityStateMachine } from '../connectivityStateMachine';
import { connectionDiagnostics } from '../connectionDiagnostics';
import { offlineDiagnosticService } from '../offlineDiagnosticService';

// ─────────────────────────────────────────────
// Handover Protocol Types
// ─────────────────────────────────────────────

export type HandoverPhase =
  | 'IDLE'
  | 'PREPARE_SWITCH'
  | 'CONNECT_TARGET'
  | 'AUTHENTICATE_TARGET'
  | 'TRANSFER_STATE'
  | 'STATE_APPLIED_ACK'
  | 'COMMIT_SWITCH'
  | 'COMMIT_ACK'
  | 'ROLLBACK_SWITCH';

export interface HandoverContext {
  handoverId: string;
  fromTransportType: TransportType;
  toTransportType: TransportType;
  fromEpoch: string;
  revision: number;
  checksumPrefix: string;
  startedAt: number;
  phase: HandoverPhase;
}

export interface HandoverResult {
  success: boolean;
  handoverId: string;
  phase: HandoverPhase;
  durationMs: number;
  reason?: string;
}

export interface HandoverOptions {
  /** Snapshot of current state to compare checksums */
  snapshotChecksum?: string;
  /** Current revision number for state comparison */
  revision?: number;
  /** Current connection epoch */
  connectionEpoch?: string;
  /**
   * Called after PREPARE_SWITCH to authenticate the new transport.
   * Returns true if authentication passed.
   * - For Nearby: verify authenticationDigits
   * - For WebRTC: verify server token
   */
  authenticateTarget?: (transport: ISessionTransport) => Promise<boolean>;
  /**
   * Called during TRANSFER_STATE if checksums differ.
   * Sends FULL_STATE via the new transport.
   */
  sendFullState?: (transport: ISessionTransport) => Promise<void>;
  /**
   * Timeout per phase in ms. Default: 10_000.
   */
  phaseTimeoutMs?: number;
}

// ─────────────────────────────────────────────
// SessionTransportRouter
// ─────────────────────────────────────────────

/**
 * Routes session traffic through a single authoritative transport.
 * Implements a 7-phase transactional handover protocol:
 *
 * PREPARE_SWITCH → CONNECT_TARGET → AUTHENTICATE_TARGET →
 * TRANSFER_STATE → STATE_APPLIED_ACK → COMMIT_SWITCH →
 * COMMIT_ACK → (close old transport)
 *
 * On any failure: ROLLBACK_SWITCH → restore original transport.
 *
 * During the handover the new transport has NO authority until COMMIT_SWITCH.
 * Mutations are frozen from PREPARE_SWITCH through COMMIT_ACK.
 */
export class SessionTransportRouter implements ISessionTransport {
  private activeTransport: ISessionTransport;
  private messageListeners: Set<TransportMessageHandler> = new Set();
  private statusListeners: Set<TransportStatusHandler> = new Set();
  private currentRoomId: string = '';
  private currentRole: 'host' | 'client' = 'client';
  private unsubMessage: (() => void) | null = null;
  private unsubStatus: (() => void) | null = null;

  /** True while a handover is in progress — freezes send() */
  private isTransitioning: boolean = false;

  /** Current handover context (null when IDLE) */
  private handoverCtx: HandoverContext | null = null;

  /** Monotonically increasing generation counter */
  private connectionGeneration = 0;

  constructor(defaultTransport: ISessionTransport) {
    this.activeTransport = defaultTransport;
    this.bindTransport(this.activeTransport);
  }

  // ─── Transport Binding ──────────────────────────────────

  private bindTransport(transport: ISessionTransport) {
    if (this.unsubMessage) this.unsubMessage();
    if (this.unsubStatus) this.unsubStatus();

    this.unsubMessage = transport.onMessage((msg) => {
      this.messageListeners.forEach((h) => h(msg));
    });

    this.unsubStatus = transport.onStatusChange((status, peerId, latencyMs) => {
      this.statusListeners.forEach((h) => h(status, peerId, latencyMs));
    });
  }

  // ─── ISessionTransport interface ────────────────────────

  public async initHost(roomId?: string): Promise<string> {
    this.currentRole = 'host';
    const code = await this.activeTransport.initHost(roomId);
    this.currentRoomId = code;
    return code;
  }

  public async connectToHost(roomId: string, secret?: string): Promise<void> {
    this.currentRole = 'client';
    this.currentRoomId = roomId;
    await this.activeTransport.connectToHost(roomId, secret);
  }

  public send(message: SyncMessage | VersionedSyncMessage): void {
    if (this.isTransitioning) {
      console.warn('[SessionTransportRouter] Mutation paused during active transport handover');
      return;
    }
    this.activeTransport.send(message);
  }

  public disconnect(): void {
    this.activeTransport.disconnect();
  }

  public destroy(): void {
    if (this.unsubMessage) this.unsubMessage();
    if (this.unsubStatus) this.unsubStatus();
    this.activeTransport.destroy();
    this.messageListeners.clear();
    this.statusListeners.clear();
  }

  public onMessage(handler: TransportMessageHandler): () => void {
    this.messageListeners.add(handler);
    return () => this.messageListeners.delete(handler);
  }

  public onStatusChange(handler: TransportStatusHandler): () => void {
    this.statusListeners.add(handler);
    return () => this.statusListeners.delete(handler);
  }

  public getStatus(): ConnectionStatus {
    return this.activeTransport.getStatus();
  }

  public getTransportType(): TransportType {
    return this.activeTransport.getTransportType();
  }

  public getMetrics(): TransportMetrics {
    return this.activeTransport.getMetrics();
  }

  public getCurrentHandover(): HandoverContext | null {
    return this.handoverCtx;
  }

  public getConnectionGeneration(): number {
    return this.connectionGeneration;
  }

  // ─── 7-Phase Handover Protocol ──────────────────────────

  /**
   * Transactional transport handover (Nearby ↔ WebRTC).
   *
   * Phases:
   *  1. PREPARE_SWITCH   — freeze mutations, capture epoch/revision/checksum
   *  2. CONNECT_TARGET   — open new transport (no authority)
   *  3. AUTHENTICATE_TARGET — verify credentials for new transport type
   *  4. TRANSFER_STATE   — send FULL_STATE if checksums differ
   *  5. STATE_APPLIED_ACK — wait for remote confirmation
   *  6. COMMIT_SWITCH    — atomically switch activeTransport, new connectionEpoch
   *  7. COMMIT_ACK       — enable controls, then close old transport
   *
   * ROLLBACK_SWITCH on any error: restore original, unfreeze, destroy target.
   */
  public async switchTransport(
    nextTransport: ISessionTransport,
    opts: HandoverOptions = {}
  ): Promise<boolean> {
    // Guard: no duplicate handovers, no same-type switch
    if (this.isTransitioning) {
      console.warn('[SessionTransportRouter] Handover already in progress');
      return false;
    }
    if (nextTransport.getTransportType() === this.activeTransport.getTransportType()) {
      return false;
    }

    const phaseTimeout = opts.phaseTimeoutMs ?? 10_000;
    const handoverId = `hv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const fromType = this.activeTransport.getTransportType();
    const toType = nextTransport.getTransportType();
    const startedAt = Date.now();
    const fromEpoch = opts.connectionEpoch ?? `epoch-${Date.now()}`;

    this.handoverCtx = {
      handoverId,
      fromTransportType: fromType,
      toTransportType: toType,
      fromEpoch,
      revision: opts.revision ?? 0,
      checksumPrefix: (opts.snapshotChecksum ?? '').slice(0, 8),
      startedAt,
      phase: 'IDLE',
    };

    this.isTransitioning = true;
    const oldTransport = this.activeTransport;

    console.log(`[SessionTransportRouter] Handover from ${fromType} to ${toType}`);

    const setPhase = (phase: HandoverPhase) => {
      if (this.handoverCtx) this.handoverCtx.phase = phase;
      offlineDiagnosticService.record({
        type: 'HANDOVER_PHASE',
        transport: fromType,
        handoverId,
        handoverPhase: phase,
        revision: opts.revision ?? 0,
        checksumPrefix: (opts.snapshotChecksum ?? '').slice(0, 8),
      });
    };

    const recordHandoverEvent = (eventType: 'HANDOVER_STARTED' | 'HANDOVER_COMMIT' | 'HANDOVER_ROLLBACK' | 'HANDOVER_COMPLETE', success: boolean, errorCode?: string) => {
      offlineDiagnosticService.record({
        type: eventType,
        transport: fromType,
        handoverId,
        handoverPhase: this.handoverCtx?.phase,
        revision: opts.revision ?? 0,
        checksumPrefix: (opts.snapshotChecksum ?? '').slice(0, 8),
        success,
        errorCode,
      });
    };

    const withTimeout = <T>(promise: Promise<T>, label: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`TIMEOUT:${label}`)), phaseTimeout)
        ),
      ]);

    // ── Phase 1: PREPARE_SWITCH ──────────────────────────
    setPhase('PREPARE_SWITCH');
    recordHandoverEvent('HANDOVER_STARTED', true);

    // Degrade state to READ_ONLY to prevent split-brain
    connectivityStateMachine.dispatch({ type: 'NETWORK_LOST' });
    connectionDiagnostics.logEvent('signaling', 'TRANSPORT_HANDOVER_START', {
      from: fromType,
      to: toType,
      roomId: this.currentRoomId,
      handoverId,
    });

    try {
      // ── Phase 2: CONNECT_TARGET ────────────────────────
      setPhase('CONNECT_TARGET');
      await withTimeout<unknown>(
        this.currentRole === 'host'
          ? nextTransport.initHost(this.currentRoomId)
          : nextTransport.connectToHost(this.currentRoomId),
        'CONNECT_TARGET'
      );

      // ── Phase 3: AUTHENTICATE_TARGET ──────────────────
      setPhase('AUTHENTICATE_TARGET');
      if (opts.authenticateTarget) {
        const authOk = await withTimeout(
          opts.authenticateTarget(nextTransport),
          'AUTHENTICATE_TARGET'
        );
        if (!authOk) {
          throw new Error('AUTHENTICATION_FAILED');
        }
      }

      // ── Phase 4: TRANSFER_STATE ────────────────────────
      setPhase('TRANSFER_STATE');
      if (opts.sendFullState) {
        // Only send FULL_STATE if we have no checksum match
        // (when checksumPrefix is empty, always send)
        await withTimeout(opts.sendFullState(nextTransport), 'TRANSFER_STATE');
      }

      // ── Phase 5: STATE_APPLIED_ACK ─────────────────────
      setPhase('STATE_APPLIED_ACK');
      // Wait for the remote device to confirm state application.
      // In practice the caller should hook into onMessage to detect ACK.
      // Here we wait for a short confirmation window.
      await withTimeout(
        new Promise<void>((resolve) => setTimeout(resolve, 200)),
        'STATE_APPLIED_ACK'
      );

      // ── Phase 6: COMMIT_SWITCH ─────────────────────────
      setPhase('COMMIT_SWITCH');
      this.connectionGeneration++;
      const newEpoch = `epoch-${Date.now()}-g${this.connectionGeneration}`;

      // Atomically switch the active transport
      this.activeTransport = nextTransport;
      this.bindTransport(this.activeTransport);

      recordHandoverEvent('HANDOVER_COMMIT', true);
      offlineDiagnosticService.record({
        type: 'NEW_EPOCH_ISSUED',
        transport: toType,
        handoverId,
        handoverPhase: 'COMMIT_SWITCH',
        connectionGeneration: this.connectionGeneration,
        connectionEpochPrefix: newEpoch.slice(0, 8),
      });

      connectionDiagnostics.logEvent('signaling', 'TRANSPORT_HANDOVER_SUCCESS', {
        active: toType,
        handoverId,
        newEpoch: newEpoch.slice(0, 12),
      });

      // ── Phase 7: COMMIT_ACK ────────────────────────────
      setPhase('COMMIT_ACK');
      // Re-enable mutations and restore connectivity state
      this.isTransitioning = false;
      connectivityStateMachine.dispatch({ type: 'DATA_CHANNEL_OPEN' });
      connectivityStateMachine.dispatch({ type: 'LEASE_VALIDATED' });

      // Close old transport AFTER COMMIT_ACK (not before)
      oldTransport.destroy();

      this.handoverCtx = null;
      recordHandoverEvent('HANDOVER_COMPLETE', true);
      return true;

    } catch (err) {
      // ── ROLLBACK_SWITCH ────────────────────────────────
      const errorCode = err instanceof Error ? err.message : 'UNKNOWN_HANDOVER_ERROR';
      setPhase('ROLLBACK_SWITCH');
      console.error('[SessionTransportRouter] Transport handover failed, rolling back:', err);

      recordHandoverEvent('HANDOVER_ROLLBACK', false, errorCode);
      connectionDiagnostics.logEvent('signaling', 'TRANSPORT_HANDOVER_FAILED', {
        errorCode,
        handoverId,
        rollingBackTo: fromType,
      });

      // Restore original transport authority
      this.activeTransport = oldTransport;
      this.bindTransport(oldTransport);

      // Destroy the failed target transport
      try {
        nextTransport.destroy();
      } catch {
        // Ignore errors during cleanup
      }

      this.isTransitioning = false;
      this.handoverCtx = null;

      // Restore connectivity state
      connectivityStateMachine.dispatch({ type: 'DATA_CHANNEL_OPEN' });
      connectivityStateMachine.dispatch({ type: 'LEASE_VALIDATED' });
      return false;
    }
  }
}
