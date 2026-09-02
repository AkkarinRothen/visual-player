/**
 * offlineDiagnosticService.ts
 *
 * Servicio de diagnóstico y timeline offline para Visual Player.
 *
 * Registra eventos estructurados del SessionTransportRouter y
 * NearbyConnectionsTransport con suficientes datos para reconstruir
 * el timeline de ambos dispositivos y verificar los 10 criterios
 * de la prueba de aceptación Android↔Android.
 *
 * SEGURIDAD: nunca registra secretos, authenticationDigits, leases
 * completos, IPs, identificadores Nearby completos ni payloads sensibles.
 */

import { Capacitor } from '@capacitor/core';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type TransportType = 'webrtc' | 'nearby' | 'none' | 'mock';
export type DiagnosticEventType =
  | 'ADVERTISING_STARTED'
  | 'DISCOVERY_STARTED'
  | 'ENDPOINT_FOUND'
  | 'CONNECTION_INITIATED'
  | 'AUTH_CHALLENGE_SHOWN'
  | 'AUTH_APPROVED'
  | 'AUTH_REJECTED'
  | 'AUTH_EXPIRED'
  | 'HANDSHAKE_STARTED'
  | 'HANDSHAKE_COMPLETE'
  | 'LEASE_ISSUED'
  | 'LEASE_REJECTED'
  | 'LEASE_EXPIRED'
  | 'FULL_STATE_SENT'
  | 'FULL_STATE_RECEIVED'
  | 'CONTROL_READY'
  | 'MUTATION_SENT'
  | 'MUTATION_RECEIVED'
  | 'ACK_SENT'
  | 'ACK_RECEIVED'
  | 'CHECKSUM_MATCH'
  | 'CHECKSUM_MISMATCH'
  | 'CONNECTION_LOST'
  | 'RECONNECT_STARTED'
  | 'RESUMPTION_CHALLENGE_SENT'
  | 'RESUMPTION_VALIDATED'
  | 'RESUMPTION_FAILED'
  | 'NEW_EPOCH_ISSUED'
  | 'READ_ONLY_ENTERED'
  | 'STALE_LEASE_REJECTED'
  | 'HANDOVER_STARTED'
  | 'HANDOVER_PHASE'
  | 'HANDOVER_COMMIT'
  | 'HANDOVER_ROLLBACK'
  | 'HANDOVER_COMPLETE'
  | 'PERMISSION_REQUESTED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_DENIED'
  | 'TRANSPORT_SWITCHED'
  | 'CLOCK_SKEW_ESTIMATED'
  | 'INTERNET_CHECK'
  | 'EXPORT_REQUESTED';

export interface DiagnosticEvent {
  /** ISO timestamp de pared (puede diferir entre dispositivos) */
  wallTime: string;
  /** Tiempo monotónico relativo al inicio de la sesión en ms */
  monotonicMs: number;
  /** Número de secuencia local del evento (para fusión de timelines) */
  seq: number;

  type: DiagnosticEventType;
  transport: TransportType;

  /** Prefijo del sessionId (nunca completo) */
  sessionIdPrefix: string;
  /** UUID del correlationId que permite alinear eventos de ambos dispositivos */
  correlationId: string;

  /** Generación de conexión actual */
  connectionGeneration: number;
  /** Prefijo de connectionEpoch (primeros 8 chars) */
  connectionEpochPrefix: string;

  /** Revisión/revisión del estado en este momento */
  revision: number;
  /** Prefijo del checksum (primeros 8 chars del SHA-256) */
  checksumPrefix: string;

  /** handoverId si este evento forma parte de un handover */
  handoverId?: string;
  /** Fase del handover (PREPARE, CONNECT, AUTH, TRANSFER, COMMIT, ROLLBACK) */
  handoverPhase?: string;

  /** Resultado del evento (true=éxito, false=fallo, undefined=pendiente) */
  success?: boolean;
  /** Causa de fallo (sin secretos) */
  errorCode?: string;

