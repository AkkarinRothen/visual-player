import { describe, it, expect, beforeEach } from 'vitest';
import {
  sessionRecoveryService,
  RECOVERY_STORAGE_KEY,
  MAX_RECOVERY_AGE_MS,
} from './sessionRecovery';
import type { DisplayState } from '../types';

describe('SessionRecoveryService & Process Death Resilience Suite', () => {
  beforeEach(() => {
    sessionRecoveryService.clearRecovery();
  });

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

  it('saves an incremental non-sensitive snapshot and retrieves it when unexpected termination occurs', () => {
    sessionRecoveryService.saveIncrementalSnapshot({
      role: 'master',
      roomId: 'VP-RECOV',
      sessionId: 'sess_1',
      connectionEpoch: Date.now(),
      campaignId: 'camp-1',
      activeSceneId: 'scene-dungeon',
      sessionRevision: 3,
      combatActive: true,
      hasStagedChanges: false,
      lastSceneName: 'Las Mazmorras Profundas',
      liveState: mockLiveState,
    });

    const pending = sessionRecoveryService.getPendingRecovery();
    expect(pending).not.toBeNull();
    expect(pending?.roomId).toBe('VP-RECOV');
    expect(pending?.combatActive).toBe(true);
    expect(pending?.exitType).toBe('unexpected_termination');
    expect(pending?.lastSceneName).toBe('Las Mazmorras Profundas');
  });

  it('suppresses recovery when user voluntarily exited with markCleanExit()', () => {
    sessionRecoveryService.saveIncrementalSnapshot({
      role: 'master',
      roomId: 'VP-CLEAN',
      sessionId: 'sess_1',
      connectionEpoch: Date.now(),
      sessionRevision: 1,
      combatActive: false,
      hasStagedChanges: false,
      liveState: mockLiveState,
    });

    expect(sessionRecoveryService.getPendingRecovery()).not.toBeNull();

    sessionRecoveryService.markCleanExit();

    expect(sessionRecoveryService.getPendingRecovery()).toBeNull();
  });

  it('discards recovery snapshots older than 8 hours', () => {
    sessionRecoveryService.saveIncrementalSnapshot({
      role: 'master',
      roomId: 'VP-OLD',
      sessionId: 'sess_1',
      connectionEpoch: Date.now(),
      sessionRevision: 1,
      combatActive: false,
      hasStagedChanges: false,
      liveState: mockLiveState,
    });

    // Manually age the snapshot in localStorage
    const raw = window.localStorage.getItem(RECOVERY_STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    parsed.savedAt = Date.now() - (MAX_RECOVERY_AGE_MS + 1000); // 8 hours and 1 second ago
    window.localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(parsed));

    expect(sessionRecoveryService.getPendingRecovery()).toBeNull();
  });

  it('clears recovery explicitly on clearRecovery()', () => {
    sessionRecoveryService.saveIncrementalSnapshot({
      role: 'display',
      roomId: 'VP-DISP',
      sessionId: 'sess_1',
      connectionEpoch: Date.now(),
      sessionRevision: 2,
      combatActive: false,
      hasStagedChanges: false,
      liveState: mockLiveState,
    });

    expect(sessionRecoveryService.getPendingRecovery()).not.toBeNull();

    sessionRecoveryService.clearRecovery();
    expect(sessionRecoveryService.getPendingRecovery()).toBeNull();
  });

  it('prepares safe resumption state by muting/pausing audio and resetting triggers', () => {
    const rawState: DisplayState = {
      sceneName: 'Batalla Épica',
      backgroundUrl: 'https://example.com/bg.jpg',
      characters: [],
      weather: 'rain',
      weatherIntensity: 0.8,
      lighting: 'torch_flicker',
      locationBanner: { text: 'Castillo', subtitle: 'Sala del Trono', visible: true },
      isBlackout: false,
      shakeTrigger: 3,
      lightningTrigger: 5,
      ambientAudioUrl: 'https://example.com/audio.mp3',
      ambientPlaying: true,
      ambientVolume: 0.8,
      lastSfx: { id: 'sfx-1', type: 'synth', audioUrl: 'sfx.mp3', timestamp: 12345 },
      combatState: {
        isActive: true,
        round: 2,
        currentTurnIndex: 1,
        combatants: [],
        turnTimerSeconds: 60,
        showTurnTimerToPlayers: true,
      },
    };

    const safeState = sessionRecoveryService.prepareSafeResumptionState(rawState);

    expect(safeState.ambientPlaying).toBe(false); // Paused safely
    expect(safeState.shakeTrigger).toBe(0); // Shake trigger reset
    expect(safeState.lightningTrigger).toBe(0); // Lightning trigger reset
    expect(safeState.lastSfx).toBeNull(); // No repeat sound shock
    expect(safeState.sceneName).toBe('Batalla Épica'); // Visual context preserved
  });
});
