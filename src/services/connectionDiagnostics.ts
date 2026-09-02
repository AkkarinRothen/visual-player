export type DiagnosticCategory =
  | 'signaling'
  | 'ice'
  | 'datachannel'
  | 'handshake'
  | 'lease'
  | 'mutation'
  | 'sync_test'
  | 'error';

export interface DiagnosticEvent {
  id: string;
  timestamp: string;
  category: DiagnosticCategory;
  name: string;
  details: Record<string, unknown>;
}

export interface ConnectionMetrics {
  correlationId: string;
  roomCode: string;
  role: 'master' | 'display' | 'unknown';
  status: string;
  peerIdPartial: string;
  iceCandidateType: 'host' | 'srflx' | 'relay' | 'unknown';
  rttMs: number;
  sessionRevision: number;
  stateChecksumPrefix: string;
  activeLeaseId: string;
  disconnectReason?: string;
  lastEventTime?: string;
}

const MAX_EVENT_BUFFER = 50;

/**
 * Sanitizes potentially sensitive details (IP addresses, auth tokens, raw SDP)
 */
function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    const lower = key.toLowerCase();
    if (lower.includes('token') || lower.includes('secret') || lower.includes('sdp') || lower.includes('password')) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
      // Mask IP address (e.g. 192.168.1.50 -> 192.168.***.***)
      const parts = value.split('.');
      sanitized[key] = `${parts[0]}.${parts[1]}.***.***`;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export class ConnectionDiagnosticsService {
  private correlationId: string = `corr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  private roomCode: string = '';
  private role: 'master' | 'display' | 'unknown' = 'unknown';
  private status: string = 'OFFLINE';
  private peerIdPartial: string = '';
  private iceCandidateType: 'host' | 'srflx' | 'relay' | 'unknown' = 'unknown';
  private rttMs: number = 0;
  private sessionRevision: number = 1;
  private stateChecksumPrefix: string = 'none';
  private activeLeaseId: string = '';
  private disconnectReason?: string;
  private events: DiagnosticEvent[] = [];

  constructor() {
    this.logEvent('signaling', 'INITIALIZE', { correlationId: this.correlationId });
  }

  public initSession(role: 'master' | 'display', roomCode: string, peerId?: string): void {
    this.role = role;
    this.roomCode = roomCode;
    if (peerId) {
      this.peerIdPartial = peerId.slice(0, 16) + '...';
    }
    this.logEvent('signaling', 'SESSION_INIT', { role, roomCode, peerId: this.peerIdPartial });
  }

  public setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  public getCorrelationId(): string {
    return this.correlationId;
  }

  public setStatus(status: string, reason?: string): void {
    this.status = status;
    if (reason) this.disconnectReason = reason;
    this.logEvent('datachannel', 'STATUS_CHANGE', { status, reason });
  }

  public recordIceCandidate(candidateType: 'host' | 'srflx' | 'relay'): void {
    this.iceCandidateType = candidateType;
    this.logEvent('ice', 'CANDIDATE_SELECTED', { candidateType });
  }

  public recordRtt(rttMs: number): void {
    this.rttMs = rttMs;
  }

  public recordState(sessionRevision: number, checksum: string): void {
    this.sessionRevision = sessionRevision;
    this.stateChecksumPrefix = checksum.slice(0, 16);
  }

  public recordLease(leaseId: string): void {
    this.activeLeaseId = leaseId;
    this.logEvent('lease', 'LEASE_RECORDED', { leaseId });
  }

  public logEvent(
    category: DiagnosticCategory,
    name: string,
    details: Record<string, unknown> = {}
  ): void {
    const event: DiagnosticEvent = {
      id: `diag_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      category,
      name,
      details: sanitizeDetails(details),
    };

    this.events.push(event);
    if (this.events.length > MAX_EVENT_BUFFER) {
      this.events.shift();
    }
  }

  public getMetrics(): ConnectionMetrics {
    return {
      correlationId: this.correlationId,
      roomCode: this.roomCode,
      role: this.role,
      status: this.status,
      peerIdPartial: this.peerIdPartial,
      iceCandidateType: this.iceCandidateType,
      rttMs: this.rttMs,
      sessionRevision: this.sessionRevision,
      stateChecksumPrefix: this.stateChecksumPrefix,
      activeLeaseId: this.activeLeaseId,
      disconnectReason: this.disconnectReason,
      lastEventTime: this.events[this.events.length - 1]?.timestamp,
    };
  }

  public getEvents(): DiagnosticEvent[] {
    return [...this.events];
  }

  /**
   * Generates formatted, sanitized diagnostic report for copy/paste debugging.
   */
  public getSanitizedReport(): string {
    const metrics = this.getMetrics();
    const lines = [
      '=== VISUAL PLAYER - REPORTE DE CONEXIÓN Y SINCRONIZACIÓN ===',
      `Timestamp: ${new Date().toISOString()}`,
      `Correlation ID: ${metrics.correlationId}`,
      `Rol: ${metrics.role.toUpperCase()}`,
      `Sala: ${metrics.roomCode || 'N/A'}`,
      `Estado Conectividad: ${metrics.status}`,
      `Peer ID Parcial: ${metrics.peerIdPartial || 'N/A'}`,
      `Tipo Candidato ICE: ${metrics.iceCandidateType}`,
      `Latencia RTT: ${metrics.rttMs} ms`,
      `Revisión Protocolo: #${metrics.sessionRevision}`,
      `Checksum SHA-256: ${metrics.stateChecksumPrefix}...`,
      `Lease Activo: ${metrics.activeLeaseId || 'N/A'}`,
      metrics.disconnectReason ? `Motivo Desconexión: ${metrics.disconnectReason}` : '',
      '',
      '--- TIMELINE RECIENTE DE EVENTOS ---',
      ...this.events.slice(-15).map((e) => `[${e.timestamp.slice(11, 19)}] [${e.category.toUpperCase()}] ${e.name} ${JSON.stringify(e.details)}`),
      '==========================================================',
    ].filter(Boolean);

    return lines.join('\n');
  }

  public clear(): void {
    this.events = [];
    this.logEvent('signaling', 'CLEARED', {});
  }
}

export const connectionDiagnostics = new ConnectionDiagnosticsService();
