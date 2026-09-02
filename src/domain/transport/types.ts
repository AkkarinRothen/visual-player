import type { ConnectionStatus, SyncMessage } from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';

export type TransportType = 'webrtc' | 'nearby' | 'mock';

export interface TransportMetrics {
  type: TransportType;
  latencyMs: number;
  packetsSent: number;
  packetsReceived: number;
  bytesSent: number;
  bytesReceived: number;
  lastConnectedAt?: number;
}

export type TransportMessageHandler = (msg: SyncMessage | VersionedSyncMessage) => void;
export type TransportStatusHandler = (status: ConnectionStatus, peerId?: string, latencyMs?: number) => void;

/**
 * Common decoupled abstraction for multi-transport real-time session communication.
 */
export interface ISessionTransport {
  initHost(roomId?: string): Promise<string>;
  connectToHost(roomId: string, secret?: string): Promise<void>;
  send(message: SyncMessage | VersionedSyncMessage): void;
  disconnect(): void;
  destroy(): void;
  onMessage(handler: TransportMessageHandler): () => void;
  onStatusChange(handler: TransportStatusHandler): () => void;
  getStatus(): ConnectionStatus;
  getTransportType(): TransportType;
  getMetrics(): TransportMetrics;
}
