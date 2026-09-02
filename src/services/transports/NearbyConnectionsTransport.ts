import { registerPlugin, Capacitor } from '@capacitor/core';
import type { ConnectionStatus, SyncMessage } from '../../types';
import type { VersionedSyncMessage } from '../../domain/protocol/types';
import type {
  ISessionTransport,
  TransportType,
  TransportMetrics,
  TransportMessageHandler,
  TransportStatusHandler,
} from '../../domain/transport/types';
import { offlineDiagnosticService } from '../offlineDiagnosticService';

export interface NearbyAuthChallengeEvent {
  endpointId: string;
  /** Exact authenticationDigits from Nearby — never log, transform, or persist */
  authenticationDigits: string;
  /** Sanitized device name (no full endpoint IDs) */
  deviceName: string;
}

export type NearbyAuthChallengeHandler = (event: NearbyAuthChallengeEvent) => void;

interface VisualPlayerNearbyPluginType {
  startAdvertising(options: { roomId: string }): Promise<{ status: string; roomId: string }>;
  startDiscovery(): Promise<{ status: string }>;
  requestConnection(options: { endpointId: string; clientName?: string }): Promise<void>;
  acceptConnection(options?: { endpointId?: string }): Promise<void>;
  rejectConnection(options: { endpointId: string }): Promise<void>;
  sendBytes(options: { message: string; endpointId?: string }): Promise<void>;
  stopAdvertising(): Promise<void>;
  stopDiscovery(): Promise<void>;
  disconnect(): Promise<void>;
  addListener(eventName: string, listenerFunc: (data: any) => void): Promise<{ remove: () => void }>;
  removeAllListeners(): Promise<void>;
}

const VisualPlayerNearby = registerPlugin<VisualPlayerNearbyPluginType>('VisualPlayerNearby');

export class NearbyConnectionsTransport implements ISessionTransport {
  private status: ConnectionStatus = 'disconnected';
  private messageListeners: Set<TransportMessageHandler> = new Set();
  private statusListeners: Set<TransportStatusHandler> = new Set();
  private authChallengeListeners: Set<NearbyAuthChallengeHandler> = new Set();
  private metrics: TransportMetrics = {
    type: 'nearby',
    latencyMs: 2,
    packetsSent: 0,
    packetsReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
  };
  private isNativeSupported = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  /** Endpoint awaiting authentication approval */
  private pendingAuthEndpointId: string | null = null;
  private connectionGeneration = 0;
  private connectionEpochPrefix = '';

  constructor() {
    if (this.isNativeSupported) {
      this.setupNativeListeners();
    }
  }

