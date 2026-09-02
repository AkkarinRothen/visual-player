import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionTransportRouter } from '../../services/transports/SessionTransportRouter';
import { MockSessionTransport } from '../../services/transports/MockSessionTransport';
import { connectivityStateMachine } from '../../services/connectivityStateMachine';
import { connectionDiagnostics } from '../../services/connectionDiagnostics';

describe('Hybrid SessionTransport & Router Architecture Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    connectionDiagnostics.clear();
    connectivityStateMachine.reset();
  });

  it('1. Initializes host, routes messages and tracks status via active transport', async () => {
    const transport = new MockSessionTransport();
    const router = new SessionTransportRouter(transport);

    const receivedMessages: any[] = [];
    const receivedStatuses: string[] = [];

    router.onMessage((msg) => receivedMessages.push(msg));
    router.onStatusChange((status) => receivedStatuses.push(status));

    const roomCode = await router.initHost('VP-HYBRID-1');
    expect(roomCode).toBe('VP-HYBRID-1');
    expect(router.getStatus()).toBe('connected');

    const testMsg = { type: 'SET_SCENE', payload: { name: 'Cueva Oscura' } } as any;
    transport.receiveMessage(testMsg);

    expect(receivedMessages.length).toBe(1);
    expect(receivedMessages[0].payload.name).toBe('Cueva Oscura');

    router.send(testMsg);
    expect(transport.getSentMessages().length).toBe(1);
  });

  it('2. Performs transactional transport handover safely', async () => {
    const transport1 = new MockSessionTransport('webrtc');
    const transport2 = new MockSessionTransport('nearby');
    const router = new SessionTransportRouter(transport1);

    await router.initHost('VP-ROOM-99');
    expect(router.getTransportType()).toBe('webrtc');

    // Switch transport
    const switchSuccess = await router.switchTransport(transport2);
    expect(switchSuccess).toBe(true);
    expect(router.getTransportType()).toBe('nearby');

    const events = connectionDiagnostics.getEvents();
    expect(events.some((e) => e.name === 'TRANSPORT_HANDOVER_START')).toBe(true);
    expect(events.some((e) => e.name === 'TRANSPORT_HANDOVER_SUCCESS')).toBe(true);
  });

  it('3. Rolls back gracefully if secondary transport fails to connect', async () => {
    const transport1 = new MockSessionTransport('webrtc');
    const transport2 = new MockSessionTransport('nearby');
    // Simulate failure in transport2
    vi.spyOn(transport2, 'connectToHost').mockRejectedValueOnce(new Error('Connection timed out'));

    const router = new SessionTransportRouter(transport1);
    await router.connectToHost('VP-ROOM-FAIL');

    const switchSuccess = await router.switchTransport(transport2);
    expect(switchSuccess).toBe(false);
  });
});
