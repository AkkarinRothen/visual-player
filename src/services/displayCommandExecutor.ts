import type { DisplayState } from '../types';
import type {
  CommandResultPayload,
  DisplayViewportTelemetry,
  DisplayAssetsStatus,
  VersionedSyncMessage,
} from '../domain/protocol/types';
import {
  reduceDisplayCommand,
  type DisplayCommandSideEffect,
} from '../domain/display/displayCommandReducer';
import { computeStateChecksum } from './sessionRecovery';

export interface DisplayExecutorCallbacks {
  getCurrentState: () => DisplayState;
  onCommitState: (nextState: DisplayState) => void;
  transportSend: (msg: { type: string; payload: CommandResultPayload }) => void;
  onSideEffect?: (effect: DisplayCommandSideEffect) => void;
  getViewportInfo?: () => DisplayViewportTelemetry;
  getAssetsStatus?: () => DisplayAssetsStatus;
}

export class DisplayCommandExecutor {
  private queue: Promise<void> = Promise.resolve();
  private appliedCommands: Map<string, CommandResultPayload> = new Map();
  private maxCacheSize: number = 200;
  private activeSessionId: string | null = null;
  private activeConnectionEpoch: number = 1;
  private currentRevision: number = 1;

  constructor(maxCacheSize: number = 200) {
    this.maxCacheSize = maxCacheSize;
  }

  public setSessionContext(sessionId: string | null, connectionEpoch: number = 1): void {
    if (this.activeSessionId !== sessionId) {
      // New session invalidates cached commands from previous session
      this.appliedCommands.clear();
      this.activeSessionId = sessionId;
    }
    this.activeConnectionEpoch = connectionEpoch;
  }

  public reset(): void {
    this.appliedCommands.clear();
    this.activeSessionId = null;
    this.activeConnectionEpoch = 1;
    this.currentRevision = 1;
    this.queue = Promise.resolve();
  }

  /**
   * Enqueue a command message into the strict FIFO execution queue.
   * Ensures that asynchronous SHA-256 calculation and state commits run strictly one-by-one.
   */
  public enqueueCommand(
    msg: VersionedSyncMessage,
    callbacks: DisplayExecutorCallbacks
  ): Promise<CommandResultPayload | null> {
    return new Promise((resolve) => {
      this.queue = this.queue.then(async () => {
        try {
          const result = await this.executeSingleCommand(msg, callbacks);
          resolve(result);
        } catch (err) {
          console.error('[DisplayCommandExecutor] Unexpected execution failure:', err);
          resolve(null);
        }
      });
    });
  }

  private async executeSingleCommand(
    msg: VersionedSyncMessage,
    callbacks: DisplayExecutorCallbacks
  ): Promise<CommandResultPayload | null> {
    const commandId = msg.commandId;

    // 1. Idempotency Check: if already processed, re-send cached receipt without re-executing
    if (commandId && this.appliedCommands.has(commandId)) {
      const cached = this.appliedCommands.get(commandId)!;
      callbacks.transportSend({
        type: 'COMMAND_RESULT',
        payload: { ...cached },
      });
      return cached;
    }

    // 2. Validate Session Context and Epoch Authority
    if (
      msg.sessionId &&
      this.activeSessionId &&
      msg.sessionId !== this.activeSessionId
    ) {
      const rejection: CommandResultPayload = {
        commandId: commandId || 'unknown',
        status: 'rejected',
        revision: this.currentRevision,
        checksum: '',
        appliedAt: Date.now(),
        sessionId: this.activeSessionId,
        connectionEpoch: this.activeConnectionEpoch,
        errorCode: 'SESSION_MISMATCH',
        errorMessage: `El comando pertenece a la sesión "${msg.sessionId}", pero la Mesa está en "${this.activeSessionId}"`,
      };

      if (commandId) {
        callbacks.transportSend({ type: 'COMMAND_RESULT', payload: rejection });
      }
      return rejection;
    }

    if (
      msg.connectionEpoch !== undefined &&
      this.activeConnectionEpoch !== undefined &&
      msg.connectionEpoch < this.activeConnectionEpoch
    ) {
      const rejection: CommandResultPayload = {
        commandId: commandId || 'unknown',
        status: 'rejected',
        revision: this.currentRevision,
        checksum: '',
        appliedAt: Date.now(),
        sessionId: this.activeSessionId || undefined,
        connectionEpoch: this.activeConnectionEpoch,
        errorCode: 'STALE_EPOCH',
        errorMessage: `El epoch del comando (${msg.connectionEpoch}) es anterior al epoch actual (${this.activeConnectionEpoch})`,
      };

      if (commandId) {
        callbacks.transportSend({ type: 'COMMAND_RESULT', payload: rejection });
      }
      return rejection;
    }

    // 3. Pure Reducer evaluation
    const currentState = callbacks.getCurrentState();
    const reduction = reduceDisplayCommand(currentState, msg);

    if (!reduction.success) {
      const rejection: CommandResultPayload = {
        commandId: commandId || 'unknown',
        status: 'rejected',
        revision: this.currentRevision,
        checksum: '',
        appliedAt: Date.now(),
        sessionId: this.activeSessionId || undefined,
        connectionEpoch: this.activeConnectionEpoch,
        errorCode: reduction.errorCode,
        errorMessage: reduction.errorMessage,
      };

      if (commandId) {
        callbacks.transportSend({ type: 'COMMAND_RESULT', payload: rejection });
      }
      return rejection;
    }

    // 4. Commit State
    callbacks.onCommitState(reduction.nextState);

    // 5. Compute Authentic Canonical Web Crypto SHA-256 on the committed nextState
    const canonicalChecksum = await computeStateChecksum(reduction.nextState);

    // 6. Monotonic revision advancement
    const revision =
      msg.sessionRevision && msg.sessionRevision > this.currentRevision
        ? msg.sessionRevision
        : ++this.currentRevision;
    this.currentRevision = revision;

    const viewport = callbacks.getViewportInfo?.();
    const assetsStatus = callbacks.getAssetsStatus?.();

    const appliedPayload: CommandResultPayload = {
      commandId: commandId || 'unknown',
      status: 'applied',
      revision,
      checksum: canonicalChecksum,
      appliedAt: Date.now(),
      sessionId: this.activeSessionId || undefined,
      connectionEpoch: this.activeConnectionEpoch,
      viewport,
      assetsStatus,
    };

    // Cache result for idempotency
    if (commandId) {
      this.appliedCommands.set(commandId, appliedPayload);
      if (this.appliedCommands.size > this.maxCacheSize) {
        const firstKey = this.appliedCommands.keys().next().value;
        if (firstKey) this.appliedCommands.delete(firstKey);
      }

      // Dispatch COMMAND_RESULT confirmation to Master
      callbacks.transportSend({
        type: 'COMMAND_RESULT',
        payload: appliedPayload,
      });
    }

    // 7. Execute side-effects safely after commit
    if (reduction.sideEffects && reduction.sideEffects.length > 0 && callbacks.onSideEffect) {
      reduction.sideEffects.forEach((eff) => {
        try {
          callbacks.onSideEffect!(eff);
        } catch (effErr) {
          console.error('[DisplayCommandExecutor] Side effect error:', effErr);
        }
      });
    }

    return appliedPayload;
  }
}

export const displayCommandExecutor = new DisplayCommandExecutor();
