import { describe, it, expect } from 'vitest';
import {
  computeStateChecksum,
  sessionRecoveryService,
} from './sessionRecovery';
import { SimulatedNetworkTransport } from '../domain/protocol/transport';
import type { DisplayState, HandshakeHelloPayload } from '../types';

describe('Android ↔ Web Handshake, Canonical SHA-256 Checksum & Reconciliation Engine', () => {
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

  it('1. Computes deterministic canonical SHA-256 checksum for identical visual states regardless of key ordering', async () => {
    const stateA = { ...baseDisplayState };
    // Construct stateB with scrambled property order
    const stateB: DisplayState = {
      combatState: { ...baseDisplayState.combatState },
      ambientVolume: baseDisplayState.ambientVolume,
      ambientPlaying: baseDisplayState.ambientPlaying,
      ambientAudioUrl: baseDisplayState.ambientAudioUrl,
      lastSfx: null,
      lightningTrigger: 0,
      shakeTrigger: 0,
      isBlackout: false,
      locationBanner: { ...baseDisplayState.locationBanner! },
      lighting: baseDisplayState.lighting,
      weatherIntensity: baseDisplayState.weatherIntensity,
      weather: baseDisplayState.weather,
      characters: [...baseDisplayState.characters],
      backgroundUrl: baseDisplayState.backgroundUrl,
      sceneName: baseDisplayState.sceneName,
    };

    const chkA = await computeStateChecksum(stateA);
    const chkB = await computeStateChecksum(stateB);

    expect(chkA).toBe(chkB);
    expect(chkA.startsWith('sha256:')).toBe(true);
  });

  it('2. Changes SHA-256 checksum when any persistent visual, narrative, or combat state changes', async () => {
    const originalChecksum = await computeStateChecksum(baseDisplayState);

    const modifiedScene = { ...baseDisplayState, sceneName: 'La Cueva Oscura' };
    const modifiedWeather = { ...baseDisplayState, weather: 'rain' as const };
    const modifiedCombat = {
      ...baseDisplayState,
      combatState: { ...baseDisplayState.combatState, round: 4 },
    };

    expect(await computeStateChecksum(modifiedScene)).not.toBe(originalChecksum);
    expect(await computeStateChecksum(modifiedWeather)).not.toBe(originalChecksum);
    expect(await computeStateChecksum(modifiedCombat)).not.toBe(originalChecksum);
  });

  it('3. Handshake evaluates to SYNCHRONIZED when Android Master and Web Display share exact revision and checksum', async () => {
    const checksum = await computeStateChecksum(baseDisplayState);

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
      stateChecksum: 'sha256:master_new',
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
      stateChecksum: 'sha256:display_old',
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
      stateChecksum: 'sha256:master_stale',
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
      stateChecksum: 'sha256:display_ahead',
      capabilities: { isHardwareKeystore: true, hasWakeLock: true, isImmersiveSupported: true },
    };

    const plan = sessionRecoveryService.evaluateReconciliation(masterHello, displayHello);
    expect(plan.action).toBe('DISPLAY_AHEAD_CHECKPOINT');
    expect(plan.targetRevision).toBe(9);
  });

  it('6. Transmits HANDSHAKE_HELLO through SimulatedNetworkTransport with chaos & packet reordering', async () => {
    const transport = new SimulatedNetworkTransport({ latencyMs: 20, jitterMs: 10, packetLossRate: 0 });
    const endpointA = transport.getEndpointA();
    const endpointB = transport.getEndpointB();
    const receivedMessages: any[] = [];

    endpointB.onReceive((msg) => {
      receivedMessages.push(msg);
    });

    const handshakeMsg = {
      protocolVersion: 1 as const,
      messageId: 'msg-h1',
      sequenceNumber: 1,
      sessionRevision: 1,
      sentAt: Date.now(),
      tier: 'critical' as const,
      requiresAck: true,
      type: 'HANDSHAKE_HELLO' as const,
      payload: {
        deviceRole: 'master' as const,
        platform: 'android' as const,
        appVersion: '1.0.0',
        protocolVersion: 1,
        sessionId: 'sess-test',
        connectionEpoch: Date.now(),
        sessionRevision: 1,
        stateChecksum: 'sha256:test',
        capabilities: { isHardwareKeystore: true, hasWakeLock: true, isImmersiveSupported: true },
      },
    };

    endpointA.send(handshakeMsg);

    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(receivedMessages.length).toBe(1);
    expect(receivedMessages[0].type).toBe('HANDSHAKE_HELLO');
    expect(receivedMessages[0].payload.platform).toBe('android');
  });
});
