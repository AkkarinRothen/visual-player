import { useState, useEffect } from 'react';
import {
  PROTOCOL_VERSION,
  APP_CAPABILITIES,
  evaluateVersionCompatibility,
  type VersionCompatibilityResult,
} from '../../../version';
import { sessionCommandBus, type MesaTelemetryInfo } from '../../../services/sessionCommandBus';

export const useVersionTelemetry = () => {
  const [versionCompatibility, setVersionCompatibility] = useState<VersionCompatibilityResult | null>(null);

  useEffect(() => {
    const unsub = sessionCommandBus.onTelemetry((telemetry: MesaTelemetryInfo | null) => {
      if (telemetry?.lastAuditReport) {
        const report = telemetry.lastAuditReport;
        const result = evaluateVersionCompatibility({
          localRole: 'master',
          localProtocolVersion: PROTOCOL_VERSION,
          remoteProtocolVersion: report.protocolVersion ?? 1,
          localCapabilities: APP_CAPABILITIES,
          remoteCapabilities: report.capabilities ?? [],
          remoteAppVersion: report.appVersion ?? '1.0.0',
        });
        setVersionCompatibility(result);
      }
    });
    return unsub;
  }, []);

  return {
    versionCompatibility,
  };
};
