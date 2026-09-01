import Peer, { type DataConnection } from 'peerjs';
import type { ConnectionStatus, SyncMessage } from '../types';
import type {
  AckPayload,
  SyncMessageType,
  VersionedSyncMessage,
} from '../domain/protocol/types';
import {
  createVersionedMessage,
  validateIncomingMessage,
  MessageDeduplicator,
  SequenceTracker,
} from '../domain/protocol/protocolEngine';
import { ReliableDeliveryQueue } from '../domain/protocol/reliableQueue';
import { type ChaosConfig, DEFAULT_CHAOS_CONFIG } from '../domain/protocol/transport';
import { getIceConfiguration } from './iceConfig';
import { iceTelemetry, type IceTelemetrySnapshot } from './iceTelemetry';

export type MessageHandler = (msg: SyncMessage | VersionedSyncMessage) => void;
export type StatusHandler = (status: ConnectionStatus, peerId?: string, latencyMs?: number) => void;

class PeerService {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private messageListeners: Set<MessageHandler> = new Set();
  private statusListeners: Set<StatusHandler> = new Set();
  private status: ConnectionStatus = 'disconnected';
  private currentRoomId: string = '';
  private isDisplayRole: boolean = false;
  private pingInterval: number | null = null;
  private lastPingSentAt: number = 0;
  private latencyMs: number = 0;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  // WebRTC ICE / TURN Configuration
  private forceRelayOnly: boolean = false;

  // Protocol v1 Components
  private deduplicator: MessageDeduplicator = new MessageDeduplicator(100);
  private sequenceTracker: SequenceTracker = new SequenceTracker();
  private reliableQueue: ReliableDeliveryQueue;

  // Dev Chaos Simulation Config
  private chaosConfig: ChaosConfig = { ...DEFAULT_CHAOS_CONFIG };

  constructor() {
    this.reliableQueue = new ReliableDeliveryQueue((msg) => this.sendRaw(msg));
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getRoomId(): string {
    return this.currentRoomId;
  }

  public getLatency(): number {
    return this.latencyMs;
  }

  public onMessage(handler: MessageHandler): () => void {
    this.messageListeners.add(handler);
    return () => this.messageListeners.delete(handler);
  }

  public onStatusChange(handler: StatusHandler): () => void {
    this.statusListeners.add(handler);
    handler(this.status, this.currentRoomId, this.latencyMs);
    return () => this.statusListeners.delete(handler);
  }

  private notifyStatus(status: ConnectionStatus, peerId?: string) {
    this.status = status;
    this.statusListeners.forEach((fn) => fn(status, peerId || this.currentRoomId, this.latencyMs));
  }

  private notifyMessage(msg: SyncMessage | VersionedSyncMessage) {
    this.messageListeners.forEach((fn) => fn(msg));
  }

  public generateRoomCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'VP-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  public getFullPeerId(code: string): string {
    return `visual-player-${code.toUpperCase().trim()}`;
  }

