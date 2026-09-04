import { describe, it, expect } from 'vitest';
import {
  APP_VERSION,
  PROTOCOL_VERSION,
  APP_CAPABILITIES,
  evaluateVersionCompatibility,
} from '../../version';

describe('Application Versioning & Feature Compatibility Matrix Suite', () => {
  it('1. Reports compatible when protocol and all capabilities match', () => {
    const result = evaluateVersionCompatibility({
      localRole: 'master',
      localProtocolVersion: PROTOCOL_VERSION,
      remoteProtocolVersion: PROTOCOL_VERSION,
      localCapabilities: APP_CAPABILITIES,
      remoteCapabilities: [...APP_CAPABILITIES],
      remoteAppVersion: APP_VERSION,
    });

    expect(result.status).toBe('compatible');
    expect(result.missingCapabilities).toHaveLength(0);
    expect(result.isProtocolMismatch).toBe(false);
  });

  it('2. Reports compatible_with_limitations when protocol matches but Mesa lacks advanced capabilities', () => {
    const remoteCapsWithoutOcclusion = APP_CAPABILITIES.filter(
      (c) => c !== 'occlusion' && c !== 'waypoints'
    );

    const result = evaluateVersionCompatibility({
      localRole: 'master',
      localProtocolVersion: PROTOCOL_VERSION,
      remoteProtocolVersion: PROTOCOL_VERSION,
      localCapabilities: APP_CAPABILITIES,
      remoteCapabilities: remoteCapsWithoutOcclusion,
      remoteAppVersion: '1.0.0',
    });

    expect(result.status).toBe('compatible_with_limitations');
    expect(result.missingCapabilities).toContain('occlusion');
    expect(result.missingCapabilities).toContain('waypoints');
    expect(result.isProtocolMismatch).toBe(false);
    expect(result.message).toContain('compatible con limitaciones');
  });

  it('3. Reports incompatible when protocol version differs structurally', () => {
    const result = evaluateVersionCompatibility({
      localRole: 'master',
      localProtocolVersion: PROTOCOL_VERSION,
      remoteProtocolVersion: 1, // Legacy protocol
      localCapabilities: APP_CAPABILITIES,
      remoteCapabilities: [],
      remoteAppVersion: '0.9.0',
    });

    expect(result.status).toBe('incompatible');
    expect(result.isProtocolMismatch).toBe(true);
    expect(result.message).toContain('Incompatibilidad de protocolo');
  });
});
