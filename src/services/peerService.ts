import Peer, { type DataConnection } from 'peerjs';
import type { SyncMessage, ConnectionStatus } from '../types';

export type MessageHandler = (msg: SyncMessage) => void;
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

  private notifyMessage(msg: SyncMessage) {
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

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(fullPeerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
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
    // Close existing connection from the same peer to avoid duplicates
    const existing = this.connections.get(conn.peer);
    if (existing) {
      existing.close();
    }

    this.connections.set(conn.peer, conn);

    conn.on('open', () => {
      console.log('[PeerDisplay] Master connected:', conn.peer);
      this.notifyStatus('connected');
      // Ask Master for current state or wait for Master to broadcast
      conn.send({ type: 'REQUEST_FULL_STATE' });
    });

    conn.on('data', (data) => {
      try {
        const msg = data as SyncMessage;
        if (msg.type === 'PING') {
          conn.send({ type: 'PONG', timestamp: msg.timestamp });
          return;
        }
        if (msg.type === 'PONG') {
          this.latencyMs = Math.max(1, Math.round((Date.now() - msg.timestamp) / 2));
          this.notifyStatus(this.status);
          return;
        }
        this.notifyMessage(msg);
      } catch (err) {
        console.error('[PeerDisplay] Error processing message:', err);
      }
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

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer({
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
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
      this.startHeartbeat();
      if (resolve) resolve(true);
    });

    conn.on('data', (data) => {
      try {
        const msg = data as SyncMessage;
        if (msg.type === 'PING') {
          conn.send({ type: 'PONG', timestamp: msg.timestamp });
          return;
        }
        if (msg.type === 'PONG') {
          this.latencyMs = Math.max(1, Math.round((Date.now() - msg.timestamp) / 2));
          this.notifyStatus(this.status);
          return;
        }
        this.notifyMessage(msg);
      } catch (err) {
        console.error('[PeerMaster] Error parsing message:', err);
      }
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
      if (this.connection && this.connection.open) {
        this.lastPingSentAt = Date.now();
        this.connection.send({ type: 'PING', timestamp: this.lastPingSentAt });
      }
      if (this.isDisplayRole && this.connections.size > 0) {
        this.lastPingSentAt = Date.now();
        this.connections.forEach((c) => {
          if (c.open) {
            c.send({ type: 'PING', timestamp: this.lastPingSentAt });
          }
        });
      }
    }, 5000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public send(msg: SyncMessage) {
    if (this.isDisplayRole) {
      this.connections.forEach((conn) => {
        if (conn.open) {
          conn.send(msg);
        }
      });
    } else {
      if (this.connection && this.connection.open) {
        this.connection.send(msg);
      } else {
        console.warn('[PeerService] Cannot send message: connection is not open');
      }
    }
  }

  public destroy() {
    this.stopHeartbeat();
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