  // Initialize DISPLAY mode (Tablet / Screen)
  public async initDisplay(customCode?: string): Promise<string> {
    this.destroy();
    this.isDisplayRole = true;
    const roomCode = customCode || this.generateRoomCode();
    this.currentRoomId = roomCode;
    const fullPeerId = this.getFullPeerId(roomCode);

    this.notifyStatus('connecting');
    const iceConfig = await getIceConfiguration({ forceRelay: this.forceRelayOnly });

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(fullPeerId, {
          debug: 1,
          config: iceConfig,
        });

        this.peer.on('open', (id) => {
          console.log('[PeerDisplay] Ready with ID:', id);
          this.reconnectAttempts = 0;
          this.notifyStatus('disconnected');
          resolve(this.currentRoomId);
        });

        this.peer.on('connection', (conn) => {
          console.log('[PeerDisplay] Incoming connection from Master:', conn.peer);
          this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.error('[PeerDisplay] Peer error:', err);
          if (err.type === 'unavailable-id') {
            const newCode = this.generateRoomCode();
            this.initDisplay(newCode).then(resolve).catch(reject);
          } else {
            this.notifyStatus('error');
            this.scheduleReconnect(() => this.initDisplay(roomCode));
          }
        });

        this.peer.on('disconnected', () => {
          console.warn('[PeerDisplay] Disconnected from signaling server, reconnecting...');
          this.peer?.reconnect();
        });
      } catch (err) {
        this.notifyStatus('error');
        reject(err);
      }
    });
  }

  private handleIncomingConnection(conn: DataConnection) {
    const existing = this.connections.get(conn.peer);
    if (existing) {
      existing.close();
    }

    this.connections.set(conn.peer, conn);

    conn.on('open', () => {
      console.log('[PeerDisplay] Master connected:', conn.peer);
      this.notifyStatus('connected');
      if ((conn as unknown as { peerConnection?: RTCPeerConnection }).peerConnection) {
        iceTelemetry.attach((conn as unknown as { peerConnection: RTCPeerConnection }).peerConnection);
      }
      this.send({ type: 'REQUEST_FULL_STATE' as SyncMessageType });
    });

    conn.on('data', (data) => {
      this.processIncomingData(data, conn);
    });

    conn.on('close', () => {
      console.log('[PeerDisplay] Master connection closed:', conn.peer);
      this.connections.delete(conn.peer);
      if (this.connections.size === 0) {
        this.notifyStatus('disconnected');
      }
    });

    conn.on('error', (err) => {
      console.error('[PeerDisplay] Connection error:', err);
    });
  }

  // Initialize MASTER mode (Cell Phone / DM Remote)
  public async connectAsMaster(roomCode: string): Promise<boolean> {
    this.destroy();
    this.isDisplayRole = false;
    this.currentRoomId = roomCode.toUpperCase().trim();
    const targetPeerId = this.getFullPeerId(this.currentRoomId);

    this.notifyStatus('connecting');
    const iceConfig = await getIceConfiguration({ forceRelay: this.forceRelayOnly });

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer({
          debug: 1,
          config: iceConfig,
        });

        this.peer.on('open', (id) => {
          console.log('[PeerMaster] Opened with ID:', id, 'Connecting to Display:', targetPeerId);
          this.establishConnectionToDisplay(targetPeerId, resolve, reject);
        });

        this.peer.on('error', (err) => {
          console.error('[PeerMaster] Peer error:', err);
          this.notifyStatus('error');
          this.scheduleReconnect(() => this.connectAsMaster(roomCode));
        });

        this.peer.on('disconnected', () => {
          console.warn('[PeerMaster] Disconnected from signaling server, reconnecting...');
          this.peer?.reconnect();
        });
      } catch (err) {
        this.notifyStatus('error');
        reject(err);
      }
    });
  }

  private establishConnectionToDisplay(
    targetPeerId: string,
    resolve?: (value: boolean) => void,
    reject?: (reason?: unknown) => void
  ) {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    const conn = this.peer!.connect(targetPeerId, {
      reliable: true,
    });

    this.connection = conn;

    conn.on('open', () => {
      console.log('[PeerMaster] Connected to Display successfully!');
      this.reconnectAttempts = 0;
      this.notifyStatus('connected');
      if ((conn as unknown as { peerConnection?: RTCPeerConnection }).peerConnection) {
        iceTelemetry.attach((conn as unknown as { peerConnection: RTCPeerConnection }).peerConnection);
      }
      this.startHeartbeat();
      if (resolve) resolve(true);
    });

    conn.on('data', (data) => {
      this.processIncomingData(data, conn);
    });

    conn.on('close', () => {
      console.warn('[PeerMaster] Connection to Display closed');
      this.notifyStatus('disconnected');
      this.stopHeartbeat();
      this.scheduleReconnect(() => this.establishConnectionToDisplay(targetPeerId));
    });

    conn.on('error', (err) => {
      console.error('[PeerMaster] Connection error:', err);
      this.notifyStatus('error');
      if (reject) reject(err);
    });
  }

  /**
   * Process raw data using the Versioned Protocol v1 pipeline.
   */
  private processIncomingData(raw: unknown, conn: DataConnection) {
    const validation = validateIncomingMessage(raw);
    if (!validation.isValid || !validation.message) {
      console.warn('[PeerProtocol] Rejected malformed message:', raw, validation.error);
      return;
    }

    const msg = validation.message;

    // Heartbeat PING / PONG handling
    if (msg.type === 'PING') {
      const pongMsg = createVersionedMessage('PONG', msg.payload);
      conn.send(pongMsg);
      return;
    }
    if (msg.type === 'PONG') {
      const sentTime = typeof msg.payload === 'object' && msg.payload && 'timestamp' in msg.payload
        ? (msg.payload as { timestamp: number }).timestamp
        : msg.sentAt;
      this.latencyMs = Math.max(1, Math.round((Date.now() - sentTime) / 2));
      this.notifyStatus(this.status);
      return;
    }

    // Handle ACK receipt
    if (msg.type === 'ACK_MESSAGE') {
      this.reliableQueue.handleAck(msg.payload as AckPayload);
      return;
    }

    // Auto-respond with ACK if requested (Critical messages)
    if (msg.requiresAck) {
      const ackMsg = createVersionedMessage('ACK_MESSAGE', {
        ackMessageId: msg.messageId,
        receivedSequence: msg.sequenceNumber,
      });
      conn.send(ackMsg);
    }

    // Tier 1: Deduplication for Critical messages
    if (msg.tier === 'critical') {
      if (!this.deduplicator.shouldProcess(msg.messageId)) {
        console.log('[PeerProtocol] Ignored duplicate critical message:', msg.messageId);
        return;
      }
    }

    // Tier 2: Sequence check for Continuous messages
    if (msg.tier === 'continuous') {
      if (!this.sequenceTracker.isNewer(msg.type, msg.sequenceNumber)) {
        console.log('[PeerProtocol] Dropped stale continuous message sequence:', msg.sequenceNumber);
        return;
      }
    }

    // Forward validated message to application subscribers
    this.notifyMessage(msg);
  }

  private scheduleReconnect(action: () => void) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
      console.log(`[PeerService] Scheduling auto-reconnect in ${Math.round(delay)}ms (Attempt ${this.reconnectAttempts})`);
      this.reconnectTimeout = window.setTimeout(() => {
        action();
      }, delay);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      this.lastPingSentAt = Date.now();
      const ping = createVersionedMessage('PING', { timestamp: this.lastPingSentAt });
      this.sendRaw(ping);
    }, 5000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public setForceRelayOnly(force: boolean) {
    this.forceRelayOnly = force;
  }

  public getForceRelayOnly(): boolean {
    return this.forceRelayOnly;
  }

  public getIceTelemetry(): IceTelemetrySnapshot {
    return iceTelemetry.getSnapshot();
  }

  public setChaosConfig(newConfig: Partial<ChaosConfig>) {
    this.chaosConfig = { ...this.chaosConfig, ...newConfig };
  }

  public getChaosConfig(): ChaosConfig {
    return { ...this.chaosConfig };
  }

  public isChaosActive(): boolean {
    return (
      this.chaosConfig.latencyMs > 0 ||
      this.chaosConfig.packetLossRate > 0 ||
      this.chaosConfig.duplicationRate > 0 ||
      this.chaosConfig.isPartitioned
    );
  }

  public resetChaos(): void {
    this.chaosConfig = { ...DEFAULT_CHAOS_CONFIG };
  }

  /**
   * Low-level raw send to all active DataConnections, respecting dev chaos configuration.
   */
  private sendRaw(msg: VersionedSyncMessage) {
    if (this.chaosConfig.isPartitioned) {
      console.log('[PeerChaos] Dropped message due to simulated network partition:', msg.type);
      return;
    }

    if (this.chaosConfig.packetLossRate > 0 && Math.random() < this.chaosConfig.packetLossRate) {
      console.log('[PeerChaos] Dropped message due to simulated packet loss:', msg.type);
      return;
    }

    const actualDispatch = () => {
      if (this.isDisplayRole) {
        this.connections.forEach((conn) => {
          if (conn.open) {
            conn.send(msg);
          }
        });
      } else {
        if (this.connection && this.connection.open) {
          this.connection.send(msg);
        }
      }
    };

    const delay = this.chaosConfig.latencyMs;
    if (delay === 0) {
      actualDispatch();
    } else {
      setTimeout(actualDispatch, delay);
    }

    if (this.chaosConfig.duplicationRate > 0 && Math.random() < this.chaosConfig.duplicationRate) {
      setTimeout(actualDispatch, delay + 35);
    }
  }

  /**
   * High-level send wrapped with Protocol v1 envelope and reliable delivery queue.
   */
  public send(msg: SyncMessage | VersionedSyncMessage | { type: SyncMessageType; payload?: unknown }) {
    let versioned: VersionedSyncMessage;
    if ('protocolVersion' in msg && msg.protocolVersion === 1) {
      versioned = msg as VersionedSyncMessage;
    } else {
      versioned = createVersionedMessage(
        msg.type as SyncMessageType,
        'payload' in msg ? msg.payload : undefined
      );
    }

    if (versioned.tier === 'critical') {
      this.reliableQueue.sendWithAck(versioned);
    } else {
      this.sendRaw(versioned);
    }
  }

  public destroy() {
    this.stopHeartbeat();
    this.reliableQueue.clear();
    this.deduplicator.clear();
    this.sequenceTracker.reset();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.status = 'disconnected';
    this.latencyMs = 0;
  }
}

export const peerService = new PeerService();