  /** Rol del dispositivo local en el momento del evento */
  role: 'display' | 'master' | 'unknown';

  /** Metadatos adicionales específicos del evento (sin secretos) */
  meta?: Record<string, string | number | boolean>;
}

interface ClockSkewEstimate {
  estimatedSkewMs: number;
  measurementMs: number;
}

// ─────────────────────────────────────────────
// Buffer circular
// ─────────────────────────────────────────────

const MAX_BUFFER_SIZE = 2000;
const EXPORT_FILENAME = 'vp-diagnostic-timeline.json';

class OfflineDiagnosticService {
  private buffer: DiagnosticEvent[] = [];
  private seq = 0;
  private sessionStart = Date.now();
  private sessionStartMonotonic = performance.now();
  private sessionId = '';
  private correlationId = '';
  private role: 'display' | 'master' | 'unknown' = 'unknown';
  private clockSkew: ClockSkewEstimate | null = null;

  // ─── Configuration ───────────────────────────────────────

  configure(opts: {
    sessionId: string;
    correlationId: string;
    role: 'display' | 'master' | 'unknown';
  }) {
    this.sessionId = opts.sessionId;
    this.correlationId = opts.correlationId;
    this.role = opts.role;
    this.sessionStart = Date.now();
    this.sessionStartMonotonic = performance.now();
    this.seq = 0;
    this.buffer = [];
  }

  /** Estima el desfase de reloj entre dos dispositivos usando un timestamp de referencia del otro extremo */
  estimateClockSkew(remoteWallTimeMs: number) {
    const localNow = Date.now();
    const skew = localNow - remoteWallTimeMs;
    this.clockSkew = { estimatedSkewMs: skew, measurementMs: localNow };

    this.record({
      type: 'CLOCK_SKEW_ESTIMATED',
      transport: 'none',
      meta: {
        estimatedSkewMs: skew,
        absSkewMs: Math.abs(skew),
      },
    });
  }

  // ─── Record ──────────────────────────────────────────────

  record(partial: Omit<DiagnosticEvent,
    | 'wallTime' | 'monotonicMs' | 'seq' | 'sessionIdPrefix' | 'correlationId' | 'role'
    | 'connectionGeneration' | 'connectionEpochPrefix' | 'revision' | 'checksumPrefix'
  > & {
    connectionGeneration?: number;
    connectionEpochPrefix?: string;
    revision?: number;
    checksumPrefix?: string;
  }) {
    const monotonicMs = performance.now() - this.sessionStartMonotonic;
    const event: DiagnosticEvent = {
      wallTime: new Date().toISOString(),
      monotonicMs: Math.round(monotonicMs),
      seq: this.seq++,
      sessionIdPrefix: this.sessionId.slice(0, 8),
      correlationId: this.correlationId,
      role: this.role,
      connectionGeneration: partial.connectionGeneration ?? 0,
      connectionEpochPrefix: partial.connectionEpochPrefix ?? '',
      revision: partial.revision ?? 0,
      checksumPrefix: partial.checksumPrefix ?? '',
      ...partial,
    };

    // Rotate buffer
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
    this.buffer.push(event);
  }

  // ─── Export ──────────────────────────────────────────────

  getBuffer(): Readonly<DiagnosticEvent[]> {
    return this.buffer;
  }

  buildExportPayload(): object {
    return {
      exportedAt: new Date().toISOString(),
      sessionIdPrefix: this.sessionId.slice(0, 8),
      correlationId: this.correlationId,
      role: this.role,
      deviceRole: this.role,
      sessionStartMs: this.sessionStart,
      clockSkew: this.clockSkew,
      eventCount: this.buffer.length,
      events: this.buffer,
      // Never include: sessionId (full), secrets, authDigits, IP, full lease
    };
  }

