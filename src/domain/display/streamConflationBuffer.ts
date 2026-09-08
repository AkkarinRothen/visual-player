import type { VersionedSyncMessage, StreamCharacterTransformPayload, StreamControlValuePayload } from '../protocol/types';
import type { DisplayExecutorCallbacks } from '../../services/displayCommandExecutor';
import { reduceDisplayCommand } from './displayCommandReducer';

export interface ConflationMetrics {
  processedCount: number;
  droppedStaleCount: number;
  coalescedCount: number;
  purgedOnCriticalCount: number;
}

export interface StreamConflationBufferOptions {
  /**
   * Optional custom scheduler for animation frame (useful in Node / test environments).
   * Defaults to globalThis.requestAnimationFrame or setTimeout(cb, 16).
   */
  scheduleFrame?: (callback: () => void) => any;
  /**
   * Optional custom frame canceller.
   * Defaults to globalThis.cancelAnimationFrame or clearTimeout.
   */
  cancelFrame?: (handle: any) => void;
}

interface PendingEntry {
  msg: VersionedSyncMessage;
  callbacks: DisplayExecutorCallbacks;
}

/**
 * StreamConflationBuffer
 *
 * Buffers high-frequency continuous messages (e.g. character dragging, volume/weather sliders)
 * arriving at ~20 Hz or in burst packets due to Wi-Fi jitter.
 *
 * Guarantees:
 * 1. Stale Packet Drop: Discards any message whose sentAt is older than or equal to the last
 *    processed timestamp for that specific target entity/control.
 * 2. rAF Coalescing: If multiple frames arrive within the same screen refresh cycle (~16ms),
 *    only the latest frame is retained and rendered, preventing catch-up burst animations.
 * 3. Atomic Cancellation: When a non-continuous command (commit, scene transition) arrives,
 *    pending continuous frames are immediately purged so stale states never overwrite critical data.
 */
export class StreamConflationBuffer {
  private lastProcessedTimestamps: Map<string, number> = new Map();
  private pendingMessages: Map<string, PendingEntry> = new Map();
  private scheduledHandle: any = null;

  private metrics: ConflationMetrics = {
    processedCount: 0,
    droppedStaleCount: 0,
    coalescedCount: 0,
    purgedOnCriticalCount: 0,
  };

  private scheduleFrame: (callback: () => void) => any;
  private cancelFrame: (handle: any) => void;

  constructor(options?: StreamConflationBufferOptions) {
    if (options?.scheduleFrame && options?.cancelFrame) {
      this.scheduleFrame = options.scheduleFrame;
      this.cancelFrame = options.cancelFrame;
    } else if (typeof globalThis.requestAnimationFrame === 'function' && typeof globalThis.cancelAnimationFrame === 'function') {
      this.scheduleFrame = (cb) => globalThis.requestAnimationFrame(cb);
      this.cancelFrame = (h) => globalThis.cancelAnimationFrame(h);
    } else {
      this.scheduleFrame = (cb) => setTimeout(cb, 16);
      this.cancelFrame = (h) => clearTimeout(h);
    }
  }

  /**
   * Ingest a continuous sync message.
   * Returns true if accepted (or coalesced), false if dropped as stale.
   */
  public ingest(msg: VersionedSyncMessage, callbacks: DisplayExecutorCallbacks): boolean {
    const key = this.resolveConflationKey(msg);
    const sentAt = msg.sentAt || 0;
    const lastTimestamp = this.lastProcessedTimestamps.get(key) || 0;

    // 1. Drop stale or out-of-order packets
    if (sentAt <= lastTimestamp) {
      this.metrics.droppedStaleCount++;
      return false;
    }

    // 2. If a message is already waiting in this frame interval, coalesce it
    if (this.pendingMessages.has(key)) {
      this.metrics.coalescedCount++;
    }

    this.pendingMessages.set(key, { msg, callbacks });

    // 3. Schedule flush on the next animation frame if not already scheduled
    if (this.scheduledHandle === null) {
      this.scheduledHandle = this.scheduleFrame(() => {
        this.scheduledHandle = null;
        this.flushSync();
      });
    }

    return true;
  }

  /**
   * Flushes all pending messages immediately and synchronously.
   */
  public flushSync(): void {
    if (this.scheduledHandle !== null) {
      this.cancelFrame(this.scheduledHandle);
      this.scheduledHandle = null;
    }

    if (this.pendingMessages.size === 0) return;

    // Create a snapshot and clear the pending map
    const entries = Array.from(this.pendingMessages.entries());
    this.pendingMessages.clear();

    for (const [key, entry] of entries) {
      const { msg, callbacks } = entry;
      const sentAt = msg.sentAt || 0;

      // Update last processed timestamp
      this.lastProcessedTimestamps.set(key, Math.max(this.lastProcessedTimestamps.get(key) || 0, sentAt));

      try {
        const currentState = callbacks.getCurrentState();
        const reduction = reduceDisplayCommand(currentState, msg);

        if (reduction.success) {
          callbacks.onCommitState(reduction.nextState);
          if (reduction.sideEffects && reduction.sideEffects.length > 0 && callbacks.onSideEffect) {
            reduction.sideEffects.forEach((eff) => {
              try {
                callbacks.onSideEffect!(eff);
              } catch (effErr) {
                console.error('[StreamConflationBuffer] Side effect execution error:', effErr);
              }
            });
          }
        }
        this.metrics.processedCount++;
      } catch (err) {
        console.error('[StreamConflationBuffer] Error applying conflated command:', err);
      }
    }
  }

  /**
   * Cancels any pending frame and purges buffered continuous messages.
   * Invoked immediately when a critical/transactional command arrives.
   */
  public cancelPending(): void {
    if (this.scheduledHandle !== null) {
      this.cancelFrame(this.scheduledHandle);
      this.scheduledHandle = null;
    }
    const purged = this.pendingMessages.size;
    if (purged > 0) {
      this.metrics.purgedOnCriticalCount += purged;
      this.pendingMessages.clear();
    }
  }

  /**
   * Resets session context and clears historical timestamps.
   */
  public resetSession(): void {
    this.cancelPending();
    this.lastProcessedTimestamps.clear();
  }

  /**
   * Retrieves current conflation and network jitter telemetry.
   */
  public getMetrics(): Readonly<ConflationMetrics> {
    return { ...this.metrics };
  }

  /**
   * Resets metric counters.
   */
  public resetMetrics(): void {
    this.metrics = {
      processedCount: 0,
      droppedStaleCount: 0,
      coalescedCount: 0,
      purgedOnCriticalCount: 0,
    };
  }

  private resolveConflationKey(msg: VersionedSyncMessage): string {
    if (msg.type === 'STREAM_CHARACTER_TRANSFORM') {
      const p = msg.payload as StreamCharacterTransformPayload;
      return `char:${p?.id || 'unknown'}`;
    }
    if (msg.type === 'STREAM_CONTROL_VALUE') {
      const p = msg.payload as StreamControlValuePayload;
      return `ctrl:${p?.field || 'unknown'}`;
    }
    return `tier:${msg.type}`;
  }
}
