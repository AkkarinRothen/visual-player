import Peer, { type DataConnection } from 'peerjs';
import type { SyncMessage, ConnectionStatus } from '../types';

export type MessageHandler = (msg: SyncMessage) => void;
export type StatusHandler = (status: ConnectionStatus, peerId?: string) => void;

class PeerService {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private connections: Map<string, DataConnection> = new Map(); // Display can support multiple connections if needed
  private messageListeners: Set<MessageHandler> = new Set();
  private statusListeners: Set<StatusHandler> = new Set();
  private status: ConnectionStatus = 'disconnected';
  private currentRoomId: string = '';
  private isDisplayRole: boolean = false;
  private pingInterval: number | null = null;

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getRoomId(): string {
    return this.currentRoomId;
  }

  public onMessage(handler: MessageHandler): () => void {
    this.messageListeners.add(handler);
    return () => this.messageListeners.delete(handler);
  }

  public onStatusChange(handler: StatusHandler): () => void {
    this.statusListeners.add(handler);
    handler(this.status, this.currentRoomId);
    return () => this.statusListeners.delete(handler);
  }

  private notifyStatus(status: ConnectionStatus, peerId?: string) {
    this.status = status;
    this.statusListeners.forEach((fn) => fn(status, peerId || this.currentRoomId));
  }

  private notifyMessage(msg: SyncMessage) {
    this.messageListeners.forEach((fn) => fn(msg));
  }

  // Generate clean 4-character room code (e.g. "VP-4821")
  public generateRoomCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'VP-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Format full Peer ID to avoid collision on public PeerJS broker
  public getFullPeerId(code: string): string {
    return `visual-player-${code.toUpperCase().trim()}`;
  }

  // Initialize DISPLAY mode (Tablet)
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
          console.log('[PeerDisplay] Opened with ID:', id);
          this.notifyStatus('disconnected'); // Open and ready for incoming master connection
          resolve(this.currentRoomId);
        });

        this.peer.on('connection', (conn) => {
          console.log('[PeerDisplay] Incoming connection from Master:', conn.peer);
          this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.error('[PeerDisplay] Peer error:', err);
          if (err.type === 'unavailable-id') {
            // Retry with another code if conflict
            const newCode = this.generateRoomCode();
            this.initDisplay(newCode).then(resolve).catch(reject);
          } else {
            this.notifyStatus('error');
            reject(err);
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
    this.connections.set(conn.peer, conn);

    conn.on('open', () => {
      console.log('[PeerDisplay] Master connection established:', conn.peer);
      this.notifyStatus('connected');
    });

    conn.on('data', (data) => {
      try {
        const msg = data as SyncMessage;
        if (msg.type === 'PING') {
          conn.send({ type: 'PONG', timestamp: Date.now() });
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

  // Initialize MASTER mode (Cell Phone / Controller)
  public async connectAsMaster(roomCode: string): Promise<boolean> {
    this.destroy();
    this.isDisplayRole = false;
    this.currentRoomId = roomCode.toUpperCase().trim();
    const targetPeerId = this.getFullPeerId(this.currentRoomId);

    this.notifyStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        // Random ID for master
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
          console.log('[PeerMaster] Opened with ID:', id, 'Connecting to:', targetPeerId);
          const conn = this.peer!.connect(targetPeerId, {
            reliable: true,
          });

          this.connection = conn;

          conn.on('open', () => {
            console.log('[PeerMaster] Successfully connected to Display!');
            this.notifyStatus('connected');
            this.startHeartbeat();
            resolve(true);
          });

          conn.on('data', (data) => {
            try {
              const msg = data as SyncMessage;
              this.notifyMessage(msg);
            } catch (err) {
              console.error('[PeerMaster] Error parsing message:', err);
            }
          });

          conn.on('close', () => {
            console.warn('[PeerMaster] Connection to Display closed');
            this.notifyStatus('disconnected');
            this.stopHeartbeat();
          });

          conn.on('error', (err) => {
            console.error('[PeerMaster] Connection error:', err);
            this.notifyStatus('error');
          });
        });

        this.peer.on('error', (err) => {
          console.error('[PeerMaster] Peer error:', err);
          this.notifyStatus('error');
          reject(err);
        });
      } catch (err) {
        this.notifyStatus('error');
        reject(err);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (this.connection && this.connection.open) {
        this.connection.send({ type: 'PING', timestamp: Date.now() });
      }
    }, 10000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Send message from Master to Display (or vice-versa)
  public send(msg: SyncMessage) {
    if (this.isDisplayRole) {
      // Broadcast to all connected masters/controllers
      this.connections.forEach((conn) => {
        if (conn.open) {
          conn.send(msg);
        }
      });
    } else {
      // Send from Master to Display
      if (this.connection && this.connection.open) {
        this.connection.send(msg);
      } else {
        console.warn('[PeerService] Cannot send message, connection is not open');
      }
    }
  }

  public destroy() {
    this.stopHeartbeat();
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
  }
}

export const peerService = new PeerService();
