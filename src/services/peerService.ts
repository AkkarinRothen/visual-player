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
import { connectionDiagnostics } from './connectionDiagnostics';
import { connectivityStateMachine } from './connectivityStateMachine';

import { getPlatformBridge } from '../platform';
import type { NetworkStatusInfo } from '../platform/types';

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

  // Anti-Storm & Single-Flight State
  private connectionGeneration: number = 0;
  private isIntentionalDestroy: boolean = false;
  private activeConnectPromise: Promise<any> | null = null;
  private unavailableIdRetries: number = 0;
  private maxUnavailableIdRetries: number = 3;

  // Native Network Transition Tracking
  private lastObservedNetworkEpoch: string = '';
  private networkDebounceTimer: number | null = null;

  // WebRTC ICE / TURN Configuration
  private forceRelayOnly: boolean = false;
  private connectionEpoch: number = Date.now();

  // Protocol v1 Components
  private deduplicator: MessageDeduplicator = new MessageDeduplicator(100);
  private sequenceTracker: SequenceTracker = new SequenceTracker();
  private reliableQueue: ReliableDeliveryQueue;

  // Dev Chaos Simulation Config
  private chaosConfig: ChaosConfig = { ...DEFAULT_CHAOS_CONFIG };

  constructor() {
    this.reliableQueue = new ReliableDeliveryQueue((msg) => this.sendRaw(msg));
    this.initNetworkObserver();
  }

  private initNetworkObserver() {
    try {
      getPlatformBridge().network.onNetworkChange((status) => {
        this.handleNetworkTransition(status);
      });
    } catch {
      // Graceful fallback if platform bridge is not yet initialized
    }
  }

  public handleNetworkTransition(status: NetworkStatusInfo) {
    if (!this.currentRoomId || this.isIntentionalDestroy) return;

    if (status.networkEpoch === this.lastObservedNetworkEpoch) return;
    this.lastObservedNetworkEpoch = status.networkEpoch;

    if (!status.connected || !status.validated) {
      console.warn(`[PeerService] Network lost or unvalidated (Transport: ${status.transport}). Transitioning to READ_ONLY.`);
      connectivityStateMachine.dispatch({ type: 'NETWORK_LOST' });
      return;
    }

    console.log(`[PeerService] Default network transition detected: ${status.transport} (Epoch: ${status.networkEpoch}). Re-establishing single-flight connection.`);
    connectionDiagnostics.logEvent('signaling', 'NETWORK_TRANSITION_RECOVERY', {
      epoch: status.networkEpoch,
      transport: status.transport,
      roomId: this.currentRoomId,
    });

    // Invalidate stale in-flight callbacks from dead network interface
    this.connectionGeneration++;

    if (this.networkDebounceTimer) {
      clearTimeout(this.networkDebounceTimer);
    }

    this.networkDebounceTimer = window.setTimeout(() => {
      if (this.isDisplayRole) {
        this.initDisplay(this.currentRoomId);
      } else {
        this.connectAsMaster(this.currentRoomId);
      }
    }, 500);
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

  public getConnectionEpoch(): number {
    return this.connectionEpoch;
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
    connectionDiagnostics.setStatus(status);
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

  /**
   * Initialize DISPLAY mode (Tablet / Screen) with single-flight and generation control.
   */
  public async initDisplay(customCode?: string): Promise<string> {
    const roomCode = customCode || this.currentRoomId || this.generateRoomCode();

    if (this.activeConnectPromise && this.isDisplayRole && this.currentRoomId === roomCode) {
      return this.activeConnectPromise;
    }

    this.destroy();
    this.isIntentionalDestroy = false;
    this.connectionGeneration++;
    const currentGen = this.connectionGeneration;

    this.isDisplayRole = true;
    this.currentRoomId = roomCode;
    this.connectionEpoch = Date.now();
    const fullPeerId = this.getFullPeerId(roomCode);

    connectionDiagnostics.initSession('display', roomCode, fullPeerId);
    this.notifyStatus('connecting');

    this.activeConnectPromise = (async () => {
      const iceConfig = await getIceConfiguration({ forceRelay: this.forceRelayOnly });

      return new Promise<string>((resolve, reject) => {
        if (currentGen !== this.connectionGeneration || this.isIntentionalDestroy) {
          return reject(new Error('Aborted by newer connection generation'));
        }

        try {
          this.peer = new Peer(fullPeerId, {
            debug: 1,
            config: iceConfig,
          });

          this.peer.on('open', (id) => {
            if (currentGen !== this.connectionGeneration || this.isIntentionalDestroy) return;
            console.log('[PeerDisplay] Ready with ID:', id);
            this.reconnectAttempts = 0;
            this.unavailableIdRetries = 0;
            this.notifyStatus('disconnected');
            connectivityStateMachine.dispatch({ type: 'DATA_CHANNEL_CLOSED' });
            resolve(this.currentRoomId);
          });

          this.peer.on('connection', (conn) => {
            if (currentGen !== this.connectionGeneration || this.isIntentionalDestroy) return;
            console.log('[PeerDisplay] Incoming connection from Master:', conn.peer);
            this.handleIncomingConnection(conn, currentGen);
          });

          this.peer.on('error', (err) => {
            if (currentGen !== this.connectionGeneration || this.isIntentionalDestroy) return;
            console.error('[PeerDisplay] Peer error:', err);
            connectionDiagnostics.logEvent('error', 'PEER_ERROR', { type: err.type, message: err.message });

            if (err.type === 'unavailable-id') {
              if (this.unavailableIdRetries < this.maxUnavailableIdRetries) {
                this.unavailableIdRetries++;
                console.log(`[PeerDisplay] Room ID busy, waiting for release (Attempt ${this.unavailableIdRetries}/${this.maxUnavailableIdRetries})...`);
                this.scheduleReconnect(() => this.initDisplay(roomCode), currentGen, 1500);
              } else {
                console.warn('[PeerDisplay] Room ID persistently busy on signaling server.');
                this.notifyStatus('error');
                connectivityStateMachine.dispatch({ type: 'NETWORK_LOST' });
                reject(err);
              }
            } else {
              this.notifyStatus('error');
              this.scheduleReconnect(() => this.initDisplay(roomCode), currentGen);
            }
          });

          this.peer.on('disconnected', () => {
            if (currentGen !== this.connectionGeneration || this.isIntentionalDestroy) return;
            console.warn('[PeerDisplay] Disconnected from signaling server, reconnecting...');
            connectionDiagnostics.logEvent('signaling', 'DISCONNECTED_SIGNALING', {});
            this.peer?.reconnect();
          });
        } catch (err) {
          this.notifyStatus('error');
          reject(err);
        }
      });
    })();

    try {
      const result = await this.activeConnectPromise;
      return result;
    } finally {
      this.activeConnectPromise = null;
    }
  }

  private handleIncomingConnection(conn: DataConnection, generation: number) {
    const existing = this.connections.get(conn.peer);
    if (existing) {
      existing.close();
    }

    this.connections.set(conn.peer, conn);

    conn.on('open', () => {
      if (generation !== this.connectionGeneration || this.isIntentionalDestroy) return;
      console.log('[PeerDisplay] Master connected:', conn.peer);
      this.notifyStatus('connected');
      connectivityStateMachine.dispatch({ type: 'DATA_CHANNEL_OPEN' });

      if ((conn as unknown as { peerConnection?: RTCPeerConnection }).peerConnection) {
        const pc = (conn as unknown as { peerConnection: RTCPeerConnection }).peerConnection;
        iceTelemetry.attach(pc);
      }
      this.send({ type: 'REQUEST_FULL_STATE' as SyncMessageType });
    });

    conn.on('data', (data) => {
      if (generation !== this.connectionGeneration || this.isIntentionalDestroy) return;
      this.processIncomingData(data, conn);
    });

    conn.on('close', () => {
      if (generation !== this.connectionGeneration || this.isIntentionalDestroy) return;
      console.log('[PeerDisplay] Master connection closed:', conn.peer);
      this.connections.delete(conn.peer);
      if (this.connections.size === 0) {
        this.notifyStatus('disconnected');
        connectivityStateMachine.dispatch({ type: 'DATA_CHANNEL_CLOSED' });
      }
    });

    conn.on('error', (err) => {
      if (generation !== this.connectionGeneration || this.isIntentionalDestroy) return;
      console.error('[PeerDisplay] Connection error:', err);
      connectionDiagnostics.logEvent('error', 'DATA_CONNECTION_ERROR', { error: String(err) });
    });
  }

  /**
   * Initialize MASTER mode (Cell Phone / DM Remote) with single-flight and generation control.
   */
  public async connectAsMaster(roomCode: string): Promise<boolean> {
    const formattedCode = roomCode.toUpperCase().trim();

    if (this.activeConnectPromise && !this.isDisplayRole && this.currentRoomId === formattedCode) {
      return this.activeConnectPromise;
    }

    this.destroy();
    this.isIntentionalDestroy = false;
    this.connectionGeneration++;
    const currentGen = this.connectionGeneration;

    this.isDisplayRole = false;
    this.currentRoomId = formattedCode;
    this.connectionEpoch = Date.now();
    const targetPeerId = this.getFullPeerId(formattedCode);

    connectionDiagnostics.initSession('master', formattedCode, targetPeerId);
    this.notifyStatus('connecting');

    this.activeConnectPromise = (async () => {
      const iceConfig = await getIceConfiguration({ forceRelay: this.forceRelayOnly });

      return new Promise<boolean>((resolve, reject) => {
        if (currentGen !== this.connectionGeneration || this.isIntentionalDestroy) {
          return reject(new Error('Aborted by newer connection generation'));
        }

        try {
          this.peer = new Peer({
            debug: 1,
            config: iceConfig,
          });

          this.peer.on('open', (id) => {
            if (currentGen !== this.connectionGeneration || this.isIntentionalDestroy) return;
            console.log('[PeerMaster] Opened with ID:', id, 'Connecting to Display:', targetPeerId);
            this.establishConnectionToDisplay(targetPeerId, currentGen, resolve, reject);
          });

          this.peer.on('error', (err) => {
            if (currentGen !== this.connectionGeneration || this.isIntentionalDestroy) return;
            console.error('[PeerMaster] Peer error:', err);
            connectionDiagnostics.logEvent('error', 'MASTER_PEER_ERROR', { type: err.type, message: err.message });
            this.notifyStatus('error');
            this.scheduleReconnect(() => this.connectAsMaster(formattedCode), currentGen);
          });

          this.peer.on('disconnected', () => {
            if (currentGen !== this.connectionGeneration || this.isIntentionalDestroy) return;
            console.warn('[PeerMaster] Disconnected from signaling server, reconnecting...');
            this.peer?.reconnect();
          });
        } catch (err) {
          this.notifyStatus('error');
          reject(err);
        }
      });
    })();

    try {
      const result = await this.activeConnectPromise;
      return result;
    } finally {
      this.activeConnectPromise = null;
    }
  }

  private establishConnectionToDisplay(
    targetPeerId: string,
    generation: number,
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
      if (generation !== this.connectionGeneration || this.isIntentionalDestroy) return;
      console.log('[PeerMaster] Connected to Display successfully!');
      this.reconnectAttempts = 0;
      this.notifyStatus('connected');
      connectivityStateMachine.dispatch({ type: 'DATA_CHANNEL_OPEN' });

      if ((conn as unknown as { peerConnection?: RTCPeerConnection }).peerConnection) {
        const pc = (conn as unknown as { peerConnection: RTCPeerConnection }).peerConnection;
        iceTelemetry.attach(pc);
      }
      this.startHeartbeat();
      if (resolve) resolve(true);
    });

    conn.on('data', (data) => {
      if (generation !== this.connectionGeneration || this.isIntentionalDestroy) return;
      this.processIncomingData(data, conn);
    });

    conn.on('close', () => {
      if (generation !== this.connectionGeneration || this.isIntentionalDestroy) return;
      console.warn('[PeerMaster] Connection to Display closed');
      this.notifyStatus('disconnected');
      connectivityStateMachine.dispatch({ type: 'DATA_CHANNEL_CLOSED' });
      this.stopHeartbeat();
      this.scheduleReconnect(() => this.establishConnectionToDisplay(targetPeerId, generation), generation);
    });

    conn.on('error', (err) => {
      if (generation !== this.connectionGeneration || this.isIntentionalDestroy) return;
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
      connectionDiagnostics.recordRtt(this.latencyMs);
      connectivityStateMachine.dispatch({ type: 'LATENCY_SAMPLE', payload: { latencyMs: this.latencyMs } });
      connectivityStateMachine.dispatch({ type: 'HEARTBEAT_ACK' });
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

  private scheduleReconnect(action: () => void, generation: number, customDelayMs?: number) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts && !this.isIntentionalDestroy) {
      this.reconnectAttempts++;
      const delay = customDelayMs !== undefined ? customDelayMs : connectivityStateMachine.getReconnectDelay();
      console.log(`[PeerService] Scheduling auto-reconnect in ${Math.round(delay)}ms (Attempt ${this.reconnectAttempts}, Gen ${generation})`);

      this.reconnectTimeout = window.setTimeout(() => {
        if (generation === this.connectionGeneration && !this.isIntentionalDestroy) {
          action();
        }
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

  /**
   * Explicit and intentional teardown, preventing orphan reconnect triggers.
   */
  public destroy() {
    this.isIntentionalDestroy = true;
    this.connectionGeneration++;
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
    this.unavailableIdRetries = 0;
  }
}

export const peerService = new PeerService();
