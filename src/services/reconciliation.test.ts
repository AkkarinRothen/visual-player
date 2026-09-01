import { describe, it, expect } from 'vitest';
import {
  computeStateChecksum,
  sessionRecoveryService,
} from './sessionRecovery';
import type { DisplayState, HandshakeHelloPayload } from '../types';

describe('Android ↔ Web Handshake, Canonical Checksum & Reconciliation Engine', () => {
  const baseDisplayState: DisplayState = {
    sceneName: 'El Bosque Susurrante',
    backgroundUrl: 'https://images.unsplash.com/forest.jpg',
    characters: [
      {
        id: 'npc-1',
        name: 'Elfa Guía',
        avatarUrl: 'https://images.unsplash.com/elf.jpg',
        position: 'center-left',
        isSpeaking: true,
        activeExpression: 'Alerta',
      },
    ],
    weather: 'fog',
    weatherIntensity: 0.6,
    lighting: 'torch_flicker',
    locationBanner: { text: 'Bosque Ancestral', subtitle: 'Sendero Oeste', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/forest-wind.mp3',
    ambientPlaying: true,
    ambientVolume: 0.75,
    lastSfx: null,
    combatState: {
      isActive: true,
      round: 3,
      currentTurnIndex: 1,
      combatants: [
        { id: 'c1', name: 'Guerrero', avatarUrl: '', initiative: 18, currentHp: 45, maxHp: 50, showHpToPlayers: true, conditions: [], isMonster: false },
        { id: 'c2', name: 'Goblin', avatarUrl: '', initiative: 12, currentHp: 12, maxHp: 12, showHpToPlayers: true, conditions: [], isMonster: true },
      ],
      turnTimerSeconds: 60,
      showTurnTimerToPlayers: true,
    },
  };

  it('1. Computes deterministic canonical checksum for identical visual states regardless of object reference', () => {
    const stateA = { ...baseDisplayState };
    const stateB = JSON.parse(JSON.stringify(baseDisplayState));

    const chkA = computeStateChecksum(stateA);
    const chkB = computeStateChecksum(stateB);

    expect(chkA).toBe(chkB);
    expect(chkA.startsWith('chk_')).toBe(true);
  });

  it('2. Changes checksum when visual, narrative, or combat state changes', () => {
    const originalChecksum = computeStateChecksum(baseDisplayState);

    const modifiedScene = { ...baseDisplayState, sceneName: 'La Cueva Oscura' };
    const modifiedWeather = { ...baseDisplayState, weather: 'rain' as const };
    const modifiedCombat = {
      ...baseDisplayState,
      combatState: { ...baseDisplayState.combatState, round: 4 },
    };

    expect(computeStateChecksum(modifiedScene)).not.toBe(originalChecksum);
    expect(computeStateChecksum(modifiedWeather)).not.toBe(originalChecksum);
    expect(computeStateChecksum(modifiedCombat)).not.toBe(originalChecksum);
  });

  it('3. Handshake evaluates to SYNCHRONIZED when Android Master and Web Display share exact revision and checksum', () => {
    const checksum = computeStateChecksum(baseDisplayState);

    const masterHello: HandshakeHelloPayload = {
      deviceRole: 'master',
      platform: 'android',
      appVersion: '1.0.0',
      protocolVersion: 1,
      sessionId: 'sess_VP-8822',
      connectionEpoch: 1700000000,
      sessionRevision: 8,
      stateChecksum: checksum,
      capabilities: { isHardwareKeystore: true, hasWakeLock: true, isImmersiveSupported: true },
    };

    const displayHello: HandshakeHelloPayload = {
      deviceRole: 'display',
      platform: 'web',
      appVersion: '1.0.0',
      protocolVersion: 1,
      sessionId: 'sess_VP-8822',
      connectionEpoch: 1700000000,
      sessionRevision: 8,
      stateChecksum: checksum,
      capabilities: { isHardwareKeystore: false, hasWakeLock: true, isImmersiveSupported: false },
    };

    const plan = sessionRecoveryService.evaluateReconciliation(masterHello, displayHello);
    expect(plan.action).toBe('SYNCHRONIZED');
    expect(plan.targetRevision).toBe(8);
  });

  it('4. Reconciles as MASTER_AUTHORITATIVE when Android Master has higher revision than Web Display', () => {
    const masterHello: HandshakeHelloPayload = {
      deviceRole: 'master',
      platform: 'android',
      appVersion: '1.0.0',
      protocolVersion: 1,
      sessionId: 'sess_VP-8822',
      connectionEpoch: 1700000000,
      sessionRevision: 12,
      stateChecksum: 'chk_master_new',
      capabilities: { isHardwareKeystore: true, hasWakeLock: true, isImmersiveSupported: true },
    };

    const displayHello: HandshakeHelloPayload = {
      deviceRole: 'display',
      platform: 'web',
      appVersion: '1.0.0',
      protocolVersion: 1,
      sessionId: 'sess_VP-8822',
      connectionEpoch: 1700000000,
      sessionRevision: 9,
      stateChecksum: 'chk_display_old',
      capabilities: { isHardwareKeystore: false, hasWakeLock: true, isImmersiveSupported: false },
    };

    const plan = sessionRecoveryService.evaluateReconciliation(masterHello, displayHello);
    expect(plan.action).toBe('MASTER_AUTHORITATIVE');
    expect(plan.targetRevision).toBe(12);
  });

  it('5. Reconciles as DISPLAY_AHEAD_CHECKPOINT when Web Display is ahead of recovered Android Master', () => {
    const masterHello: HandshakeHelloPayload = {
      deviceRole: 'master',
      platform: 'web',
      appVersion: '1.0.0',
      protocolVersion: 1,
      sessionId: 'sess_VP-8822',
      connectionEpoch: 1700000000,
      sessionRevision: 5,
      stateChecksum: 'chk_master_stale',
      capabilities: { isHardwareKeystore: false, hasWakeLock: true, isImmersiveSupported: false },
    };

    const displayHello: HandshakeHelloPayload = {
      deviceRole: 'display',
      platform: 'android',
      appVersion: '1.0.0',
      protocolVersion: 1,
      sessionId: 'sess_VP-8822',
      connectionEpoch: 1700000000,
      sessionRevision: 9,
      stateChecksum: 'chk_display_ahead',
      capabilities: { isHardwareKeystore: true, hasWakeLock: true, isImmersiveSupported: true },
    };

    const plan = sessionRecoveryService.evaluateReconciliation(masterHello, displayHello);
    expect(plan.action).toBe('DISPLAY_AHEAD_CHECKPOINT');
    expect(plan.targetRevision).toBe(9);
  });

  it('6. Full safe state resumption mutes ambient audio, resets shake/lightning triggers, but preserves combat and visual scene', () => {
    const stateWithLiveTriggers: DisplayState = {
      ...baseDisplayState,
      ambientPlaying: true,
      shakeTrigger: 4,
      lightningTrigger: 7,
      lastSfx: { id: 's1', type: 'synth', audioUrl: 'thunder.mp3', timestamp: 123 },
    };

    const safeState = sessionRecoveryService.prepareSafeResumptionState(stateWithLiveTriggers);

    expect(safeState.ambientPlaying).toBe(false);
    expect(safeState.shakeTrigger).toBe(0);
    expect(safeState.lightningTrigger).toBe(0);
    expect(safeState.lastSfx).toBeNull();
    expect(safeState.sceneName).toBe('El Bosque Susurrante');
    expect(safeState.combatState.round).toBe(3);
  });
});