  private setupNativeListeners() {
    VisualPlayerNearby.addListener('onNearbyStatusChange', (data: { status: string; endpointId?: string }) => {
      const connStatus: ConnectionStatus = data.status === 'connected' ? 'connected' : 'disconnected';
      this.status = connStatus;
      if (connStatus === 'connected') {
        this.connectionGeneration++;
      }
      offlineDiagnosticService.record({
        type: connStatus === 'connected' ? 'HANDSHAKE_COMPLETE' : 'CONNECTION_LOST',
        transport: 'nearby',
        connectionGeneration: this.connectionGeneration,
        connectionEpochPrefix: this.connectionEpochPrefix,
        success: connStatus === 'connected',
      });
      this.statusListeners.forEach((h) => h(connStatus, data.endpointId, this.metrics.latencyMs));
    });

    VisualPlayerNearby.addListener('onNearbyMessage', (data: { message: string }) => {
      try {
        const parsed = JSON.parse(data.message);
        this.metrics.packetsReceived++;
        this.messageListeners.forEach((h) => h(parsed));
      } catch (err) {
        console.error('[NearbyTransport] Error parsing incoming nearby payload:', err);
      }
    });

    VisualPlayerNearby.addListener(
      'onConnectionInitiated',
      (data: { endpointId: string; authenticationDigits: string; deviceName?: string }) => {
        // Store pending endpoint — do NOT auto-accept
        this.pendingAuthEndpointId = data.endpointId;

        // Record to diagnostic WITHOUT the digits (security rule)
        offlineDiagnosticService.record({
          type: 'AUTH_CHALLENGE_SHOWN',
          transport: 'nearby',
          connectionGeneration: this.connectionGeneration,
          connectionEpochPrefix: this.connectionEpochPrefix,
          meta: {
            hasEndpoint: !!data.endpointId,
            digitCount: data.authenticationDigits?.length ?? 0,
          },
        });

        // Sanitize device name — never include full endpoint IDs
        const sanitizedName = (data.deviceName ?? 'Dispositivo cercano')
          .replace(/[<>"'&]/g, '')
          .slice(0, 32);

        // Emit to UI — UI decides to approve or reject
        this.authChallengeListeners.forEach((h) =>
          h({
            endpointId: data.endpointId,
            authenticationDigits: data.authenticationDigits,
            deviceName: sanitizedName,
          })
        );
      }
    );
  }

  public async initHost(roomId: string = 'VP-NEARBY-HOST'): Promise<string> {
    if (!this.isNativeSupported) {
      console.warn('[NearbyTransport] Nearby Connections is only available on native Android. Falling back to mock host.');
      this.status = 'connected';
      this.statusListeners.forEach((h) => h('connected', 'mock-nearby-host', this.metrics.latencyMs));
      return roomId;
    }

    offlineDiagnosticService.record({ type: 'ADVERTISING_STARTED', transport: 'nearby' });
    this.status = 'connecting';
    const result = await VisualPlayerNearby.startAdvertising({ roomId });
    return result.roomId || roomId;
  }

  public async connectToHost(_roomId: string, _secret?: string): Promise<void> {
    if (!this.isNativeSupported) {
      console.warn('[NearbyTransport] Nearby Connections is only available on native Android. Falling back to mock connect.');
      this.status = 'connected';
      this.statusListeners.forEach((h) => h('connected', 'mock-nearby-client', this.metrics.latencyMs));
      return;
    }

    offlineDiagnosticService.record({ type: 'DISCOVERY_STARTED', transport: 'nearby' });
    this.status = 'connecting';
    await VisualPlayerNearby.startDiscovery();
  }

  /**
   * Called by the UI after the user approves the authenticationDigits.
   * Only then does the transport call acceptConnection() on the native side.
   */
  public async approveConnection(endpointId: string): Promise<void> {
    if (this.pendingAuthEndpointId !== endpointId) {
      console.warn('[NearbyTransport] approveConnection called for unknown endpoint:', endpointId);
      return;
    }
    offlineDiagnosticService.record({
      type: 'AUTH_APPROVED',
      transport: 'nearby',
      connectionGeneration: this.connectionGeneration,
      connectionEpochPrefix: this.connectionEpochPrefix,
      success: true,
    });
    this.pendingAuthEndpointId = null;
    await VisualPlayerNearby.acceptConnection({ endpointId });
  }

  /**
   * Called by the UI after the user rejects the authenticationDigits.
   */
  public async rejectConnection(endpointId: string, reason: string = 'user_rejected'): Promise<void> {
    if (this.pendingAuthEndpointId === endpointId) {
      this.pendingAuthEndpointId = null;
    }
    offlineDiagnosticService.record({
      type: 'AUTH_REJECTED',
      transport: 'nearby',
      connectionGeneration: this.connectionGeneration,
      connectionEpochPrefix: this.connectionEpochPrefix,
      success: false,
      errorCode: reason,
    });
    await VisualPlayerNearby.rejectConnection({ endpointId });
  }

  /** Subscribe to authentication challenge events from Nearby */
  public onAuthChallenge(handler: NearbyAuthChallengeHandler): () => void {
    this.authChallengeListeners.add(handler);
    return () => this.authChallengeListeners.delete(handler);
  }

  /** Update connection epoch prefix for diagnostic recording */
  public setConnectionEpochPrefix(prefix: string): void {
    this.connectionEpochPrefix = prefix.slice(0, 8);
  }

  public send(message: SyncMessage | VersionedSyncMessage): void {
    const raw = JSON.stringify(message);
    this.metrics.packetsSent++;
    this.metrics.bytesSent += raw.length;

    if (this.isNativeSupported) {
      VisualPlayerNearby.sendBytes({ message: raw }).catch((err) => {
        console.error('[NearbyTransport] Failed to send bytes:', err);
      });
    }
  }

  public disconnect(): void {
    this.status = 'disconnected';
    if (this.isNativeSupported) {
      VisualPlayerNearby.disconnect().catch(console.warn);
    }
    this.statusListeners.forEach((h) => h('disconnected'));
  }

  public destroy(): void {
    this.disconnect();
    this.messageListeners.clear();
    this.statusListeners.clear();
    if (this.isNativeSupported) {
      VisualPlayerNearby.removeAllListeners().catch(console.warn);
    }
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
    return 'nearby';
  }

  public getMetrics(): TransportMetrics {
    return { ...this.metrics };
  }
}
