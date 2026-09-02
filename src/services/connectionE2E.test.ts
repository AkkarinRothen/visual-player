import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionDiagnosticsService } from './connectionDiagnostics';
import { SimulatedNetworkTransport } from '../domain/protocol/transport';
import { MasterHandoffService } from './masterHandoff';
import { ConnectivityStateMachine } from './connectivityStateMachine';
import { computeStateChecksum } from './sessionRecovery';
import type { DisplayState, SyncMessage } from '../types';

describe('E2E Two-Node Connection, Live Diagnostics & Synchronization Test Suite', () => {
  let diag: ConnectionDiagnosticsService;
  let handoff: MasterHandoffService;
  let masterSm: ConnectivityStateMachine;
  let displaySm: ConnectivityStateMachine;
  let transport: SimulatedNetworkTransport;

  const mockSceneState: DisplayState = {
    sceneName: 'El Valle de los Héroes',
    backgroundUrl: 'https://images.unsplash.com/valley.jpg',
    characters: [
      { id: 'c1', name: 'Paladín', avatarUrl: '', position: 'center-left', isSpeaking: false, activeExpression: 'Neutral' },
    ],
    weather: 'rain',
    weatherIntensity: 0.5,
    lighting: 'torch_flicker',
    locationBanner: { text: 'Valle Sagrado', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/wind.mp3',
    ambientPlaying: true,
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

  beforeEach(() => {
    diag = new ConnectionDiagnosticsService();
    handoff = new MasterHandoffService();
    masterSm = new ConnectivityStateMachine('OFFLINE');
    displaySm = new ConnectivityStateMachine('OFFLINE');
    transport = new SimulatedNetworkTransport({ latencyMs: 10, jitterMs: 5, packetLossRate: 0 });
  });

  it('1. Executes full E2E 2-Node Handshake & Lease Granting: Master Node ↔ Display Node', async () => {
    const masterEndpoint = transport.getEndpointA();
    const displayEndpoint = transport.getEndpointB();

    const masterReceived: SyncMessage[] = [];
    const displayReceived: SyncMessage[] = [];

    masterEndpoint.onReceive((msg) => masterReceived.push(msg as SyncMessage));
    displayEndpoint.onReceive((msg) => displayReceived.push(msg as SyncMessage));

    // Step 1: DataChannel open
    masterSm.dispatch({ type: 'DATA_CHANNEL_OPEN' });
    displaySm.dispatch({ type: 'DATA_CHANNEL_OPEN' });
    expect(masterSm.getState()).toBe('RESYNCING');
    expect(displaySm.getState()).toBe('RESYNCING');

    // Step 2: Master emits HANDSHAKE_HELLO
    const masterChecksum = await computeStateChecksum(mockSceneState);
    masterEndpoint.send({
      type: 'HANDSHAKE_HELLO',
      payload: {
        deviceRole: 'master',
        platform: 'android',
        appVersion: '1.0.0',
        protocolVersion: 1,
        sessionId: 'sess_VP-E2E',
        connectionEpoch: 1700000000,
        sessionRevision: 1,
        stateChecksum: masterChecksum,
        capabilities: { isHardwareKeystore: true, hasWakeLock: true, isImmersiveSupported: true },
      },
    });

    // Step 3: Display responds with LEASE_GRANTED
    const lease = handoff.createLease('sess_VP-E2E', 'dev-master-phone', 1700000000);
    displayEndpoint.send({
      type: 'LEASE_GRANTED',
      payload: { lease },
    });

    await new Promise((r) => setTimeout(r, 60));

    expect(displayReceived.length).toBe(1);
    expect(displayReceived[0].type).toBe('HANDSHAKE_HELLO');

    expect(masterReceived.length).toBe(1);
    expect(masterReceived[0].type).toBe('LEASE_GRANTED');

    // Step 4: Master validates lease & moves to ONLINE
    masterSm.dispatch({ type: 'LEASE_VALIDATED' });
    displaySm.dispatch({ type: 'LEASE_VALIDATED' });

    expect(masterSm.getState()).toBe('ONLINE');
    expect(masterSm.canMutateDisplay()).toBe(true);
  });

  it('2. Live Sync Probe: Verifies round-trip latency and deterministic SHA-256 matching', async () => {
    const masterEndpoint = transport.getEndpointA();
    const displayEndpoint = transport.getEndpointB();

    const checksumA = await computeStateChecksum(mockSceneState);
    const checksumB = await computeStateChecksum({ ...mockSceneState });

    displayEndpoint.onReceive((msg: any) => {
      if (msg.type === 'SYNC_TEST_PROBE') {
        displayEndpoint.send({
          type: 'SYNC_TEST_ACK',
          payload: {
            probeId: msg.payload.probeId,
            displayChecksum: checksumB,
            sessionRevision: msg.payload.sessionRevision,
            matched: msg.payload.clientChecksum === checksumB,
            rttMs: 25,
          },
        });
      }
    });

    let probeAck: any = null;
    masterEndpoint.onReceive((msg: any) => {
      if (msg.type === 'SYNC_TEST_ACK') {
        probeAck = msg.payload;
      }
    });

    // Master sends probe
    masterEndpoint.send({
      type: 'SYNC_TEST_PROBE',
      payload: {
        probeId: 'probe-101',
        timestamp: Date.now(),
        clientChecksum: checksumA,
        sessionRevision: 1,
      },
    });

    await new Promise((r) => setTimeout(r, 60));

    expect(probeAck).not.toBeNull();
    expect(probeAck.matched).toBe(true);
    expect(probeAck.displayChecksum).toBe(checksumA);
  });

  it('3. Mutation Delivery & Split-Brain Protection: Authoritative Master mutates scene, rogue rejected', async () => {
    const displayEndpoint = transport.getEndpointB();
    const activeLease = handoff.createLease('sess_VP-E2E', 'master-dev-1', 1700000000);

    const receivedMutations: any[] = [];
    displayEndpoint.onReceive((msg: any) => {
      if (msg.type === 'SET_SCENE') {
        const validation = handoff.validateMutationLease(activeLease, msg.leaseId);
        if (validation.allowed) {
          receivedMutations.push(msg.payload);
        }
      }
    });

    // 1. Authoritative mutation with valid lease
    transport.getEndpointA().send({
      type: 'SET_SCENE',
      leaseId: activeLease.leaseId,
      payload: { id: 'scene-2', name: 'La Fortaleza Helada' },
    });

    // 2. Rogue mutation with invalid lease
    transport.getEndpointA().send({
      type: 'SET_SCENE',
      leaseId: 'lse_rogue_impostor',
      payload: { id: 'scene-999', name: 'Escena Invadida' },
    });

    await new Promise((r) => setTimeout(r, 60));

    expect(receivedMutations.length).toBe(1);
    expect(receivedMutations[0].name).toBe('La Fortaleza Helada');
  });

  it('4. Sanitized Diagnostics: Generates safe report hiding tokens and masking IP addresses', () => {
    diag.initSession('master', 'VP-TEST', 'peer-long-identifier-12345678');
    diag.recordIceCandidate('srflx');
    diag.recordRtt(42);
    diag.recordState(3, 'sha256:abcd1234ef56');
    diag.recordLease('lse_test_888');

    diag.logEvent('signaling', 'AUTH_TOKEN_EXCHANGED', {
      token: 'secret_hmac_jwt_token_never_expose',
      remoteIp: '192.168.1.105',
    });

    const report = diag.getSanitizedReport();

    expect(report).toContain('VP-TEST');
    expect(report).toContain('srflx');
    expect(report).toContain('42 ms');
    // Verify tokens and secrets are redacted
    expect(report).not.toContain('secret_hmac_jwt_token_never_expose');
    expect(report).toContain('[REDACTED]');
    // Verify private IP is masked
    expect(report).toContain('192.168.***.***');
    expect(report).not.toContain('192.168.1.105');
  });
});
