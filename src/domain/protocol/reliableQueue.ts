import type { VersionedSyncMessage, AckPayload } from './types';

export interface PendingAckItem {
  message: VersionedSyncMessage;
  attempt: number;
  maxAttempts: number;
  timer: number | null;
  resolve: (value: boolean) => void;
}

export class ReliableDeliveryQueue {
  private pending: Map<string, PendingAckItem> = new Map();
  private sendRaw: (msg: VersionedSyncMessage) => void;
  private readonly retryDelays: number[] = [300, 600, 1200];

  constructor(sendRaw: (msg: VersionedSyncMessage) => void) {
    this.sendRaw = sendRaw;
  }

  /**
   * Enqueues a critical message and waits for ACK with retry backoff.
   */
  public sendWithAck(
    message: VersionedSyncMessage,
    maxAttempts: number = 3
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // Send initial transmission
      this.sendRaw(message);

      const item: PendingAckItem = {
        message,
        attempt: 1,
        maxAttempts,
        timer: null,
        resolve,
      };

      this.scheduleRetry(item);
      this.pending.set(message.messageId, item);
    });
  }

  private scheduleRetry(item: PendingAckItem): void {
    if (item.attempt >= item.maxAttempts) {
      return;
    }

    const delay =
      this.retryDelays[item.attempt - 1] ||
      this.retryDelays[this.retryDelays.length - 1];

    item.timer = window.setTimeout(() => {
      if (!this.pending.has(item.message.messageId)) {
        return; // Already ACKed
      }

      item.attempt++;
      this.sendRaw(item.message);
      this.scheduleRetry(item);

      if (item.attempt >= item.maxAttempts) {
        // If max attempts reached, settle as unresolved
        window.setTimeout(() => {
          if (this.pending.has(item.message.messageId)) {
            this.pending.delete(item.message.messageId);
            item.resolve(false);
          }
        }, delay);
      }
    }, delay);
  }

  /**
   * Processes incoming ACK_MESSAGE. Returns true if it matched a pending item.
   */
  public handleAck(payload: AckPayload): boolean {
    const item = this.pending.get(payload.ackMessageId);
    if (!item) return false;

    if (item.timer !== null) {
      clearTimeout(item.timer);
    }
    this.pending.delete(payload.ackMessageId);
    item.resolve(true);
    return true;
  }

  public clear(): void {
    this.pending.forEach((item) => {
      if (item.timer !== null) {
        clearTimeout(item.timer);
      }
      item.resolve(false);
    });
    this.pending.clear();
  }

  public getPendingCount(): number {
    return this.pending.size;
  }
}
