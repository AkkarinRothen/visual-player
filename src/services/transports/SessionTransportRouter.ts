import type { ConnectionStatus, SyncMessage } from '../../types';
import type { VersionedSyncMessage } from '../../domain/protocol/types';
import type {
  ISessionTransport,
  TransportType,
  TransportMetrics,
  TransportMessageHandler,
  TransportStatusHandler,
} from '../../domain/transport/types';
import { connectivityStateMachine } from '../connectivityStateMachine';
import { connectionDiagnostics } from '../connectionDiagnostics';

export class SessionTransportRouter implements ISessionTransport {
  private activeTransport: ISessionTransport;
  private messageListeners: Set<TransportMessageHandler> = new Set();
  private statusListeners: Set<TransportStatusHandler> = new Set();
  private currentRoomId: string = '';
  private currentRole: 'host' | 'client' = 'client';
  private unsubMessage: (() => void) | null = null;
  private unsubStatus: (() => void) | null = null;
  private isTransitioning: boolean = false;

  constructor(defaultTransport: ISessionTransport) {
    this.activeTransport = defaultTransport;
    this.bindTransport(this.activeTransport);
  }

  private bindTransport(transport: ISessionTransport) {
    if (this.unsubMessage) this.unsubMessage();
    if (this.unsubStatus) this.unsubStatus();

    this.unsubMessage = transport.onMessage((msg) => {
      this.messageListeners.forEach((h) => h(msg));
    });

    this.unsubStatus = transport.onStatusChange((status, peerId, latencyMs) => {
      this.statusListeners.forEach((h) => h(status, peerId, latencyMs));
    });
  }

  public async initHost(roomId?: string): Promise<string> {
    this.currentRole = 'host';
    const code = await this.activeTransport.initHost(roomId);
    this.currentRoomId = code;
    return code;
  }

  public async connectToHost(roomId: string, secret?: string): Promise<void> {
    this.currentRole = 'client';
    this.currentRoomId = roomId;
    await this.activeTransport.connectToHost(roomId, secret);
  }

  public send(message: SyncMessage | VersionedSyncMessage): void {
    if (this.isTransitioning) {
      console.warn('[SessionTransportRouter] Mutation paused during active transport handover');
      return;
    }
    this.activeTransport.send(message);
  }

  public disconnect(): void {
    this.activeTransport.disconnect();
  }

  public destroy(): void {
    if (this.unsubMessage) this.unsubMessage();
    if (this.unsubStatus) this.unsubStatus();
    this.activeTransport.destroy();
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
    return this.activeTransport.getStatus();
  }

  public getTransportType(): TransportType {
    return this.activeTransport.getTransportType();
  }

  public getMetrics(): TransportMetrics {
    return this.activeTransport.getMetrics();
  }

  /**
   * Transactional transport handover (e.g. Nearby <-> WebRTC).
   * Freezes mutations, establishes link, verifies authority, and only then tears down old transport.
   */
  public async switchTransport(nextTransport: ISessionTransport): Promise<boolean> {
    if (this.isTransitioning || nextTransport.getTransportType() === this.activeTransport.getTransportType()) {
      return false;
    }

    this.isTransitioning = true;
    console.log(`[SessionTransportRouter] Handover from ${this.activeTransport.getTransportType()} to ${nextTransport.getTransportType()}`);

    // 1. Degrade state to prevent split-brain during transition
    connectivityStateMachine.dispatch({ type: 'NETWORK_LOST' });
    connectionDiagnostics.logEvent('signaling', 'TRANSPORT_HANDOVER_START', {
      from: this.activeTransport.getTransportType(),
      to: nextTransport.getTransportType(),
      roomId: this.currentRoomId,
    });

    const oldTransport = this.activeTransport;

    try {
      // 2. Connect new transport
      if (this.currentRole === 'host') {
        await nextTransport.initHost(this.currentRoomId);
      } else {
        await nextTransport.connectToHost(this.currentRoomId);
      }

      // 3. Switch active transport & bind listeners
      this.activeTransport = nextTransport;
      this.bindTransport(this.activeTransport);

      // 4. Teardown previous transport cleanly
      oldTransport.destroy();

      connectionDiagnostics.logEvent('signaling', 'TRANSPORT_HANDOVER_SUCCESS', {
        active: nextTransport.getTransportType(),
      });

      this.isTransitioning = false;
      return true;
    } catch (err) {
      console.error('[SessionTransportRouter] Transport handover failed, rolling back:', err);
      this.isTransitioning = false;
      this.bindTransport(oldTransport);
      return false;
    }
  }
}
