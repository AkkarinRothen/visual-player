import type {
  SyncMessageType,
  VersionedSyncMessage,
  MessageTier,
} from './types';
import { getMessageTierInfo } from './types';

let sequenceCounter = 0;
let sessionRevisionCounter = 1;

export function resetSequenceCounters(): void {
  sequenceCounter = 0;
  sessionRevisionCounter = 1;
}

export function incrementSessionRevision(): number {
  return ++sessionRevisionCounter;
}

export interface CreateMessageOptions {
  tier?: MessageTier;
  requiresAck?: boolean;
  sessionRevision?: number;
  messageId?: string;
  commandId?: string;
}

/**
 * Creates a valid, protocol-versioned SyncMessage envelope.
 */
export function createVersionedMessage<T>(
  type: SyncMessageType,
  payload: T,
  options: CreateMessageOptions = {}
): VersionedSyncMessage<T> {
  const defaultInfo = getMessageTierInfo(type);
  const seq = ++sequenceCounter;
  const msgId =
    options.messageId ||
    `msg-${Date.now()}-${seq}-${Math.random().toString(36).substr(2, 6)}`;

  return {
    protocolVersion: 1,
    messageId: msgId,
    commandId: options.commandId,
    sequenceNumber: seq,
    sessionRevision: options.sessionRevision ?? sessionRevisionCounter,
    sentAt: Date.now(),
    tier: options.tier ?? defaultInfo.tier,
    requiresAck: options.requiresAck ?? defaultInfo.requiresAck,
    type,
    payload,
  };
}

export interface ValidationResult {
  isValid: boolean;
  message: VersionedSyncMessage | null;
  isLegacy?: boolean;
  error?: string;
}

/**
 * Validates incoming raw message data, converting legacy messages to v1 seamlessly.
 */
export function validateIncomingMessage(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { isValid: false, message: null, error: 'Payload must be a non-null object' };
  }

  const obj = raw as Record<string, unknown>;

  // Check if already a v1 message
  if (obj.protocolVersion === 1) {
    if (typeof obj.messageId !== 'string' || !obj.messageId) {
      return { isValid: false, message: null, error: 'Missing or invalid messageId' };
    }
    if (typeof obj.sequenceNumber !== 'number') {
      return { isValid: false, message: null, error: 'Missing or invalid sequenceNumber' };
    }
    if (typeof obj.type !== 'string' || !obj.type) {
      return { isValid: false, message: null, error: 'Missing or invalid message type' };
    }

    return {
      isValid: true,
      message: obj as unknown as VersionedSyncMessage,
      isLegacy: false,
    };
  }

  // Handle Legacy unversioned messages { type: 'FULL_STATE', payload: ... }
  if (typeof obj.type === 'string') {
    const legacyType = obj.type as SyncMessageType;
    const defaultInfo = getMessageTierInfo(legacyType);

    const legacyEnvelope: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: `legacy-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      sequenceNumber: ++sequenceCounter,
      sessionRevision: sessionRevisionCounter,
      sentAt: Date.now(),
      tier: defaultInfo.tier,
      requiresAck: defaultInfo.requiresAck,
      type: legacyType,
      payload: obj.payload,
      isLegacy: true,
    };

    return {
      isValid: true,
      message: legacyEnvelope,
      isLegacy: true,
    };
  }

  return { isValid: false, message: null, error: 'Unknown message format' };
}

/**
 * Deduplicator for critical messages to guarantee idempotency.
 */
export class MessageDeduplicator {
  private processedIds: string[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Returns true if the message should be processed (first time seen).
   * Returns false if it's a duplicate.
   */
  public shouldProcess(messageId: string): boolean {
    if (this.processedIds.includes(messageId)) {
      return false; // Duplicate
    }

    this.processedIds.push(messageId);
    if (this.processedIds.length > this.maxSize) {
      this.processedIds.shift();
    }
    return true;
  }

  public clear(): void {
    this.processedIds = [];
  }
}

/**
 * Tracks monotonic sequence numbers per stream to drop delayed out-of-order packets.
 */
export class SequenceTracker {
  private lastSequences: Map<string, number> = new Map();

  /**
   * Checks if an incoming continuous message is strictly newer than the last processed one.
   */
  public isNewer(streamKey: string, sequenceNumber: number): boolean {
    const last = this.lastSequences.get(streamKey) ?? 0;
    if (sequenceNumber > last) {
      this.lastSequences.set(streamKey, sequenceNumber);
      return true;
    }
    return false;
  }

  public reset(streamKey?: string): void {
    if (streamKey) {
      this.lastSequences.delete(streamKey);
    } else {
      this.lastSequences.clear();
    }
  }
}
