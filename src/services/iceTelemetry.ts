export type IceCandidateType = 'host' | 'srflx' | 'prflx' | 'relay' | 'unknown';

export interface IceTelemetrySnapshot {
  connectionState: RTCIceConnectionState | 'disconnected';
  gatheringState: RTCIceGatheringState | 'new';
  candidateType: IceCandidateType;
  remoteCandidateType: IceCandidateType;
  protocol: 'udp' | 'tcp' | 'unknown';
  currentRttMs: number;
  bytesSent: number;
  bytesReceived: number;
  isRelay: boolean;
  timestamp: number;
}

export const DEFAULT_ICE_TELEMETRY: IceTelemetrySnapshot = {
  connectionState: 'disconnected',
  gatheringState: 'new',
  candidateType: 'unknown',
  remoteCandidateType: 'unknown',
  protocol: 'unknown',
  currentRttMs: 0,
  bytesSent: 0,
  bytesReceived: 0,
  isRelay: false,
  timestamp: 0,
};

export class IceTelemetryTracker {
  private pc: RTCPeerConnection | null = null;
  private intervalTimer: number | null = null;
  private latestSnapshot: IceTelemetrySnapshot = { ...DEFAULT_ICE_TELEMETRY };
  private listeners: Set<(snapshot: IceTelemetrySnapshot) => void> = new Set();

  public attach(pc: RTCPeerConnection): void {
    this.detach();
    this.pc = pc;

    this.pc.oniceconnectionstatechange = () => {
      this.sampleStats();
    };

    // Low-frequency sampling every 4000ms
    this.intervalTimer = window.setInterval(() => {
      this.sampleStats();
    }, 4000);

    this.sampleStats();
  }

  public detach(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.pc = null;
    this.latestSnapshot = { ...DEFAULT_ICE_TELEMETRY };
  }

  public getSnapshot(): IceTelemetrySnapshot {
    return { ...this.latestSnapshot };
  }

  public onTelemetry(cb: (snapshot: IceTelemetrySnapshot) => void): () => void {
    this.listeners.add(cb);
    cb(this.latestSnapshot);
    return () => this.listeners.delete(cb);
  }

  public async sampleStats(): Promise<IceTelemetrySnapshot> {
    if (!this.pc) {
      return this.latestSnapshot;
    }

    try {
      const stats = await this.pc.getStats();
      let activeCandidatePair: RTCStats | null = null;

      // Find active candidate pair
      stats.forEach((report) => {
        if (
          report.type === 'candidate-pair' &&
          (report.state === 'succeeded' || report.nominated === true || report.selected === true)
        ) {
          activeCandidatePair = report;
        }
      });

      let candidateType: IceCandidateType = 'unknown';
      let remoteCandidateType: IceCandidateType = 'unknown';
      let protocol: 'udp' | 'tcp' | 'unknown' = 'unknown';
      let rttMs = 0;
      let bytesSent = 0;
      let bytesReceived = 0;

      if (activeCandidatePair) {
        const pair = activeCandidatePair as Record<string, unknown>;
        const localCandId = pair.localCandidateId as string;
        const remoteCandId = pair.remoteCandidateId as string;

        if (typeof pair.currentRoundTripTime === 'number') {
          rttMs = Math.round(pair.currentRoundTripTime * 1000);
        }
        if (typeof pair.bytesSent === 'number') bytesSent = pair.bytesSent;
        if (typeof pair.bytesReceived === 'number') bytesReceived = pair.bytesReceived;

        if (localCandId && stats.has(localCandId)) {
          const localCand = stats.get(localCandId) as Record<string, unknown>;
          candidateType = this.normalizeCandidateType(localCand.candidateType as string);
          protocol = this.normalizeProtocol(localCand.protocol as string);
        }

        if (remoteCandId && stats.has(remoteCandId)) {
          const remoteCand = stats.get(remoteCandId) as Record<string, unknown>;
          remoteCandidateType = this.normalizeCandidateType(remoteCand.candidateType as string);
        }
      }

      this.latestSnapshot = {
        connectionState: this.pc.iceConnectionState,
        gatheringState: this.pc.iceGatheringState,
        candidateType,
        remoteCandidateType,
        protocol,
        currentRttMs: rttMs,
        bytesSent,
        bytesReceived,
        isRelay: candidateType === 'relay' || remoteCandidateType === 'relay',
        timestamp: Date.now(),
      };

      this.listeners.forEach((fn) => fn(this.latestSnapshot));
    } catch (e) {
      // Ignored if connection closed during stats sampling
    }

    return this.latestSnapshot;
  }

  private normalizeCandidateType(type?: string): IceCandidateType {
    if (!type) return 'unknown';
    const lower = type.toLowerCase();
    if (lower === 'host') return 'host';
    if (lower === 'srflx') return 'srflx';
    if (lower === 'prflx') return 'prflx';
    if (lower === 'relay') return 'relay';
    return 'unknown';
  }

  private normalizeProtocol(proto?: string): 'udp' | 'tcp' | 'unknown' {
    if (!proto) return 'unknown';
    const lower = proto.toLowerCase();
    if (lower === 'udp') return 'udp';
    if (lower === 'tcp') return 'tcp';
    return 'unknown';
  }
}

export const iceTelemetry = new IceTelemetryTracker();
