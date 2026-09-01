export interface INetworkTransport {
  send(data: unknown): void;
  onReceive(callback: (data: unknown) => void): () => void;
  disconnect(): void;
  reconnect(): void;
}

export interface ChaosConfig {
  latencyMs: number;
  jitterMs: number;
  packetLossRate: number; // 0.0 - 1.0
  duplicationRate: number; // 0.0 - 1.0
  isPartitioned: boolean;
}

export const DEFAULT_CHAOS_CONFIG: ChaosConfig = {
  latencyMs: 0,
  jitterMs: 0,
  packetLossRate: 0,
  duplicationRate: 0,
  isPartitioned: false,
};

export class SimulatedNetworkTransport {
  private config: ChaosConfig;
  private endpointAListeners: Set<(data: unknown) => void> = new Set();
  private endpointBListeners: Set<(data: unknown) => void> = new Set();

  constructor(initialConfig: Partial<ChaosConfig> = {}) {
    this.config = { ...DEFAULT_CHAOS_CONFIG, ...initialConfig };
  }

  public setConfig(newConfig: Partial<ChaosConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): ChaosConfig {
    return { ...this.config };
  }

  public partitionNetwork(): void {
    this.config.isPartitioned = true;
  }

  public healNetwork(): void {
    this.config.isPartitioned = false;
  }

  /**
   * Returns transport endpoint for Node A (e.g. Master)
   */
  public getEndpointA(): INetworkTransport {
    return {
      send: (data: unknown) => this.transmit(data, 'A_TO_B'),
      onReceive: (cb) => {
        this.endpointAListeners.add(cb);
        return () => this.endpointAListeners.delete(cb);
      },
      disconnect: () => this.partitionNetwork(),
      reconnect: () => this.healNetwork(),
    };
  }

  /**
   * Returns transport endpoint for Node B (e.g. Tablet)
   */
  public getEndpointB(): INetworkTransport {
    return {
      send: (data: unknown) => this.transmit(data, 'B_TO_A'),
      onReceive: (cb) => {
        this.endpointBListeners.add(cb);
        return () => this.endpointBListeners.delete(cb);
      },
      disconnect: () => this.partitionNetwork(),
      reconnect: () => this.healNetwork(),
    };
  }

  private transmit(data: unknown, direction: 'A_TO_B' | 'B_TO_A'): void {
    if (this.config.isPartitioned) {
      return; // Partitioned, drop packet
    }

    // Packet Loss Check
    if (this.config.packetLossRate > 0 && Math.random() < this.config.packetLossRate) {
      return; // Dropped packet
    }

    const listeners = direction === 'A_TO_B' ? this.endpointBListeners : this.endpointAListeners;

    // Calculate Latency with Jitter
    let delay = this.config.latencyMs;
    if (this.config.jitterMs > 0) {
      delay += Math.floor((Math.random() * 2 - 1) * this.config.jitterMs);
      delay = Math.max(0, delay);
    }

    const deliver = () => {
      if (this.config.isPartitioned) return;
      listeners.forEach((fn) => {
        try {
          // Deep clone to simulate serialized network transmission
          const cloned = JSON.parse(JSON.stringify(data));
          fn(cloned);
        } catch (e) {
          fn(data);
        }
      });
    };

    if (delay === 0) {
      deliver();
    } else {
      setTimeout(deliver, delay);
    }

    // Duplication Check
    if (this.config.duplicationRate > 0 && Math.random() < this.config.duplicationRate) {
      const duplicateDelay = delay + Math.floor(Math.random() * 20) + 10;
      setTimeout(deliver, duplicateDelay);
    }
  }
}
