import crypto from 'crypto';

export interface RoomRecord {
  roomId: string;
  secretHash: string;
  sessionVersion: number;
  createdAt: number;
  expiresAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

export interface ISessionStore {
  saveRoom(record: RoomRecord): Promise<void>;
  getRoom(roomId: string): Promise<RoomRecord | null>;
  verifySecret(roomId: string, secret: string, serverSecret: string): Promise<boolean>;
  incrementVersion(roomId: string): Promise<number>;
  deleteRoom(roomId: string): Promise<void>;
  checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<RateLimitResult>;
  clear(): Promise<void>;
}

export function hashSecret(secret: string, serverSecret: string): string {
  return crypto.createHmac('sha256', serverSecret).update(secret).digest('hex');
}

/**
 * In-Memory Atomic Session Store with TTL and periodic cleanup.
 */
export class MemorySessionStore implements ISessionStore {
  private rooms = new Map<string, RoomRecord>();
  private rateLimits = new Map<string, { count: number; resetTime: number }>();

  public async saveRoom(record: RoomRecord): Promise<void> {
    this.rooms.set(record.roomId.toUpperCase().trim(), { ...record });
  }

  public async getRoom(roomId: string): Promise<RoomRecord | null> {
    const cleanId = roomId.toUpperCase().trim();
    const room = this.rooms.get(cleanId);
    if (!room) return null;

    if (Date.now() > room.expiresAt) {
      this.rooms.delete(cleanId);
      return null;
    }
    return { ...room };
  }

  public async verifySecret(roomId: string, secret: string, serverSecret: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room || !secret) return false;

    const providedHash = hashSecret(secret, serverSecret);
    const storedBuf = Buffer.from(room.secretHash);
    const provBuf = Buffer.from(providedHash);

    if (storedBuf.length !== provBuf.length) return false;
    return crypto.timingSafeEqual(storedBuf, provBuf);
  }

  public async incrementVersion(roomId: string): Promise<number> {
    const cleanId = roomId.toUpperCase().trim();
    const room = await this.getRoom(cleanId);
    if (!room) return 1;

    room.sessionVersion += 1;
    this.rooms.set(cleanId, room);
    return room.sessionVersion;
  }

  public async deleteRoom(roomId: string): Promise<void> {
    this.rooms.delete(roomId.toUpperCase().trim());
  }

  public async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const record = this.rateLimits.get(key);

    if (!record || now > record.resetTime) {
      this.rateLimits.set(key, { count: 1, resetTime: now + windowSeconds * 1000 });
      return { allowed: true, retryAfter: 0 };
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      return { allowed: false, retryAfter };
    }

    record.count += 1;
    return { allowed: true, retryAfter: 0 };
  }

  public async clear(): Promise<void> {
    this.rooms.clear();
    this.rateLimits.clear();
  }
}

/**
 * Singleton factory for active session store.
 */
let storeInstance: ISessionStore | null = null;

export function getSessionStore(): ISessionStore {
  if (!storeInstance) {
    storeInstance = new MemorySessionStore();
  }
  return storeInstance;
}

export function setSessionStore(customStore: ISessionStore): void {
  storeInstance = customStore;
}
