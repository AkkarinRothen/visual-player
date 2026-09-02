import { describe, it, expect, beforeEach, vi } from 'vitest';
import { peerService } from './peerService';
import { connectivityStateMachine } from './connectivityStateMachine';
import { connectionDiagnostics } from './connectionDiagnostics';
import type { NetworkStatusInfo } from '../platform/types';

describe('Native Android Network Observer & WebRTC Transition Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    connectionDiagnostics.clear();
    peerService.destroy();
    (peerService as any).isIntentionalDestroy = false;
    connectivityStateMachine.reset();
  });

  it('1. Immediately transitions to READ_ONLY on unvalidated network or packet loss', () => {
    // Start in ONLINE state
    connectivityStateMachine.setLeaseValid(true);
    connectivityStateMachine.dispatch({ type: 'DATA_CHANNEL_OPEN' });
    connectivityStateMachine.dispatch({ type: 'RESYNC_COMPLETED' });
    expect(connectivityStateMachine.getState()).toBe('ONLINE');

    (peerService as any).currentRoomId = 'VP-TEST';

    const lostStatus: NetworkStatusInfo = {
      connected: false,
      networkEpoch: 'net-epoch-lost-1',
      transport: 'none',
      validated: false,
      isMetered: false,
      isCaptivePortal: false,
      hasInternet: false,
    };

    peerService.handleNetworkTransition(lostStatus);

    // Immediate degradation to preserve authority without split-brain
    expect(connectivityStateMachine.getState()).toBe('RECONNECTING');
    expect(connectivityStateMachine.canMutateDisplay()).toBe(false);
  });

  it('2. Dispatches sanitized network transition event on Wi-Fi to Cellular handover', () => {
    // Set a room ID so the handler is active
    (peerService as any).currentRoomId = 'VP-TEST';

    const wifiStatus: NetworkStatusInfo = {
      connected: true,
      networkEpoch: 'net-epoch-wifi-100',
      transport: 'wifi',
      validated: true,
      isMetered: false,
      isCaptivePortal: false,
      hasInternet: true,
    };

    peerService.handleNetworkTransition(wifiStatus);

    const cellularStatus: NetworkStatusInfo = {
      connected: true,
      networkEpoch: 'net-epoch-cell-200',
      transport: 'cellular',
      validated: true,
      isMetered: true,
      isCaptivePortal: false,
      hasInternet: true,
    };

    peerService.handleNetworkTransition(cellularStatus);

    const events = connectionDiagnostics.getEvents();
    const transitionEvents = events.filter((e) => e.name === 'NETWORK_TRANSITION_RECOVERY');
    const transitionEvent = transitionEvents[transitionEvents.length - 1];

    expect(transitionEvent).toBeDefined();
    expect(transitionEvent?.details.transport).toBe('cellular');
    expect(transitionEvent?.details.epoch).toBe('net-epoch-cell-200');
    // Ensure no IP or SSID is logged
    expect(JSON.stringify(transitionEvent)).not.toContain('192.168');
    expect(JSON.stringify(transitionEvent)).not.toContain('ssid');
  });

  it('3. Ignores redundant duplicate status events with the same networkEpoch', () => {
    (peerService as any).currentRoomId = 'VP-TEST';

    const status: NetworkStatusInfo = {
      connected: true,
      networkEpoch: 'net-epoch-stable-1',
      transport: 'wifi',
      validated: true,
      isMetered: false,
      isCaptivePortal: false,
      hasInternet: true,
    };

    connectionDiagnostics.clear();
    peerService.handleNetworkTransition(status);
    peerService.handleNetworkTransition(status);
    peerService.handleNetworkTransition(status);

    const events = connectionDiagnostics.getEvents().filter((e) => e.name === 'NETWORK_TRANSITION_RECOVERY');
    expect(events.length).toBe(1);
  });
});
