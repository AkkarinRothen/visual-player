import { describe, it, expect } from 'vitest';
import { getIceConfiguration, DEFAULT_STUN_SERVERS } from './iceConfig';
import { IceTelemetryTracker } from './iceTelemetry';

describe('ICE & TURN Configuration and Telemetry Suite', () => {
  it('includes standard reliable STUN servers by default', () => {
    expect(DEFAULT_STUN_SERVERS.length).toBeGreaterThanOrEqual(2);
    const urls = DEFAULT_STUN_SERVERS.map((s) => s.urls).flat();
    expect(urls).toContain('stun:stun.l.google.com:19302');
    expect(urls).toContain('stun:stun.cloudflare.com:3478');
  });

  it('builds RTCConfiguration with iceTransportPolicy: all in default mode', async () => {
    const config = await getIceConfiguration({ forceRelay: false });
    expect(config.iceTransportPolicy).toBe('all');
    expect(config.iceServers?.length).toBeGreaterThanOrEqual(DEFAULT_STUN_SERVERS.length);
  });

  it('forces iceTransportPolicy: relay when forceRelay is enabled', async () => {
    const config = await getIceConfiguration({ forceRelay: true });
    expect(config.iceTransportPolicy).toBe('relay');
  });

  it('correctly tracks and anonymizes ICE telemetry snapshots without exposing IP addresses', () => {
    const tracker = new IceTelemetryTracker();
    const snapshot = tracker.getSnapshot();

    expect(snapshot.connectionState).toBe('disconnected');
    expect(snapshot.candidateType).toBe('unknown');
    expect(snapshot.isRelay).toBe(false);

    // Verify snapshot keys contain no IP properties
    const keys = Object.keys(snapshot);
    expect(keys).not.toContain('ip');
    expect(keys).not.toContain('address');
    expect(keys).not.toContain('port');
    expect(keys).not.toContain('sdp');
  });
});
