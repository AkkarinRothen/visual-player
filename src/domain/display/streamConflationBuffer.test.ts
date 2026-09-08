import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamConflationBuffer } from './streamConflationBuffer';
import type { DisplayState } from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';

describe('StreamConflationBuffer Suite', () => {
  let buffer: StreamConflationBuffer;
  let scheduledCallback: (() => void) | null;
  let currentState: DisplayState;

  const mockCallbacks = (stateRef: { current: DisplayState }, onSideEffect?: any) => ({
    getCurrentState: () => stateRef.current,
    onCommitState: vi.fn((next: DisplayState) => {
      stateRef.current = next;
    }),
    transportSend: vi.fn(),
    onSideEffect: onSideEffect || vi.fn(),
  });

  const createStreamMessage = (
    overrides: Partial<VersionedSyncMessage> & Pick<VersionedSyncMessage, 'type' | 'payload'>
  ): VersionedSyncMessage => ({
    protocolVersion: 1,
    messageId: 'msg-' + Math.random().toString(36).substring(2, 9),
    sequenceNumber: 1,
    sessionRevision: 1,
    sentAt: Date.now(),
    tier: 'continuous',
    requiresAck: false,
    ...overrides,
  });

  beforeEach(() => {
    scheduledCallback = null;
    buffer = new StreamConflationBuffer({
      scheduleFrame: (cb) => {
        scheduledCallback = cb;
        return 101;
      },
      cancelFrame: () => {
        scheduledCallback = null;
      },
    });

    currentState = {
      sceneName: 'Bosque',
      backgroundUrl: '',
      characters: [
        { id: 'char-1', name: 'Guerrero', avatarUrl: '', position: 'center-left', normalizedX: 10, normalizedY: 10, isSpeaking: false },
        { id: 'char-2', name: 'Maga', avatarUrl: '', position: 'center-right', normalizedX: 50, normalizedY: 50, isSpeaking: false },
      ],
      weather: 'none',
      weatherIntensity: 0.5,
      lighting: 'normal',
      locationBanner: { text: '', visible: false },
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

  it('1. Coalesces burst frames in the same refresh interval, applying only the latest', () => {
    const stateRef = { current: currentState };
    const callbacks = mockCallbacks(stateRef);

    // Ingest 4 frames in rapid succession (a network burst)
    const baseTime = 1000;
    for (let i = 1; i <= 4; i++) {
      const msg = createStreamMessage({
        messageId: `msg-${i}`,
        sequenceNumber: i,
        sentAt: baseTime + i * 5,
        type: 'STREAM_CHARACTER_TRANSFORM',
        payload: { id: 'char-1', normalizedX: 10 + i * 10, normalizedY: 20 },
      });
      const accepted = buffer.ingest(msg, callbacks);
      expect(accepted).toBe(true);
    }

    // Callbacks should not have run yet (coalesced in buffer)
    expect(callbacks.onCommitState).not.toHaveBeenCalled();

    const metricsBeforeFlush = buffer.getMetrics();
    expect(metricsBeforeFlush.coalescedCount).toBe(3); // 4 packets total, 3 coalesced replacements

    // Now screen refresh occurs (rAF fires)
    expect(scheduledCallback).not.toBeNull();
    scheduledCallback!();

    // Callbacks ran exactly once for this entity
    expect(callbacks.onCommitState).toHaveBeenCalledTimes(1);
    expect(stateRef.current.characters[0].normalizedX).toBe(50); // The 4th frame (10 + 4*10)

    const metricsAfterFlush = buffer.getMetrics();
    expect(metricsAfterFlush.processedCount).toBe(1);
  });

  it('2. Discards stale or out-of-order packets older than the latest processed timestamp', () => {
    const stateRef = { current: currentState };
    const callbacks = mockCallbacks(stateRef);

    // Frame 1 arrives at t = 2000
    buffer.ingest(
      createStreamMessage({
        messageId: 'msg-recent',
        sentAt: 2000,
        type: 'STREAM_CHARACTER_TRANSFORM',
        payload: { id: 'char-1', normalizedX: 75, normalizedY: 30 },
      }),
      callbacks
    );

    // Flush frame 1
    scheduledCallback!();
    expect(stateRef.current.characters[0].normalizedX).toBe(75);

    // Frame 2 arrives delayed out-of-order with t = 1800 (older than 2000)
    const accepted = buffer.ingest(
      createStreamMessage({
        messageId: 'msg-stale',
        sentAt: 1800,
        type: 'STREAM_CHARACTER_TRANSFORM',
        payload: { id: 'char-1', normalizedX: 20, normalizedY: 10 },
      }),
      callbacks
    );

    expect(accepted).toBe(false);
    expect(buffer.getMetrics().droppedStaleCount).toBe(1);

    // State remains untouched
    expect(stateRef.current.characters[0].normalizedX).toBe(75);
  });

  it('3. Manages independent keys without cross-entity interference', () => {
    const stateRef = { current: currentState };
    const callbacks = mockCallbacks(stateRef);

    // Character 1 frame
    buffer.ingest(
      createStreamMessage({
        messageId: 'msg-c1',
        sentAt: 3000,
        type: 'STREAM_CHARACTER_TRANSFORM',
        payload: { id: 'char-1', normalizedX: 33 },
      }),
      callbacks
    );

    // Character 2 frame
    buffer.ingest(
      createStreamMessage({
        messageId: 'msg-c2',
        sentAt: 3005,
        type: 'STREAM_CHARACTER_TRANSFORM',
        payload: { id: 'char-2', normalizedX: 88 },
      }),
      callbacks
    );

    // Control frame (weather intensity)
    buffer.ingest(
      createStreamMessage({
        messageId: 'msg-ctrl',
        sentAt: 3010,
        type: 'STREAM_CONTROL_VALUE',
        payload: { field: 'weatherIntensity', value: 0.95 },
      }),
      callbacks
    );

    scheduledCallback!();

    expect(callbacks.onCommitState).toHaveBeenCalledTimes(3);
    expect(stateRef.current.characters[0].normalizedX).toBe(33);
    expect(stateRef.current.characters[1].normalizedX).toBe(88);
    expect(stateRef.current.weatherIntensity).toBe(0.95);
  });

  it('4. Cancels pending frames immediately and records purged metrics when cancelPending is called', () => {
    const stateRef = { current: currentState };
    const callbacks = mockCallbacks(stateRef);

    buffer.ingest(
      createStreamMessage({
        messageId: 'msg-pending',
        sentAt: 4000,
        type: 'STREAM_CHARACTER_TRANSFORM',
        payload: { id: 'char-1', normalizedX: 99 },
      }),
      callbacks
    );

    expect(scheduledCallback).not.toBeNull();

    // Critical command arrives: buffer is purged
    buffer.cancelPending();

    expect(scheduledCallback).toBeNull();
    expect(buffer.getMetrics().purgedOnCriticalCount).toBe(1);

    // State never updated to 99
    expect(stateRef.current.characters[0].normalizedX).toBe(10);
  });

  it('5. Correctly triggers side effects on flushed control frames', () => {
    const stateRef = { current: currentState };
    const onSideEffect = vi.fn();
    const callbacks = mockCallbacks(stateRef, onSideEffect);

    buffer.ingest(
      createStreamMessage({
        messageId: 'msg-vol',
        sentAt: 5000,
        type: 'STREAM_CONTROL_VALUE',
        payload: { field: 'ambientVolume', value: 0.35 },
      }),
      callbacks
    );

    scheduledCallback!();

    expect(stateRef.current.ambientVolume).toBe(0.35);
    expect(onSideEffect).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'set_ambient_volume',
        payload: { volume: 0.35 },
      })
    );
  });

  it('6. Resets session and clears timestamps on resetSession', () => {
    const stateRef = { current: currentState };
    const callbacks = mockCallbacks(stateRef);

    buffer.ingest(
      createStreamMessage({
        messageId: 'msg-old',
        sentAt: 6000,
        type: 'STREAM_CHARACTER_TRANSFORM',
        payload: { id: 'char-1', normalizedX: 45 },
      }),
      callbacks
    );
    scheduledCallback!();

    // Reset session
    buffer.resetSession();

    // Same or earlier timestamp is now accepted under new session
    const accepted = buffer.ingest(
      createStreamMessage({
        messageId: 'msg-new-sess',
        sentAt: 6000,
        type: 'STREAM_CHARACTER_TRANSFORM',
        payload: { id: 'char-1', normalizedX: 60 },
      }),
      callbacks
    );

    expect(accepted).toBe(true);
  });
});
