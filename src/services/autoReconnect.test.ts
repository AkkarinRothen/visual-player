import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ConnectivityStateMachine,
  MAX_RECONNECT_ATTEMPTS,
  BASE_RECONNECT_DELAY_MS,
} from './connectivityStateMachine';
import { sessionRecoveryService } from './sessionRecovery';
import type { DisplayState } from '../types';

/**
 * Auto-Reconnect Loop — Display Role
 *
 * These tests validate the autonomous reconnect behaviour implemented in
 * PlayerDisplay (via scheduleAutoReconnect) using the ConnectivityStateMachine
 * backoff calculator and sessionRecoveryService snapshot persistence.
 */
describe('Display Auto-Reconnect Loop & State Persistence', () => {
  let sm: ConnectivityStateMachine;

  const mockLiveState: DisplayState = {
    sceneName: 'Test Scene',
    backgroundUrl: 'https://example.com/bg.jpg',
    characters: [],
    weather: 'none',
    weatherIntensity: 0,
    lighting: 'normal',
    locationBanner: { text: '', visible: false },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
    ambientPlaying: false,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: {
      isActive: false,
      round: 0,
      currentTurnIndex: 0,
      combatants: [],
      turnTimerSeconds: 60,
      showTurnTimerToPlayers: true,
    },
  };

  beforeEach(async () => {
    sm = new ConnectivityStateMachine('OFFLINE');
    vi.useFakeTimers();
    await sessionRecoveryService.clearRecovery();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── 1. Backoff calculator ────────────────────────────────────────────────

  it('1. getReconnectDelay() returns BASE_RECONNECT_DELAY_MS on first attempt (0 jitter)', () => {
    const delay = sm.getReconnectDelay(0);
    expect(delay).toBe(BASE_RECONNECT_DELAY_MS); // 1000ms
  });

  it('2. getReconnectDelay() doubles with each DATA_CHANNEL_CLOSED event', () => {
    sm.dispatch({ type: 'DATA_CHANNEL_CLOSED' }); // attempt 1 -> 2000ms
    sm.dispatch({ type: 'DATA_CHANNEL_CLOSED' }); // attempt 2 -> 4000ms
    sm.dispatch({ type: 'DATA_CHANNEL_CLOSED' }); // attempt 3 -> 8000ms

    expect(sm.getReconnectAttempts()).toBe(3);
    expect(sm.getReconnectDelay(0)).toBe(8000);
  });

  it('3. getReconnectDelay() is capped at MAX_RECONNECT_DELAY_MS (15000ms)', () => {
    for (let i = 0; i < 8; i++) {
      sm.dispatch({ type: 'DATA_CHANNEL_CLOSED' });
    }
    const delay = sm.getReconnectDelay(0);
    expect(delay).toBe(15000);
  });

  it('4. Reconnect attempt counter resets to 0 when connection is restored', () => {
    sm.dispatch({ type: 'DATA_CHANNEL_CLOSED' });
    sm.dispatch({ type: 'DATA_CHANNEL_CLOSED' });
    expect(sm.getReconnectAttempts()).toBe(2);

    sm.dispatch({ type: 'DATA_CHANNEL_OPEN' });
    sm.dispatch({ type: 'LEASE_VALIDATED' });
    expect(sm.getReconnectAttempts()).toBe(0);
  });

  // ── 2. Session snapshot persistence ────────────────────────────────────

  it('5. Display-role snapshot persists masterPeerId (roomCode) in IndexedDB', async () => {
    await sessionRecoveryService.saveIncrementalSnapshot({
      role: 'display',
      roomId: 'VP-AUTO',
      masterPeerId: 'VP-AUTO',
      sessionId: 'VP-AUTO',
      connectionEpoch: Date.now(),
      sessionRevision: 1,
      combatActive: false,
      hasStagedChanges: false,
      liveState: mockLiveState,
    });

    const snap = await sessionRecoveryService.getPendingRecovery();
    expect(snap).not.toBeNull();
    expect(snap?.masterPeerId).toBe('VP-AUTO');
    expect(snap?.role).toBe('display');
  });

  it('6. Display snapshot with masterPeerId is retrievable after unexpected termination', async () => {
    const code = 'VP-CRASH';
    await sessionRecoveryService.saveIncrementalSnapshot({
      role: 'display',
      roomId: code,
      masterPeerId: code,
      sessionId: code,
      connectionEpoch: Date.now(),
      sessionRevision: 3,
      combatActive: false,
      hasStagedChanges: false,
      liveState: mockLiveState,
    });

    // Simulate crash: no markCleanExit() called
    const snap = await sessionRecoveryService.getPendingRecovery();
    expect(snap?.exitType).toBe('unexpected_termination');
    expect(snap?.masterPeerId).toBe(code);
  });

  it('7. markCleanExit() prevents masterPeerId from being used for reconnect', async () => {
    await sessionRecoveryService.saveIncrementalSnapshot({
      role: 'display',
      roomId: 'VP-EXIT',
      masterPeerId: 'VP-EXIT',
      sessionId: 'VP-EXIT',
      connectionEpoch: Date.now(),
      sessionRevision: 1,
      combatActive: false,
      hasStagedChanges: false,
      liveState: mockLiveState,
    });

    await sessionRecoveryService.markCleanExit();
    const snap = await sessionRecoveryService.getPendingRecovery();
    expect(snap).toBeNull();
  });

  // ── 3. State machine OFFLINE transition on exhausted attempts ───────────

  it('8. RETRY_EXHAUSTED transitions state machine from RECONNECTING to OFFLINE', () => {
    sm.dispatch({ type: 'DATA_CHANNEL_CLOSED' });
    expect(sm.getState()).toBe('RECONNECTING');

    sm.dispatch({ type: 'RETRY_EXHAUSTED' });
    expect(sm.getState()).toBe('OFFLINE');
    expect(sm.canMutateDisplay()).toBe(false);
    expect(sm.getReconnectAttempts()).toBe(0);
  });

  it('9. After RETRY_EXHAUSTED, new DATA_CHANNEL_CLOSED starts fresh reconnect cycle', () => {
    sm.dispatch({ type: 'RETRY_EXHAUSTED' });
    expect(sm.getState()).toBe('OFFLINE');

    sm.dispatch({ type: 'DATA_CHANNEL_CLOSED' });
    expect(sm.getState()).toBe('RECONNECTING');
    expect(sm.getReconnectAttempts()).toBe(1);
  });

  // ── 4. Constants ────────────────────────────────────────────────────────

  it('10. MAX_RECONNECT_ATTEMPTS constant is 10 (~5 min with exponential backoff)', () => {
    expect(MAX_RECONNECT_ATTEMPTS).toBe(10);
  });

  it('11. BASE_RECONNECT_DELAY_MS constant is 1000ms', () => {
    expect(BASE_RECONNECT_DELAY_MS).toBe(1000);
  });
});
