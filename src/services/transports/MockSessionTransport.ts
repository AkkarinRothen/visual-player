import type { ConnectionStatus, SyncMessage } from '../../types';
import type { VersionedSyncMessage } from '../../domain/protocol/types';
import type {
  ISessionTransport,
  TransportType,
  TransportMetrics,
  TransportMessageHandler,
  TransportStatusHandler,
} from '../../domain/transport/types';

export class MockSessionTransport implements ISessionTransport {
  private status: ConnectionStatus = 'disconnected';
  private messageListeners: Set<TransportMessageHandler> = new Set();
  private statusListeners: Set<TransportStatusHandler> = new Set();
  private sentMessages: Array<SyncMessage | VersionedSyncMessage> = [];
  private transportType: TransportType;
  private metrics: TransportMetrics;

  constructor(type: TransportType = 'mock') {
    this.transportType = type;
    this.metrics = {
      type,
      latencyMs: 5,
      packetsSent: 0,
      packetsReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
    };
  }

  public async initHost(roomId: string = 'VP-MOCK-HOST'): Promise<string> {
    this.setStatus('connected');
    return roomId;
  }

  public async connectToHost(_roomId: string, _secret?: string): Promise<void> {
    this.setStatus('connecting');
    await new Promise((r) => setTimeout(r, 10));
    this.setStatus('connected');
  }

  public send(message: SyncMessage | VersionedSyncMessage): void {
    this.sentMessages.push(message);
    this.metrics.packetsSent++;
  }

  public disconnect(): void {
    this.setStatus('disconnected');
  }

  public destroy(): void {
    this.disconnect();
    this.messageListeners.clear();
    this.statusListeners.clear();
  }

  public onMessage(handler: TransportMessageHandler): () => void {
    this.messageListeners.add(handler);
    return () => this.messageListeners.delete(handler);
  }

  public onStatusChange(handler: TransportStatusHandler): () => void {
    this.statusListeners.add(handler);
    return () => this.statusListeners.delete(handler);
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getTransportType(): TransportType {
    return this.transportType;
  }

  public getMetrics(): TransportMetrics {
    return { ...this.metrics };
  }

  public getSentMessages() {
    return [...this.sentMessages];
  }

  public receiveMessage(msg: SyncMessage | VersionedSyncMessage) {
    this.metrics.packetsReceived++;
    this.messageListeners.forEach((h) => h(msg));
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.statusListeners.forEach((h) => h(s, 'mock-peer-id', this.metrics.latencyMs));
  }
}
