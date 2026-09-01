import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConnectivityStateMachine,
  MAX_GRACE_PERIOD_MS,
} from './connectivityStateMachine';

describe('Connectivity & Authority State Machine (Doze / Background Resilience)', () => {
  let sm: ConnectivityStateMachine;

  beforeEach(() => {
    sm = new ConnectivityStateMachine('OFFLINE');
  });

  it('1. Executes full healthy connection lifecycle: OFFLINE -> RECONNECTING -> RESYNCING -> ONLINE', () => {
    expect(sm.getState()).toBe('OFFLINE');
    expect(sm.canMutateDisplay()).toBe(false);

    // Data channel opening initiates resync
    sm.dispatch({ type: 'DATA_CHANNEL_OPEN' });
    expect(sm.getState()).toBe('RESYNCING');

    // Lease validation confirms authority
    sm.dispatch({ type: 'LEASE_VALIDATED' });
    expect(sm.getState()).toBe('ONLINE');
    expect(sm.canMutateDisplay()).toBe(true);
  });

  it('2. Degrades to DEGRADED state on high latency (>300ms) and recovers to ONLINE when latency drops', () => {
    sm.dispatch({ type: 'DATA_CHANNEL_OPEN' });
    sm.dispatch({ type: 'LEASE_VALIDATED' });
    expect(sm.getState()).toBe('ONLINE');

    // Latency spikes to 450ms -> DEGRADED
    sm.dispatch({ type: 'LATENCY_SAMPLE', payload: { latencyMs: 450 } });
    expect(sm.getState()).toBe('DEGRADED');
    // Mutations are still allowed in degraded mode with warning
    expect(sm.canMutateDisplay()).toBe(true);

    // Latency drops to 60ms -> ONLINE
    sm.dispatch({ type: 'LATENCY_SAMPLE', payload: { latencyMs: 60 } });
    expect(sm.getState()).toBe('ONLINE');
  });

  it('3. Degrades to READ_ONLY when heartbeats are missed beyond the 15-second grace period', () => {
    sm.dispatch({ type: 'DATA_CHANNEL_OPEN' });
    sm.dispatch({ type: 'LEASE_VALIDATED' });
    expect(sm.getState()).toBe('ONLINE');

    // Missed heartbeat within grace period -> DEGRADED
    sm.dispatch({ type: 'HEARTBEAT_MISSED' });
    expect(sm.getState()).toBe('DEGRADED');

    // Advance time past 15-second grace period
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + MAX_GRACE_PERIOD_MS + 1000);

    sm.dispatch({ type: 'HEARTBEAT_MISSED' });
    expect(sm.getState()).toBe('READ_ONLY');
    expect(sm.canMutateDisplay()).toBe(false);

    vi.restoreAllMocks();
  });

  it('4. Computes deterministic exponential backoff with bounded jitter', () => {
    // Attempt 0: Base 1000ms + 0% jitter = 1000ms
    expect(sm.getReconnectDelay(0)).toBe(1000);
    // Attempt 0 with max 25% jitter = 1250ms
    expect(sm.getReconnectDelay(1)).toBe(1250);

    // Trigger 3 disconnects to increment attempt counter
    sm.dispatch({ type: 'DATA_CHANNEL_CLOSED' }); // Attempt 1: 2000ms
    sm.dispatch({ type: 'DATA_CHANNEL_CLOSED' }); // Attempt 2: 4000ms
    sm.dispatch({ type: 'DATA_CHANNEL_CLOSED' }); // Attempt 3: 8000ms

    expect(sm.getReconnectAttempts()).toBe(3);
    expect(sm.getReconnectDelay(0)).toBe(8000);
    expect(sm.getReconnectDelay(1)).toBe(10000);
  });

  it('5. Handles Android AppState lifecycle (Background suspension & Foreground resync)', () => {
    sm.dispatch({ type: 'DATA_CHANNEL_OPEN' });
    sm.dispatch({ type: 'LEASE_VALIDATED' });
    expect(sm.getState()).toBe('ONLINE');

    // App minimized into background
    sm.dispatch({ type: 'APP_BACKGROUND' });

    // Connection drops while in background / Doze
    sm.dispatch({ type: 'DATA_CHANNEL_CLOSED' });
    expect(sm.getState()).toBe('RECONNECTING');

    // User re-opens app into foreground
    sm.dispatch({ type: 'APP_FOREGROUND' });
    expect(sm.getState()).toBe('RECONNECTING');

    // Reconnection succeeds and lease re-validated
    sm.dispatch({ type: 'DATA_CHANNEL_OPEN' });
    sm.dispatch({ type: 'LEASE_VALIDATED' });
    expect(sm.getState()).toBe('ONLINE');
  });

  it('6. Blocks mutations strictly when in READ_ONLY, RECONNECTING, or OFFLINE states', () => {
    sm.dispatch({ type: 'DATA_CHANNEL_CLOSED' });
    expect(sm.getState()).toBe('RECONNECTING');
    expect(sm.canMutateDisplay()).toBe(false);

    sm.dispatch({ type: 'RETRY_EXHAUSTED' });
    expect(sm.getState()).toBe('OFFLINE');
    expect(sm.canMutateDisplay()).toBe(false);

    sm.dispatch({ type: 'DATA_CHANNEL_OPEN' });
    sm.dispatch({ type: 'LEASE_EXPIRED' });
    expect(sm.getState()).toBe('READ_ONLY');
    expect(sm.canMutateDisplay()).toBe(false);
  });
});