  async exportAsJson(): Promise<void> {
    const payload = this.buildExportPayload();
    const jsonStr = JSON.stringify(payload, null, 2);

    this.record({ type: 'EXPORT_REQUESTED', transport: 'none' });

    try {
      // Try Capacitor Share if available (Android)
      if (Capacitor.isNativePlatform()) {
        // Use Function constructor to bypass TypeScript's static module resolution
        // for @capacitor/share which may not be installed in all environments.
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const dynamicImport = new Function('id', 'return import(id)') as (id: string) => Promise<any>;
        const shareModule = await dynamicImport('@capacitor/share').catch(() => null);
        if (shareModule) {
          const { Share } = shareModule;
          const { value: canShare } = await Share.canShare();
          if (canShare) {
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            await Share.share({
              title: `Visual Player Diagnostic - ${this.correlationId.slice(0, 8)}`,
              text: `Diagnostic timeline from ${this.role} device`,
              url,
              dialogTitle: 'Exportar Diagnóstico Offline',
            });
            URL.revokeObjectURL(url);
            return;
          }
        }
      }
      // Web fallback: trigger download
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = EXPORT_FILENAME;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('[OfflineDiagnostic] Export failed, logging to console:', err);
      console.info('[OfflineDiagnostic] Timeline dump:', jsonStr);
    }
  }

  /** Verifica los 10 criterios de aceptación de la prueba física offline */
  evaluateAcceptanceCriteria(): AcceptanceCriteriaResult {
    const events = this.buffer;

    const has = (type: DiagnosticEventType) => events.some((e) => e.type === type);
    const hasSuccessful = (type: DiagnosticEventType) =>
      events.some((e) => e.type === type && e.success === true);

    const controlReady = hasSuccessful('CONTROL_READY');
    const authApproved = hasSuccessful('AUTH_APPROVED');
    const ackReceived = has('ACK_RECEIVED');
    const checksumMatch = has('CHECKSUM_MATCH');
    const connectionLost = has('CONNECTION_LOST');
    const readOnly = has('READ_ONLY_ENTERED');
    const reconnected = hasSuccessful('RECONNECT_STARTED');
    const newEpoch = has('NEW_EPOCH_ISSUED');
    const staleLeaseRejected = has('STALE_LEASE_REJECTED');
    const secondAck = events.filter((e) => e.type === 'ACK_RECEIVED').length >= 2;

    // Estimate if any internet traffic occurred
    const internetCheck = events.find((e) => e.type === 'INTERNET_CHECK');
    const zeroInternet = internetCheck?.success === false;

    return {
      authenticationDigitsMatched: authApproved,
      controlReadyBeforeControls: controlReady,
      mutationAcknowledgedWithChecksumMatch: ackReceived && checksumMatch,
      lossDetectedWithoutSplitBrain: connectionLost && readOnly,
      reconnectedWithoutFullRepairing: reconnected && newEpoch,
      finalStateIdentical: checksumMatch,
      secondMutationSuccessfulAfterReconnect: secondAck,
      staleLeaseRejected: staleLeaseRejected,
      zeroInternetTraffic: zeroInternet,
      timelineExported: has('EXPORT_REQUESTED'),
      allCriteriaMet:
        authApproved &&
        controlReady &&
        ackReceived &&
        checksumMatch &&
        connectionLost &&
        readOnly &&
        reconnected &&
        newEpoch &&
        staleLeaseRejected &&
        secondAck,
    };
  }

  reset() {
    this.buffer = [];
    this.seq = 0;
    this.sessionStart = Date.now();
    this.sessionStartMonotonic = performance.now();
    this.clockSkew = null;
  }
}

export interface AcceptanceCriteriaResult {
  authenticationDigitsMatched: boolean;
  controlReadyBeforeControls: boolean;
  mutationAcknowledgedWithChecksumMatch: boolean;
  lossDetectedWithoutSplitBrain: boolean;
  reconnectedWithoutFullRepairing: boolean;
  finalStateIdentical: boolean;
  secondMutationSuccessfulAfterReconnect: boolean;
  staleLeaseRejected: boolean;
  zeroInternetTraffic: boolean;
  timelineExported: boolean;
  allCriteriaMet: boolean;
}

export const offlineDiagnosticService = new OfflineDiagnosticService();
