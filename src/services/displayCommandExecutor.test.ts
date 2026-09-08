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

  it('6. Fast-path: Aplica mensajes continuos sin emitir COMMAND_RESULT ni bloquear cola', async () => {
    const transportSend = vi.fn();
    const onCommitState = vi.fn((next) => {
      currentState = next;
    });

    currentState.characters = [
      {
        id: 'hero-1',
        name: 'Heroe',
        avatarUrl: '',
        position: 'center-left',
        normalizedX: 20,
        normalizedY: 10,
        isSpeaking: false,
      },
    ];

    const streamMsg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'msg-fast-1',
      sessionId: 'sess-alpha',
      connectionEpoch: 2,
      sequenceNumber: 6,
      sessionRevision: 8,
      sentAt: Date.now(),
      tier: 'continuous',
      requiresAck: false,
      type: 'STREAM_CHARACTER_TRANSFORM',
      payload: { id: 'hero-1', normalizedX: 55, normalizedY: 25 },
    };

    const result = await executor.enqueueCommand(streamMsg, {
      getCurrentState: () => currentState,
      onCommitState,
      transportSend,
    });

    expect(result).toBeNull();
    executor.flushConflationSync();
    expect(onCommitState).toHaveBeenCalled();
    expect(currentState.characters[0].normalizedX).toBe(55);
    expect(currentState.characters[0].normalizedY).toBe(25);
    // ZERO reverse traffic to the sender
    expect(transportSend).not.toHaveBeenCalled();
  });

  it('7. Fast-path: Dispatches side-effects when processing STREAM_CONTROL_VALUE', async () => {
    const transportSend = vi.fn();
    const onCommitState = vi.fn((next) => {
      currentState = next;
    });
    const onSideEffect = vi.fn();

    const streamMsg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'msg-stream-vol',
      sessionId: 'sess-alpha',
      connectionEpoch: 2,
      sequenceNumber: 7,
      sessionRevision: 8,
      sentAt: Date.now(),
      tier: 'continuous',
      requiresAck: false,
      type: 'STREAM_CONTROL_VALUE',
      payload: { field: 'ambientVolume', value: 0.72 },
    };

    const result = await executor.enqueueCommand(streamMsg, {
      getCurrentState: () => currentState,
      onCommitState,
      transportSend,
      onSideEffect,
    });

    expect(result).toBeNull();
    executor.flushConflationSync();
    expect(onCommitState).toHaveBeenCalled();
    expect(currentState.ambientVolume).toBe(0.72);
    expect(onSideEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'set_ambient_volume',
        payload: { volume: 0.72 },
      })
    );
    expect(transportSend).not.toHaveBeenCalled();
  });

  it('8. Fast-path: Coalesces burst streaming frames and drops stale packets', async () => {
    const transportSend = vi.fn();
    const onCommitState = vi.fn((next) => {
      currentState = next;
    });

    currentState.characters = [
      { id: 'hero-1', name: 'Heroe', avatarUrl: '', position: 'center-left', normalizedX: 0, normalizedY: 0, isSpeaking: false },
    ];

    const now = 50000;
    // Packet 1
    await executor.enqueueCommand(
      {
        protocolVersion: 1,
        messageId: 'b-1',
        sequenceNumber: 1,
        sessionRevision: 1,
        sessionId: 'sess-alpha',
        sentAt: now + 10,
        tier: 'continuous',
        requiresAck: false,
        type: 'STREAM_CHARACTER_TRANSFORM',
        payload: { id: 'hero-1', normalizedX: 10 },
      },
      { getCurrentState: () => currentState, onCommitState, transportSend }
    );

    // Packet 2 (burst in same tick)
    await executor.enqueueCommand(
      {
        protocolVersion: 1,
        messageId: 'b-2',
        sequenceNumber: 2,
        sessionRevision: 1,
        sessionId: 'sess-alpha',
        sentAt: now + 20,
        tier: 'continuous',
        requiresAck: false,
        type: 'STREAM_CHARACTER_TRANSFORM',
        payload: { id: 'hero-1', normalizedX: 30 },
      },
      { getCurrentState: () => currentState, onCommitState, transportSend }
    );

    const metrics = executor.getConflationMetrics();
    expect(metrics.coalescedCount).toBe(1);

    executor.flushConflationSync();
    expect(currentState.characters[0].normalizedX).toBe(30);

    // Packet 3 arrives delayed with older timestamp (stale)
    await executor.enqueueCommand(
      {
        protocolVersion: 1,
        messageId: 'b-3',
        sequenceNumber: 3,
        sessionRevision: 1,
        sessionId: 'sess-alpha',
        sentAt: now + 5,
        tier: 'continuous',
        requiresAck: false,
        type: 'STREAM_CHARACTER_TRANSFORM',
        payload: { id: 'hero-1', normalizedX: 5 },
      },
      { getCurrentState: () => currentState, onCommitState, transportSend }
    );

    expect(executor.getConflationMetrics().droppedStaleCount).toBe(1);
    expect(currentState.characters[0].normalizedX).toBe(30); // Unchanged
  });

  it('9. Critical command immediately cancels pending continuous frames', async () => {
    const transportSend = vi.fn();
    const onCommitState = vi.fn((next) => {
      currentState = next;
    });

    currentState.characters = [
      { id: 'hero-1', name: 'Heroe', avatarUrl: '', position: 'center-left', normalizedX: 0, normalizedY: 0, isSpeaking: false },
    ];

    // Enqueue continuous drag frame
    await executor.enqueueCommand(
      {
        protocolVersion: 1,
        messageId: 'drag-1',
        sequenceNumber: 1,
        sessionRevision: 1,
        sessionId: 'sess-alpha',
        sentAt: 60000,
        tier: 'continuous',
        requiresAck: false,
        type: 'STREAM_CHARACTER_TRANSFORM',
        payload: { id: 'hero-1', normalizedX: 85 },
      },
      { getCurrentState: () => currentState, onCommitState, transportSend }
    );

    // Critical command arrives: blackout
    const criticalResult = await executor.enqueueCommand(
      {
        protocolVersion: 1,
        messageId: 'crit-1',
        commandId: 'cmd-crit-1',
        sessionId: 'sess-alpha',
        connectionEpoch: 2,
        sequenceNumber: 10,
        sessionRevision: 9,
        sentAt: 60005,
        tier: 'critical',
        requiresAck: true,
        type: 'SET_BLACKOUT',
        payload: true,
      },
      { getCurrentState: () => currentState, onCommitState, transportSend }
    );

    expect(criticalResult?.status).toBe('applied');
    expect(currentState.isBlackout).toBe(true);
    // Continuous drag frame was cancelled/purged, so normalizedX was NOT mutated to 85
    expect(currentState.characters[0].normalizedX).toBe(0);
    expect(executor.getConflationMetrics().purgedOnCriticalCount).toBe(1);
  });
});

