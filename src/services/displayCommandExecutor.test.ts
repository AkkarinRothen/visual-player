import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DisplayCommandExecutor } from './displayCommandExecutor';
import type { DisplayState } from '../types';
import type { VersionedSyncMessage } from '../domain/protocol/types';

describe('DisplayCommandExecutor Suite', () => {
  let executor: DisplayCommandExecutor;
  let currentState: DisplayState;

  beforeEach(() => {
    executor = new DisplayCommandExecutor();
    executor.setSessionContext('sess-alpha', 2);
    currentState = {
      sceneName: 'Plaza Mayor',
      backgroundUrl: 'https://example.com/plaza.jpg',
      characters: [],
      weather: 'none',
      weatherIntensity: 0.5,
      lighting: 'normal',
      locationBanner: { text: 'Plaza', visible: true },
      isBlackout: false,
      shakeTrigger: 0,
      lightningTrigger: 0,
      ambientAudioUrl: '',
      ambientPlaying: false,
      ambientVolume: 0.5,
      lastSfx: null,
      combatState: { isActive: false, round: 1, currentTurnIndex: 0, combatants: [] },
    };
  });

  it('1. Executes command sequentially and computes authentic canonical SHA-256', async () => {
    const onCommitState = vi.fn((next) => {
      currentState = next;
    });
    const transportSend = vi.fn();
    const onSideEffect = vi.fn();

    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'msg-1',
      commandId: 'cmd-seq-1',
      sessionId: 'sess-alpha',
      connectionEpoch: 2,
      sequenceNumber: 1,
      sessionRevision: 3,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'SET_BLACKOUT',
      payload: true,
    };

    const result = await executor.enqueueCommand(msg, {
      getCurrentState: () => currentState,
      onCommitState,
      transportSend,
      onSideEffect,
    });

    expect(result).toBeDefined();
    expect(result?.status).toBe('applied');
    expect(result?.commandId).toBe('cmd-seq-1');
    expect(result?.checksum.startsWith('sha256:')).toBe(true);
    // Authentic SHA-256 has 64 hex characters after sha256:
    const hashHex = result?.checksum.replace('sha256:', '');
    expect(hashHex?.length).toBe(64);
    expect(onCommitState).toHaveBeenCalledWith(expect.objectContaining({ isBlackout: true }));
    expect(transportSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'COMMAND_RESULT',
        payload: expect.objectContaining({ status: 'applied', commandId: 'cmd-seq-1' }),
      })
    );
  });

  it('2. Enforces idempotency: repeated commandId returns cached result without re-committing', async () => {
    const onCommitState = vi.fn((next) => {
      currentState = next;
    });
    const transportSend = vi.fn();
    const onSideEffect = vi.fn();

    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'msg-repeat',
      commandId: 'cmd-idempotent-1',
      sessionId: 'sess-alpha',
      connectionEpoch: 2,
      sequenceNumber: 2,
      sessionRevision: 4,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'TRIGGER_LIGHTNING',
      payload: {},
    };

    // First execution
    const r1 = await executor.enqueueCommand(msg, {
      getCurrentState: () => currentState,
      onCommitState,
      transportSend,
      onSideEffect,
    });

    expect(onCommitState).toHaveBeenCalledTimes(1);
    expect(onSideEffect).toHaveBeenCalledTimes(1);

    // Duplicate execution with exact same commandId
    const r2 = await executor.enqueueCommand(msg, {
      getCurrentState: () => currentState,
      onCommitState,
      transportSend,
      onSideEffect,
    });

    expect(r2?.commandId).toBe(r1?.commandId);
    expect(r2?.checksum).toBe(r1?.checksum);
    // Idempotent hit should NOT commit state or re-trigger side effects!
    expect(onCommitState).toHaveBeenCalledTimes(1);
    expect(onSideEffect).toHaveBeenCalledTimes(1);
    // But it should have re-sent the receipt to transport
    expect(transportSend).toHaveBeenCalledTimes(2);
  });

  it('3. Rejects command if sessionId does not match active session context', async () => {
    const transportSend = vi.fn();

    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'msg-foreign',
      commandId: 'cmd-foreign-1',
      sessionId: 'foreign-session-xyz',
      connectionEpoch: 2,
      sequenceNumber: 3,
      sessionRevision: 5,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'SET_BLACKOUT',
      payload: true,
    };

    const result = await executor.enqueueCommand(msg, {
      getCurrentState: () => currentState,
      onCommitState: vi.fn(),
      transportSend,
    });

    expect(result?.status).toBe('rejected');
    expect(result?.errorCode).toBe('SESSION_MISMATCH');
    expect(transportSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'COMMAND_RESULT',
        payload: expect.objectContaining({ errorCode: 'SESSION_MISMATCH' }),
      })
    );
  });

  it('4. Rejects command if connectionEpoch is stale', async () => {
    const transportSend = vi.fn();

    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'msg-stale',
      commandId: 'cmd-stale-1',
      sessionId: 'sess-alpha',
      connectionEpoch: 1, // Active is 2
      sequenceNumber: 4,
      sessionRevision: 6,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'SET_BLACKOUT',
      payload: true,
    };

    const result = await executor.enqueueCommand(msg, {
      getCurrentState: () => currentState,
      onCommitState: vi.fn(),
      transportSend,
    });

    expect(result?.status).toBe('rejected');
    expect(result?.errorCode).toBe('STALE_EPOCH');
  });

  it('5. Rejects unknown command types deterministically without modifying state', async () => {
    const transportSend = vi.fn();
    const onCommitState = vi.fn();

    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'msg-bad',
      commandId: 'cmd-bad-1',
      sessionId: 'sess-alpha',
      connectionEpoch: 2,
      sequenceNumber: 5,
      sessionRevision: 7,
      sentAt: Date.now(),
      tier: 'ephemeral',
      requiresAck: false,
      type: 'INVALID_TYPE' as any,
      payload: {},
    };

    const result = await executor.enqueueCommand(msg, {
      getCurrentState: () => currentState,
      onCommitState,
      transportSend,
    });

    expect(result?.status).toBe('rejected');
    expect(result?.errorCode).toBe('UNKNOWN_COMMAND');
    expect(onCommitState).not.toHaveBeenCalled();
  });
});
